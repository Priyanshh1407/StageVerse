import { GoogleGenAI } from '@google/genai';
import { verifyAuth } from '@/lib/auth';
import { requireRole } from '@/lib/authz';
import { rateLimit, LIMITS } from '@/lib/rateLimit';
import { ValidationError } from '@/lib/errors';

// Provider chain, tried in order until one answers:
//   1. GEMINI_MODEL           gemini-3.8-flash       current stable Flash (Gemini models page, Oct 2026)
//   2. GEMINI_FALLBACK_MODEL  gemini-3.5-flash-lite  Flash-Lite: cheaper, separate quota
//   3. GROQ_MODEL             openai/gpt-oss-120b    different provider entirely (needs GROQ_API_KEY)
// Callers handle the case where every provider fails with a non-AI fallback, so users always
// get an answer. Each model is overridable by env var, so a model change is config, not code.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
export const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const ATTEMPT_TIMEOUT_MS = 12000; // per provider, so the whole chain stays bounded
export const MAX_PROMPT_CHARS = 1000;

let gemini;
function geminiClient() {
    gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return gemini;
}

// zod's toJSONSchema adds a "$schema" key that some providers reject
const cleanSchema = (schema) => {
    if (!schema) return schema;
    const { $schema, ...rest } = schema;
    return rest;
};

async function callGemini(model, { system, user, json, temperature }) {
    const response = await geminiClient().models.generateContent({
        model,
        contents: user,
        config: {
            ...(system && { systemInstruction: system }),
            ...(json && { responseMimeType: 'application/json', responseJsonSchema: cleanSchema(json) }),
            temperature,
            httpOptions: { timeout: ATTEMPT_TIMEOUT_MS },
        },
    });
    return { text: response.text ?? '', tokens: response.usageMetadata?.totalTokenCount ?? 0 };
}

async function callGroq(model, { system, user, json, temperature }) {
    const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages: [
                ...(system ? [{ role: 'system', content: system }] : []),
                { role: 'user', content: user },
            ],
            temperature,
            // Best-effort schema (strict mode would require every field); our zod check validates anyway
            ...(json && { response_format: { type: 'json_schema', json_schema: { name: 'response', strict: false, schema: cleanSchema(json) } } }),
        }),
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
    if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 300);
        throw Object.assign(new Error(`Groq ${res.status}: ${detail}`), { status: res.status });
    }
    const data = await res.json();
    return { text: data.choices?.[0]?.message?.content ?? '', tokens: data.usage?.total_tokens ?? 0 };
}

function providers() {
    const list = [];
    if (process.env.GEMINI_API_KEY) {
        list.push({ provider: 'gemini', model: GEMINI_MODEL, call: callGemini });
        if (GEMINI_FALLBACK_MODEL !== GEMINI_MODEL) list.push({ provider: 'gemini', model: GEMINI_FALLBACK_MODEL, call: callGemini });
    }
    if (process.env.GROQ_API_KEY) list.push({ provider: 'groq', model: GROQ_MODEL, call: callGroq });
    return list;
}

// Circuit breaker: a model that just failed with overload/quota is skipped for a while,
// so requests don't each wait out its timeout before reaching a working provider.
const cooldownUntil = new Map();

function cooldownMs(error) {
    const msg = String(error?.message ?? '');
    if (/PerDay/i.test(msg)) return 60 * 60 * 1000; // daily quota: check again in an hour
    const hinted = Number(msg.match(/retry in ([\d.]+)s/i)?.[1]);
    if (Number.isFinite(hinted)) return Math.min(hinted * 1000, 10 * 60 * 1000);
    if (error?.status === 429) return 60 * 1000;
    if ([500, 502, 503, 504].includes(error?.status) || /timed? ?out|aborted|DEADLINE|UNAVAILABLE/i.test(msg)) return 30 * 1000;
    return 0; // e.g. a bad request: don't bench the model, just move on for this call
}

export class AllProvidersFailedError extends Error {
    constructor(errors) {
        super(`No AI provider answered (${errors.map((e) => `${e.model}: ${e.status ?? e.message}`).join('; ') || 'none configured'})`);
        this.code = 'LLM_UNAVAILABLE';
        this.attempts = errors;
    }
}

/**
 * One model answer, from the first provider in the chain that works.
 * Instructions go in `system`, untrusted user text in `user`, so the two never share a channel.
 * `json` is a JSON Schema the answer must follow (callers still validate it).
 * @returns {Promise<{ text: string, tokens: number, provider: string, model: string }>}
 * @throws {AllProvidersFailedError} when every provider failed or none is configured
 */
export async function generate({ system, user, json, temperature = 0.7 }, now = Date.now) {
    const chain = providers();
    // Skip models on cooldown, unless every model is cooling down (then try them all anyway)
    const ready = chain.filter((p) => (cooldownUntil.get(p.model) ?? 0) <= now());
    const order = ready.length ? ready : chain;

    const errors = [];
    for (const p of order) {
        try {
            const result = await p.call(p.model, { system, user, json, temperature });
            cooldownUntil.delete(p.model);
            return { ...result, provider: p.provider, model: p.model };
        } catch (error) {
            const wait = cooldownMs(error);
            if (wait) cooldownUntil.set(p.model, now() + wait);
            errors.push({ model: p.model, status: error?.status, message: String(error?.message ?? '').slice(0, 200) });
            console.warn(`[llm] ${p.model} failed (${error?.status ?? error?.message}); trying next provider`);
        }
    }
    throw new AllProvidersFailedError(errors);
}

/** Test helper */
export function resetProviderCooldowns() {
    cooldownUntil.clear();
}

/**
 * Every LLM endpoint costs money per call: require a session with an allowed role,
 * and spend from a per-user token bucket before calling the model.
 */
export async function guardLlmRequest(req, roles) {
    const user = await verifyAuth(req);
    requireRole(user, ...roles);
    rateLimit(`llm:${user.userId}`, LIMITS.llm);
    return user;
}

/** Trim and length-check a free-text field that will be placed in a prompt. */
export function promptText(value, field, { required = false, max = MAX_PROMPT_CHARS } = {}) {
    const text = String(value ?? '').trim();
    if (required && !text) throw new ValidationError(`Missing ${field}`);
    if (text.length > max) throw new ValidationError(`${field} is too long (max ${max} characters)`);
    return text;
}
