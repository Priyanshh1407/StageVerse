import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Scripted Gemini SDK: each call pops the next behaviour ('ok' or an error) and records the model
const sdk = { script: [], calls: [] };
vi.mock('@google/genai', () => ({
    GoogleGenAI: class {
        models = {
            generateContent: async ({ model }) => {
                sdk.calls.push(model);
                const next = sdk.script.shift();
                if (next === 'ok') return { text: `from ${model}`, usageMetadata: { totalTokenCount: 7 } };
                throw Object.assign(new Error(next?.message ?? `upstream ${next}`), { status: next?.status ?? next });
            },
        };
    },
}));

process.env.GROQ_API_KEY = 'test-groq-key';
const { generate, resetProviderCooldowns, GEMINI_MODEL, GEMINI_FALLBACK_MODEL, GROQ_MODEL } = await import('@/lib/llm');

// Scripted Groq (plain fetch to the OpenAI-compatible endpoint)
const groq = { script: [], requests: [] };
const realFetch = globalThis.fetch;
beforeEach(() => {
    sdk.script = []; sdk.calls = [];
    groq.script = []; groq.requests = [];
    resetProviderCooldowns();
    globalThis.fetch = vi.fn(async (url, init) => {
        groq.requests.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization });
        const next = groq.script.shift();
        if (next === 'ok') {
            return new Response(JSON.stringify({ choices: [{ message: { content: 'from groq' } }], usage: { total_tokens: 9 } }), { status: 200 });
        }
        return new Response('{"error":"down"}', { status: next ?? 503 });
    });
});
afterEach(() => { globalThis.fetch = realFetch; });

const clock = (t) => () => t;

describe('provider chain: Gemini Flash -> Flash-Lite -> Groq', () => {
    it('the defaults are the current models', () => {
        expect(GEMINI_MODEL).toBe('gemini-3.8-flash');
        expect(GEMINI_FALLBACK_MODEL).toBe('gemini-3.5-flash-lite');
        expect(GROQ_MODEL).toBe('openai/gpt-oss-120b');
    });

    it('uses the primary model when it answers', async () => {
        sdk.script = ['ok'];
        expect(await generate({ user: 'hi' })).toMatchObject({ text: `from ${GEMINI_MODEL}`, provider: 'gemini', model: GEMINI_MODEL });
        expect(groq.requests).toHaveLength(0);
    });

    it('falls back to Flash-Lite when the primary is overloaded', async () => {
        sdk.script = [503, 'ok'];
        expect((await generate({ user: 'hi' })).model).toBe(GEMINI_FALLBACK_MODEL);
    });

    it('falls back to Groq when both Gemini models fail, for any reason', async () => {
        sdk.script = [429, 400];
        groq.script = ['ok'];
        const res = await generate({ system: 'rules', user: 'hi', json: { $schema: 'x', type: 'object' } });
        expect(res).toMatchObject({ text: 'from groq', tokens: 9, provider: 'groq', model: GROQ_MODEL });

        const sent = groq.requests[0];
        expect(sent.url).toBe('https://api.groq.com/openai/v1/chat/completions');
        expect(sent.auth).toBe('Bearer test-groq-key');
        expect(sent.body.messages).toEqual([{ role: 'system', content: 'rules' }, { role: 'user', content: 'hi' }]);
        expect(sent.body.response_format.json_schema.schema).toEqual({ type: 'object' }); // $schema stripped
    });

    it('throws LLM_UNAVAILABLE (for the caller to degrade) when every provider fails', async () => {
        sdk.script = [503, 503];
        groq.script = [500];
        await expect(generate({ user: 'hi' })).rejects.toMatchObject({ code: 'LLM_UNAVAILABLE' });
    });
});

describe('cooldown (circuit breaker)', () => {
    it('skips a model that just ran out of quota instead of waiting on it again', async () => {
        sdk.script = [{ status: 429, message: 'Quota exceeded ... Please retry in 30s.' }, 'ok'];
        await generate({ user: 'first' }, clock(0));
        expect(sdk.calls).toEqual([GEMINI_MODEL, GEMINI_FALLBACK_MODEL]);

        sdk.calls = [];
        sdk.script = ['ok'];
        await generate({ user: 'second' }, clock(10_000)); // inside the 30s cooldown
        expect(sdk.calls).toEqual([GEMINI_FALLBACK_MODEL]);

        sdk.calls = [];
        sdk.script = ['ok'];
        await generate({ user: 'third' }, clock(31_000 + 1000)); // cooldown over
        expect(sdk.calls).toEqual([GEMINI_MODEL]);
    });

    it('a daily quota benches the model for an hour', async () => {
        sdk.script = [{ status: 429, message: 'GenerateRequestsPerDayPerProjectPerModel exceeded' }, 'ok'];
        await generate({ user: 'a' }, clock(0));
        sdk.calls = [];
        sdk.script = ['ok'];
        await generate({ user: 'b' }, clock(30 * 60 * 1000));
        expect(sdk.calls).toEqual([GEMINI_FALLBACK_MODEL]);
    });

    it('if every model is cooling down, it still tries them all rather than refusing', async () => {
        sdk.script = [503, 503];
        groq.script = [503];
        await generate({ user: 'x' }, clock(0)).catch(() => {});
        sdk.calls = [];
        sdk.script = ['ok'];
        expect((await generate({ user: 'y' }, clock(1000))).model).toBe(GEMINI_MODEL);
    });
});
