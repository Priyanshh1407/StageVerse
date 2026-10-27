// UPG-03 eval: legacy "LLM assigns addresses" vs new "LLM intent + deterministic allocator".
//
//   npm run eval:patch                    # real Gemini calls (~60 requests, uses GEMINI_API_KEY)
//   npm run eval:patch -- --model gemini-3.5-flash-lite
//   npm run eval:patch -- --provider groq             # openai/gpt-oss-120b (uses GROQ_API_KEY)
//   npm run eval:patch -- --fake          # scripted model, checks the harness only (no API calls)
//
// Writes evals/patch/results/<label>.json and prints a summary table.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { allocate, repatch, findConflicts } from '../../lib/dmx/allocate.js';
import { getIntent } from '../../lib/dmx/intent.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const FAKE = args.includes('--fake');
const PROVIDER = args.includes('--provider') ? args[args.indexOf('--provider') + 1] : 'gemini';
const DEFAULT_MODEL = PROVIDER === 'groq' ? (process.env.GROQ_MODEL || 'openai/gpt-oss-120b') : (process.env.GEMINI_MODEL || 'gemini-3.8-flash');
const MODEL = args.includes('--model') ? args[args.indexOf('--model') + 1] : DEFAULT_MODEL;
// Requests per minute to stay under. The free tier allows 5 per model; pass --rpm for paid keys.
const RPM = args.includes('--rpm') ? Number(args[args.indexOf('--rpm') + 1]) : 5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let nextSlot = 0;
async function paced(fn) {
    const wait = nextSlot - Date.now();
    if (wait > 0) await sleep(wait);
    nextSlot = Date.now() + Math.ceil(60000 / RPM);
    return fn();
}
const cases = JSON.parse(fs.readFileSync(path.join(here, 'cases.json'), 'utf8'));

