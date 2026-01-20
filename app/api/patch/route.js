import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
    try {
        const { prompt, currentPatch = [] } = await req.json(); // Accept currentPatch
        if (!prompt) {
            return NextResponse.json({ error: "No Prompt provided." }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
        console.error("Gemini Patch Error:", error);
        return NextResponse.json(
            { error: "Failed to generate patch data" },
            { status: 500 }
        );
    }
}