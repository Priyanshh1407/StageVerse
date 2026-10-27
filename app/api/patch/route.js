import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { apiError } from '@/lib/api';
import { guardLlmRequest, promptText, GEMINI_MODEL, GEMINI_REQUEST_OPTIONS } from '@/lib/llm';
import { HttpError, ValidationError } from '@/lib/errors';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
    try {
        await guardLlmRequest(req, ['production']);
        const body = await req.json();
        const prompt = promptText(body.prompt, 'prompt', { required: true });
        const currentPatch = Array.isArray(body.currentPatch) ? body.currentPatch : [];
        if (currentPatch.length > 1024) throw new ValidationError('Patch is too large');

        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL }, GEMINI_REQUEST_OPTIONS);

        const systemPrompt = `
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

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        let text = response.text();

        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(text);

        return NextResponse.json({ patch: data.patch, action: data.action || 'add' });
    } catch (error) {
        // Our own errors (auth, validation, rate limit) keep their status; the rest may be upstream AI errors
        if (error instanceof HttpError) return apiError(error, "/api/patch");
        return apiError(error, '/api/patch');
    }
}