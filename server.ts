import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Gemini
  const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  app.use(express.json());

  // API Route: AI Story Assistance
  app.post("/api/ai/suggest", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      const systemInstruction = `You are an expert novelist, literary director, and creative writing mentor. Your advice is highly specific, avoiding clichéd tropes or generic statements. You prioritize immersive 'show, don't tell' guidance, sensory-rich textures, deep psychological subtext, and atmospheric setting prompts.

Since your response will be rendered in a narrow (300px) sidebar, you MUST format your suggestions precisely according to these rules:
1. Sizing: Use concise bullet points, short items, and brief paragraphs (1-3 sentences maximum). Avoid long dense blocks of text.
2. Structure: Follow the requested markdown headers (### 💫 Chapter Continuations, ### 👤 Character Development, ### 🌍 World-Building Elements).
3. Quotes: Wrap dialogue or monologue examples inside markdown blockquotes (e.g. "> \\"Spoken words...\\"") to visually isolate them.
4. Dividers: Separate major conceptual sections with horizontal lines (---).`;
      
      const fullPrompt = `STORY BACKGROUND & CONTEXT:
${context || "No story context available."}

---

DEVELOPMENT DIRECTIVE:
${prompt}

---

Output the visual, actionable suggestions directly. Do not include conversational preambles or postscripts like "Here are your suggestions." Jump right into the requested markdown sections.`;

      const result = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: fullPrompt,
        config: {
          temperature: 1.1,
        }
      });
      res.json({ suggestion: result.text });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to get AI suggestion" });
    }
  });

  // API Route: AI Plot Hole Checker
  app.post("/api/ai/review", async (req, res) => {
    try {
      const { content, context } = req.body;
      const systemInstruction = `You are an elite literary critic, structural editor, and plot theorist. Your critique is sharp, professional, incredibly helpful, and constructive. You avoid superficial praise, jumping straight into pinpointing potential structural failures.

You MUST structure your feedback under the following four markdown headers:
### 🔍 Continuity & Inconsistencies
Verify factual cohesion: temporal offsets, logic flips, sudden object disappearance/reappearance, or sequence errors.

### 👤 Character Motivations
Audit psychological realism: checking for actions that feel forced, dialogue that violates established trauma/goals, or scenes where physical acts lack internal triggers.

### 💭 Thematic Weaknesses
Analyze the artistic weight: checking if themes feel unearned, if symbols or motifs are used superficially without narrative evolution, or if tone drifts away.

### 💡 Constructive Recommendations
Provide 2-3 specific, highly actionable rewrite avenues or subplots to weave in.

Use horizontal lines (---) to divide major sections and use elegant, literary phrasing. Since the response is displayed in a narrow (300px) widget, keep paragraphs brief and bullet points punchy.`;

      const fullPrompt = `STORY BACKGROUND & OVERVIEW:
${context || "No overall story overview."}

---

CHAPTER CONTENT TO AUDIT:
"${content}"

---

Please run a deep plot hole, motivation, and thematic review on the above chapter content.`;

      const result = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: fullPrompt,
        config: {
          systemInstruction,
          temperature: 0.85, // Keep review grounded but insightful for critical analysis
        }
      });
      res.json({ review: result.text });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to audit plot holes" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
