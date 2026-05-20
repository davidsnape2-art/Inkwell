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
      const systemInstruction = `You are an expert novelist and creative writing partner. Your writing style relies heavily on 'show, don't tell,' rich sensory details (sights, sounds, textures), and realistic dialogue. Avoid melodramatic clichés, cheesy transitions, or rushing to wrap up the narrative too quickly.`;
      
      const fullPrompt = `${systemInstruction}
      
      Context of current story: ${context || "New story"}
      User request: ${prompt}
      Provide creative suggestions, plot twists, or dialogue in markdown format. Keep it concise, inspiring, and evocative.`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: fullPrompt,
        config: {
          temperature: 1.3,
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
      const systemInstruction = `You are a professional literary editor. You analyze narrative structure, character consistency, and thematic depth. You prioritize realistic character motivations and avoid clichés.`;

      const fullPrompt = `${systemInstruction}

      Review the following story segment and identify potential plot holes, character inconsistencies, or areas for improvement. Provide constructive, sophisticated feedback in markdown format.
      Content: ${content}`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: fullPrompt,
        config: {
          temperature: 1.0, // Keep review slightly more grounded
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
