import { describe, it, expect, beforeEach, vi } from 'vitest';

// Scripted SDK: each call pops the next behaviour ('ok' or an error status) and records the model
const sdk = { script: [], calls: [] };
vi.mock('@google/genai', () => ({
    GoogleGenAI: class {
        models = {
            generateContent: async ({ model }) => {
                sdk.calls.push(model);
                const next = sdk.script.shift();
                if (next !== 'ok') throw Object.assign(new Error(`upstream ${next}`), { status: next });
                return { text: 'hello', usageMetadata: { totalTokenCount: 7 } };
            },
        };
    },
}));

const { generate, GEMINI_MODEL, GEMINI_FALLBACK_MODEL } = await import('@/lib/llm');

beforeEach(() => { sdk.script = []; sdk.calls = []; });

describe('generate(): model fallback', () => {
    it('uses the primary model when it answers', async () => {
        sdk.script = ['ok'];
        const res = await generate({ user: 'hi' });
        expect(res).toMatchObject({ text: 'hello', tokens: 7, model: GEMINI_MODEL });
        expect(sdk.calls).toEqual([GEMINI_MODEL]);
    });

    it.each([503, 504, 429])('falls back once when the primary returns %i', async (status) => {
        sdk.script = [status, 'ok'];
        const res = await generate({ user: 'hi' });
        expect(res.model).toBe(GEMINI_FALLBACK_MODEL);
        expect(sdk.calls).toEqual([GEMINI_MODEL, GEMINI_FALLBACK_MODEL]);
    });

    it('does not retry a non-transient error such as a bad request', async () => {
        sdk.script = [400];
        await expect(generate({ user: 'hi' })).rejects.toMatchObject({ status: 400 });
        expect(sdk.calls).toEqual([GEMINI_MODEL]);
    });

    it('surfaces the error when both models are unavailable', async () => {
        sdk.script = [503, 503];
        await expect(generate({ user: 'hi' })).rejects.toMatchObject({ status: 503 });
        expect(sdk.calls).toHaveLength(2);
    });
});
