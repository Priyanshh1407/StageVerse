import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { apiError } from '@/lib/api';
import { HttpError } from "@/lib/errors";
import { guardLlmRequest, promptText, GEMINI_MODEL, GEMINI_REQUEST_OPTIONS } from '@/lib/llm';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
    try {
        await guardLlmRequest(req, ['artist', 'organizer']);
        const body = await req.json();
        const prompt = promptText(body.prompt, 'prompt', { required: true });

        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL }, GEMINI_REQUEST_OPTIONS);

        const instruction = `You are a creative event strategist and expert copywriter.
        User Input: "${prompt}"
        
        Task: Provide a short, high-impact insight, marketing teaser, or creative idea based on this input. 
        Keep it under 50 words. Make it punchy and inspiring for an event organizer.`;

        const result = await model.generateContent(instruction);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ result: text });
    } catch (error) {
        // Our own errors (auth, validation, rate limit) keep their status; the rest may be upstream AI errors
        if (error instanceof HttpError) return apiError(error, "/api/generate");

        if (error.status === 429 || error.message?.includes("429")) {
            return NextResponse.json(
                { error: "AI Busy: Rate limit exceeded. Please wait." },
                { status: 429 }
            );
        }

        if (error.status === 503 || error.message?.includes("503") || error.message?.includes("Overloaded")) {
            return NextResponse.json(
                { error: "AI Overloaded. Please try again." },
                { status: 503 }
            );
        }

        return apiError(error, '/api/generate');
    }
}
