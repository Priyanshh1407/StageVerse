import { NextResponse } from "next/server";
import { z } from 'zod';
import { apiError } from '@/lib/api';
import { guardLlmRequest, promptText, generate } from '@/lib/llm';
import { HttpError, ValidationError } from '@/lib/errors';
import { parseBody } from '@/lib/schemas';
import { getIntent } from '@/lib/dmx/intent';
import { ruleIntent } from '@/lib/dmx/ruleIntent';
import { allocate, repatch, findConflicts } from '@/lib/dmx/allocate';

// The patch screens send compact fixtures ({ u, a, c, type, mode }); full names are accepted too
const fixtureIn = z.object({
    u: z.coerce.number().int().min(1).optional(),
    a: z.coerce.number().int().min(1).optional(),
    c: z.coerce.number().int().min(1).max(512).optional(),
    universe: z.coerce.number().int().min(1).optional(),
    address: z.coerce.number().int().min(1).optional(),
    channels: z.coerce.number().int().min(1).max(512).optional(),
    type: z.string().max(100).optional(),
    profile: z.string().max(100).optional(),
    mode: z.string().max(60).optional(),
}).transform((f) => ({
    universe: f.universe ?? f.u ?? 1,
    address: f.address ?? f.a ?? 1,
    channels: f.channels ?? f.c ?? 16,
    type: f.type ?? f.profile ?? 'Generic',
    mode: f.mode ?? 'Standard',
}));

const bodySchema = z.object({
    prompt: z.string(),
    currentPatch: z.array(fixtureIn).max(1024).optional().default([]),
});

// POST { prompt, currentPatch } -> { action: 'add' | 'replace', patch, meta }
// The model only interprets the request; addresses come from the allocator, so the
// result is collision-free by construction (and checked before it is returned).
export async function POST(req) {
    try {
        await guardLlmRequest(req, ['production']);
        const body = parseBody(bodySchema, await req.json());
        const prompt = promptText(body.prompt, 'prompt', { required: true });
        const current = body.currentPatch;

        const started = Date.now();
        let intentResult;
        try {
            intentResult = await getIntent(generate, prompt);
        } catch (error) {
            // No provider answered, or the answers never validated: read the request with rules instead
            if (error.code !== 'LLM_UNAVAILABLE' && error.code !== 'INTENT_INVALID') throw error;
            const intent = ruleIntent(prompt);
            if (!intent) {
                throw new HttpError(422, "I couldn't read that request. Try something like \"add 8 beams and 4 washes\" or \"fix collisions\".");
            }
            intentResult = { intent, attempts: 0, tokens: 0, model: null, degraded: true };
        }
        const { intent, attempts, tokens, model, degraded = false } = intentResult;

        let action;
        let patch;
        try {
            const added = allocate(current, intent.fixtures);
            if (intent.action === 'repatch') {
                action = 'replace';
                patch = repatch([...current, ...added]);
            } else {
                action = 'add';
                patch = added;
            }
        } catch (error) {
            if (error instanceof RangeError) throw new ValidationError(error.message);
            throw error;
        }

        // Belt and braces: never hand the UI a patch with collisions. A repatch must be clean
        // overall; added fixtures must not touch anything (the existing patch may already be messy).
        const isNew = (i) => action === 'replace' || i >= current.length;
        const check = findConflicts(action === 'replace' ? patch : [...current, ...patch]);
        if (check.outOfRange.some(isNew) || check.overlaps.some(([i, j]) => isNew(i) || isNew(j))) {
            throw new Error('Allocator produced a conflicting patch');
        }

        const before = findConflicts(current);
        return NextResponse.json({
            action,
            patch,
            meta: {
                intent,
                model, // which model answered (null when the rule-based reader was used)
                degraded, // true: no AI answer was usable, the request was read with rules
                attempts,
                tokens,
                latencyMs: Date.now() - started,
                conflictsBefore: before.overlaps.length + before.outOfRange.length,
            },
        });
    } catch (error) {
        return apiError(error, '/api/patch');
    }
}
