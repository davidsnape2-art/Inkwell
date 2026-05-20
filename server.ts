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
      const { content } = req.body;
      const systemInstruction = `You are a professional literary editor. You analyze narrative structure, character consistency, and thematic depth. You prioritize realistic character motivations and avoid clichés. Use simple markdown with brief sections.`;

      const fullPrompt = `${systemInstruction}

      Review the following story segment and identify potential plot holes, character inconsistencies, or areas for improvement. Provide constructive, sophisticated feedback in markdown format.
      Content: ${content}`;

      const result = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: fullPrompt,
        config: {
          temperature: 0.8, // Keep review more grounded
        }
      });
      res.json({ review: result.text });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to review content" });
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
