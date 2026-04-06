import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchUrlContent(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; HazardscapeBot/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Failed to fetch URL (${response.status})`);
  const html = await response.text();
  // Strip tags, collapse whitespace, cap at 15,000 chars
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000);
}

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
    sourceUrls,
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

  // Fetch source URLs if provided
  let urlContext = "";
  if (sourceUrls && sourceUrls.length > 0) {
    const results = await Promise.allSettled(sourceUrls.map(fetchUrlContent));
    const fetched = results
      .map((r, i) =>
        r.status === "fulfilled"
          ? `--- Source: ${sourceUrls[i]} ---\n${r.value}`
          : `--- Source: ${sourceUrls[i]} (failed to fetch) ---`
      )
      .join("\n\n");
    urlContext = `\n\nREFERENCE MATERIAL (fetched from provided URLs — use this as factual source material):\n${fetched}`;
  }

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
${additionalNotes ? `- Additional Notes: ${additionalNotes}` : ""}${urlContext}

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
      max_tokens: 16000,
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

app.post("/api/continue-script", async (req, res) => {
  const { partialScript, title, scriptType, tone, duration } = req.body;

  if (!partialScript) {
    return res.status(400).json({ error: "No partial script provided." });
  }

  const typeLabel = scriptType === "podcast" ? "podcast episode" : "YouTube video";

  const systemPrompt = `You are an expert script writer for Hazardscape, a media brand focused on engaging storytelling.
You write compelling, well-structured scripts for podcasts and YouTube videos.
Your scripts are energetic, engaging, and formatted professionally with clear sections, speaker cues, and transitions.`;

  const userPrompt = `The following ${typeLabel} script for "${title}" was cut off mid-generation. Continue it seamlessly from exactly where it stopped — do not repeat any content, do not add a heading or preamble, just continue the script naturally from the last word:

${partialScript}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 16000,
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
    console.error("Continue script error:", err);
    res.write(`data: ${JSON.stringify({ error: err.message || "Failed to continue script." })}\n\n`);
    res.end();
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Serve React frontend in production
const publicPath = join(__dirname, "public");
if (existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get("*", (_req, res) => {
    res.sendFile(join(publicPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Hazardscape Script Writer backend running on port ${PORT}`);
});
