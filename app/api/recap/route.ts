// app/api/recap/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { matchupData, week } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const prompt = `You are an opinionated, funny, and sarcastic fantasy football analyst writing a recap for Week ${week} of a dynasty league. 
    Here is the raw matchup data: ${JSON.stringify(matchupData)}
    
    Write a 3-paragraph witty summary including:
    1. Fraud of the Week (Winner with bad stats or lowest scoring winner)
    2. Heartbreak Award (Highest scoring loser)
    3. Bench Blunder (Team that left key players on the bench)
    Keep it playful, entertaining, and bold. Use HTML tags like <h3> and <p> for styling.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await res.json();
    const recapText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Failed to generate recap.";

    return NextResponse.json({ recap: recapText });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch recap" }, { status: 500 });
  }
}