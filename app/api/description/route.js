import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { apiError } from '@/lib/api';
import { HttpError } from "@/lib/errors";
import { guardLlmRequest, promptText, GEMINI_MODEL, GEMINI_REQUEST_OPTIONS } from '@/lib/llm';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
    try {
        await guardLlmRequest(req, ['organizer']);
        const body = await req.json();
        const [artist, genre, vibe, title, date, city, venue] = ['artist', 'genre', 'vibe', 'title', 'date', 'city', 'venue']
            .map((field) => promptText(body[field], field, { max: 200 }));

        if (!artist || !genre || !vibe) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL }, GEMINI_REQUEST_OPTIONS);

        const prompt = `You are a professional event copywriter. Write a compelling, high-energy event description.
        
        Event Details:
        - Artist: ${artist}
        - Title: ${title || 'Live Concert'}
        - Genre: ${genre}
        - Vibe: ${vibe}
        - Venue: ${venue || 'TBA'}
        - City: ${city || 'TBA'}
        - Date: ${date || 'Soon'}

        Task:
        Return a JSON object with the following fields:
        - "headline": Catchy one-liner (no markdown).
        - "hook": Exciting intro paragraph.
        - "atmosphere": Description of the venue/vibe.
        - "highlights": Array of 3 short bullet points.
        - "closing": Final call to action.

        Output Format: JSON ONLY. No Markdown code blocks.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();
        if (text.startsWith("```json")) text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        else if (text.startsWith("```")) text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");

        let data;
        try {
            data = JSON.parse(text);
        } catch (jsonError) {
            console.error("JSON Parse Error. Raw Text:", text);
            data = {
                headline: `${artist} Live!`,
                hook: text.substring(0, 150) + "...",
                atmosphere: "Experience the vibe.",
                highlights: ["Live Performance", "Great Music", "Unforgettable Night"],
                closing: "Don't miss out."
            };
        }
        const formattedDescription = `HEADLINE: ${data.headline || 'Live Event'}\n\nHOOK: ${data.hook || text}\n\nATMOSPHERE: ${data.atmosphere || ''}\n\nHIGHLIGHTS:\n- ${(data.highlights || []).join('\n- ')}\n\nCLOSING: ${data.closing || ''}`;

        return NextResponse.json({ description: formattedDescription });
    } catch (error) {
        // Our own errors (auth, validation, rate limit) keep their status; the rest may be upstream AI errors
        if (error instanceof HttpError) return apiError(error, "/api/description");

        if (error.status === 429 || error.message?.includes("429") || error.message?.includes("Quota exceeded")) {
            return NextResponse.json(
                { error: "AI Busy: Rate limit exceeded. Please wait a moment." },
                { status: 429 }
            );
        }

        if (error.status === 503 || error.message?.includes("503") || error.message?.includes("Overloaded")) {
            return NextResponse.json(
                { error: "AI Overloaded: Google's servers are busy. Please try again in a few seconds." },
                { status: 503 }
            );
        }

        return apiError(error, '/api/description');
    }
}