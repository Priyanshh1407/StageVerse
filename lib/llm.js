import { GoogleGenAI } from '@google/genai';
import { verifyAuth } from '@/lib/auth';
import { requireRole } from '@/lib/authz';
import { rateLimit, LIMITS } from '@/lib/rateLimit';
import { ValidationError } from '@/lib/errors';

// Current stable Flash model (Gemini API models page, Oct 2026). Override with GEMINI_MODEL
// so a model upgrade is a config change, not a code change.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
// Used when the primary model is overloaded or times out. During the first live eval,
// gemini-3.8-flash returned 503 "high demand" / 504 while gemini-3.6-flash answered.
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.6-flash';
const REQUEST_TIMEOUT_MS = 15000;
export const MAX_PROMPT_CHARS = 1000;

let client;
function genai() {
    client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return client;
}

/**
 * One call to the model. Instructions go in `system`, untrusted user text in `user`,
 * so the two never share a channel.
 * @param {{ system?: string, user: string, json?: object, temperature?: number }} opts
 *        `json` is a JSON Schema; when given, the model must answer with matching JSON.
 * Tries the primary model once; if it is overloaded, rate-limited or times out, tries the
 * fallback model once. Other errors (bad request, auth) are not retried.
 * @returns {Promise<{ text: string, tokens: number, model: string }>}
 */
export async function generate({ system, user, json, temperature = 0.7 }) {
    const models = GEMINI_FALLBACK_MODEL && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL
        ? [GEMINI_MODEL, GEMINI_FALLBACK_MODEL]
        : [GEMINI_MODEL];
    let lastError;
    for (const model of models) {
        try {
            const response = await genai().models.generateContent({
                model,
                contents: user,
                config: {
                    ...(system && { systemInstruction: system }),
                    ...(json && { responseMimeType: 'application/json', responseJsonSchema: json }),
                    temperature,
                    httpOptions: { timeout: REQUEST_TIMEOUT_MS }, // a hung upstream call can't hold the request open
                },
            });
            return { text: response.text ?? '', tokens: response.usageMetadata?.totalTokenCount ?? 0, model };
        } catch (error) {
            lastError = error;
            if (!isTransient(error)) throw error;
        }
    }
    throw lastError;
}

/** Overload, quota or deadline: worth trying another model. */
function isTransient(error) {
    if ([429, 500, 503, 504].includes(error?.status)) return true;
    return /timed? ?out|aborted|UNAVAILABLE|DEADLINE_EXCEEDED|RESOURCE_EXHAUSTED/i.test(String(error?.message ?? ''));
}

/** Map upstream AI failures to user-facing errors; returns null if it isn't one. */
export function upstreamError(error) {
    const msg = String(error?.message ?? '');
    if (error?.status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        return { status: 429, error: 'AI Busy: Rate limit exceeded. Please wait a moment.' };
    }
    if (error?.status === 503 || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('Overloaded')) {
        return { status: 503, error: 'AI Overloaded. Please try again in a few seconds.' };
    }
    return null;
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