// ---------- model access ----------
async function groqGenerate({ system, user, json, temperature }) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: MODEL,
            messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: user }],
            ...(temperature !== undefined && { temperature }),
            ...(json && { response_format: { type: 'json_schema', json_schema: { name: 'response', strict: false, schema: stripSchemaKey(json) } } }),
        }),
        signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw Object.assign(new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 300)}`), { status: res.status });
    const data = await res.json();
    return { text: data.choices?.[0]?.message?.content ?? '', tokens: data.usage?.total_tokens ?? 0 };
}
function stripSchemaKey(schema) {
    const { $schema, ...rest } = schema;
    return rest;
}

let realGenerate;
async function generate(opts) {
    if (!realGenerate && PROVIDER === 'groq') {
        if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set (add it to .env.local)');
        realGenerate = groqGenerate;
    }
    if (!realGenerate) {
        if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set (run with --env-file=.env.local, or use --fake)');
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        realGenerate = async ({ system, user, json, temperature }) => {
            const res = await ai.models.generateContent({
                model: MODEL,
                contents: user,
                config: {
                    ...(system && { systemInstruction: system }),
                    ...(json && { responseMimeType: 'application/json', responseJsonSchema: stripSchemaKey(json) }),
                    ...(temperature !== undefined && { temperature }),
                    httpOptions: { timeout: 60000 },
                },
            });
            return { text: res.text ?? '', tokens: res.usageMetadata?.totalTokenCount ?? 0 };
        };
    }
    return withRetries(() => paced(() => realGenerate(opts)));
}

// Transient upstream failures (overload, quota, deadline) are retried with backoff the same way
// for both pipelines; if a call still fails it is recorded as an upstream error, not a model error.
const TRANSIENT = new Set([429, 500, 503, 504]);
async function withRetries(fn, attempts = 6) {
    for (let i = 1; ; i++) {
        try {
            return await fn();
        } catch (error) {
            const transient = TRANSIENT.has(error?.status) || /timed? ?out|aborted/i.test(String(error?.message));
            if (!transient || i >= attempts) throw Object.assign(error, { upstream: transient });
            // Honour the server's hint (Gemini: "retry in Ns", Groq: "try again in Ns"), else back off 5s, 10s, 20s...
            const hinted = Number(String(error?.message).match(/(?:retry|try again) in ([\d.]+)s/i)?.[1]);
            await sleep(Number.isFinite(hinted) ? (hinted + 1) * 1000 : 5000 * 2 ** (i - 1));
        }
    }
}

// Scripted stand-ins for --fake: the "new" model answers perfectly; the "legacy" one
// stacks everything at address 1, a failure mode real models show on busy patches.
function fakeFor(c) {
    return {
        newModel: async () => ({
            text: JSON.stringify({
                action: c.expect.action,
                fixtures: c.expect.fixtures.map((f) => ({ type: f.type.split('|')[0], count: f.count ?? 2, ...(f.channels && { channels: f.channels }) })),
            }),
            tokens: 0,
        }),
        legacyModel: async () => ({
            text: JSON.stringify({
                action: c.expect.action === 'repatch' ? 'replace' : 'add',
                patch: c.expect.fixtures.flatMap((f) => Array.from({ length: f.count ?? 2 }, () => ({ type: f.type.split('|')[0], address: 1, universe: 1 }))),
            }),
            tokens: 0,
        }),
    };
}

// ---------- the legacy pipeline (prompt copied verbatim from the original /api/patch) ----------
const legacyPrompt = (currentPatch, prompt) => `
            You are a lighting console expert.

            Current Patch Context (Universe, Address, Channels):
            ${JSON.stringify(currentPatch)}

            User Request: "${prompt}"

            Task:
            1. Analyze the 'Current Patch'.
            2. If the user asks to "Add" fixtures:
               - Generate new fixtures.
               - Ensure they do NOT overlap with the 'Current Patch' addresses.
               - Find the next available address gaps.
               - Return "action": "add".
            3. If the user asks to "Fix collisions", "Repatch", or "Clean up":
               - Return the FULL 'Current Patch' (plus any new ones if requested), but with addresses reassigned to eliminate overlaps.
               - Keep the same fixture types/modes.
               - Return "action": "replace".

            Output JSON Format:
            {
               "action": "add" | "replace",
               "patch": [
                  { "type": "Beam", "address": 1, "universe": 1, ... }
               ]
            }

            Rules:
            - Return ONLY valid JSON.
            - "patch" array must contain objects with: "type", "address" (number), "universe" (number).
            - Default channels is 16 if not specified.
        `;

const toFixture = (f) => ({ universe: f.u, address: f.a, channels: f.c, type: f.type });

function typeMatches(expected, actual) {
    const a = String(actual ?? '').toLowerCase();
    return expected.split('|').some((alt) => a.includes(alt));
}

/** Does the extracted request match what the case expects? */
function intentMatches(expect, action, fixtures) {
    if (action !== expect.action) return false;
    if (fixtures.length !== expect.fixtures.length) return false;
    return expect.fixtures.every((e) => fixtures.some((f) =>
        typeMatches(e.type, f.type)
        && (e.count === null || f.count === e.count)
        && (!e.channels || f.channels === e.channels)));
}

/** Count new fixtures per type from a legacy patch, for a comparable intent check. */
function legacyFixtures(patch) {
    const byType = new Map();
    for (const f of patch) byType.set(f.type, (byType.get(f.type) ?? 0) + 1);
    return [...byType].map(([type, count]) => ({ type, count }));
}

async function runLegacy(c, model) {
    const t0 = performance.now();
    const row = { latencyMs: 0, tokens: 0, schemaValid: false, intentCorrect: false, collisions: null, outOfRange: null, footprintsLost: 0 };
    let text;
    try {
        ({ text, tokens: row.tokens } = await model({ user: legacyPrompt(c.current, c.prompt) }));
    } catch (error) {
        row.upstreamError = error.upstream ? String(error.status || error.message) : undefined;
        row.error = error.message;
        row.latencyMs = performance.now() - t0;
        return row;
    }
    row.latencyMs = performance.now() - t0;
    let data;
    try {
        data = JSON.parse(String(text).replace(/```json/g, '').replace(/```/g, '').trim());
    } catch { return row; }
    const patch = Array.isArray(data?.patch) ? data.patch : null;
    const shapeOk = patch && ['add', 'replace'].includes(data.action)
        && patch.every((f) => typeof f.type === 'string' && Number.isInteger(f.address) && Number.isInteger(f.universe));
    if (!shapeOk) return row;
    row.schemaValid = true;

    // The old screens forced every returned fixture to 16 channels, so that's what the rig got
    const returned = patch.map((f) => ({ universe: f.universe, address: f.address, channels: 16, type: f.type }));
    const current = c.current.map(toFixture);
    if (data.action === 'add') {
        const { overlaps, outOfRange } = findConflicts([...current, ...returned]);
        const isNew = (i) => i >= current.length;
        row.collisions = overlaps.filter(([i, j]) => isNew(i) || isNew(j)).length;
        row.outOfRange = outOfRange.filter(isNew).length;
        row.intentCorrect = intentMatches(c.expect, 'add', legacyFixtures(patch));
    } else {
        const { overlaps, outOfRange } = findConflicts(returned);
        row.collisions = overlaps.length;
        row.outOfRange = outOfRange.length;
        row.footprintsLost = current.filter((f) => f.channels !== 16).length;
        const added = legacyFixtures(patch.slice(current.length));
        row.intentCorrect = intentMatches(c.expect, 'repatch', added) && patch.length >= current.length;
    }
    return row;
}

async function runNew(c, model) {
    const t0 = performance.now();
    const row = { latencyMs: 0, tokens: 0, attempts: 0, schemaValid: false, intentCorrect: false, collisions: null, outOfRange: null, footprintsLost: 0 };
    try {
        const { intent, attempts, tokens } = await getIntent(model, c.prompt);
        Object.assign(row, { attempts, tokens, schemaValid: true });
        row.intentCorrect = intentMatches(c.expect, intent.action, intent.fixtures);
        const current = c.current.map(toFixture);
        const added = allocate(current, intent.fixtures);
        const result = intent.action === 'repatch' ? repatch([...current, ...added]) : [...current, ...added];
        const { overlaps, outOfRange } = findConflicts(result);
        const isNew = (i) => intent.action === 'repatch' || i >= current.length;
        row.collisions = overlaps.filter(([i, j]) => isNew(i) || isNew(j)).length;
        row.outOfRange = outOfRange.filter(isNew).length;
    } catch (error) {
        row.error = error.message;
        // getIntent wraps the last parse error; an upstream failure surfaces as the original error
        if (error.upstream) row.upstreamError = String(error.status || error.message);
    }
    row.latencyMs = performance.now() - t0;
    return row;
}

function summarize(allRows) {
    // Calls that never got a model answer (outage after retries) are excluded and counted separately
    const rows = allRows.filter((r) => !r.upstreamError);
    const n = rows.length || 1;
    const valid = rows.filter((r) => r.schemaValid);
    const pct = (k) => Math.round((100 * k) / n);
    const lat = rows.map((r) => r.latencyMs).sort((a, b) => a - b);
    return {
        cases: rows.length,
        upstreamFailures: allRows.length - rows.length,
        schemaValidPct: pct(valid.length),
        intentCorrectPct: pct(rows.filter((r) => r.intentCorrect).length),
        casesWithCollisionsPct: pct(valid.filter((r) => r.collisions > 0).length),
        casesOutOfRangePct: pct(valid.filter((r) => r.outOfRange > 0).length),
        casesLosingFootprintsPct: pct(rows.filter((r) => r.footprintsLost > 0).length),
        p50LatencyMs: Math.round(lat[Math.floor(n / 2)]),
        avgTokens: Math.round(rows.reduce((s, r) => s + (r.tokens || 0), 0) / n),
    };
}

const results = [];
for (const c of cases) {
    const fake = FAKE ? fakeFor(c) : null;
    const legacy = await runLegacy(c, fake ? fake.legacyModel : (o) => generate(o));
    const fresh = await runNew(c, fake ? fake.newModel : (o) => generate(o));
    results.push({ id: c.id, legacy, new: fresh });
    process.stdout.write(`${c.id.padEnd(26)} legacy ${legacy.intentCorrect ? 'ok ' : 'x  '} coll=${legacy.collisions ?? '-'}   new ${fresh.intentCorrect ? 'ok ' : 'x  '} coll=${fresh.collisions ?? '-'}${fresh.error ? `  (${fresh.error})` : ''}\n`);
}

const summary = { legacy: summarize(results.map((r) => r.legacy)), new: summarize(results.map((r) => r.new)) };
// Model ids like "openai/gpt-oss-120b" contain "/", which can't go in a file name
const label = FAKE ? 'FAKE-harness-check' : `${MODEL.replace(/[^\w.-]+/g, '_')}-${new Date().toISOString().slice(0, 10)}`;
const out = { label, model: FAKE ? 'scripted (no API calls)' : MODEL, ranAt: new Date().toISOString(), summary, results };
fs.mkdirSync(path.join(here, 'results'), { recursive: true });
fs.writeFileSync(path.join(here, 'results', `${label}.json`), JSON.stringify(out, null, 2) + '\n');

console.log(`\n${label}`);
console.table(summary);
if (FAKE) console.log('FAKE run: these numbers only show the harness works. Run without --fake for real results.');
