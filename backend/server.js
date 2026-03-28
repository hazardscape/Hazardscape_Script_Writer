import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post("/api/generate-script", async (req, res) => {
  const {
    scriptType,
    title,
    topic,
    keyPoints,
    tone,
    duration,
    guestName,
    additionalNotes,
  } = req.body;

  if (!title || !topic) {
    return res.status(400).json({ error: "Title and topic are required." });
  }

  const durationMap = {
    "5": "approximately 5 minutes (600–800 words)",
    "10": "approximately 10 minutes (1,200–1,500 words)",
    "20": "approximately 20 minutes (2,500–3,000 words)",
    "30": "30+ minutes (3,500+ words)",
  };

  const typeLabel = scriptType === "podcast" ? "podcast episode" : "YouTube video";
  const guestLine = guestName ? `\n- Guest/Co-host: ${guestName}` : "";
  const pointsList = keyPoints
    ? keyPoints
        .split("\n")
        .filter((p) => p.trim())
        .map((p, i) => `  ${i + 1}. ${p.trim()}`)
        .join("\n")
    : "  (No specific key points provided — use your judgment based on the topic)";

  const systemPrompt = `You are an expert script writer for Hazardscape, a media brand focused on engaging storytelling.
You write compelling, well-structured scripts for podcasts and YouTube videos.
Your scripts are energetic, engaging, and formatted professionally with clear sections, speaker cues, and transitions.
Always write in the specified tone and match the target duration closely.`;

  const userPrompt = `Write a complete ${typeLabel} script for Hazardscape with the following details:

- Title: ${title}
- Topic/Description: ${topic}${guestLine}
- Tone: ${tone}
- Target Duration: ${durationMap[duration] || "approximately 10 minutes"}
- Key Talking Points:
${pointsList}
${additionalNotes ? `- Additional Notes: ${additionalNotes}` : ""}

Format the script with:
1. **[INTRO]** — A strong hook to grab the audience immediately
2. **[SEGMENT 1], [SEGMENT 2], etc.** — Main content sections covering each key point
3. **[TRANSITION]** cues between segments
4. **[OUTRO]** — Wrap-up with a call to action (subscribe, follow, leave a review, etc.)

Include speaker direction notes in [brackets] where helpful (e.g., [pause], [upbeat energy], [show graphic]).
Write the full script — do not summarize or abbreviate any section.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Anthropic API error:", err);
    res.write(
      `data: ${JSON.stringify({ error: err.message || "Script generation failed." })}\n\n`
    );
    res.end();
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Hazardscape Script Writer backend running on port ${PORT}`);
});
