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

  // API Route: Elite Co-Writer Continuation (Seamless text flow)
  app.post("/api/generate-next", async (req, res) => {
    try {
      const { currentText, note, lorebook, remainingBeats } = req.body;

      if (!currentText) {
        return res.status(400).json({ error: "Text context is required." });
      }

      let systemInstruction = (
        "You are Inkwell's Elite Co-Writer. Your job is to seamlessly continue the user's story. " +
        "Mimic their voice, cadence, sentence structures, and tone precisely. Focus deeply on sensory " +
        "details and internal tracking of thoughts. Do not include any conversational filler, " +
        "introductory phrases, or markdown headers. Output ONLY the raw story prose. You are a professional long-form novelist co-writing an immersive narrative story."
      );

      // Scan the text for active character / lore references inside lorebook
      const matchedLore: string[] = [];
      if (lorebook && Array.isArray(lorebook) && lorebook.length > 0) {
        lorebook.forEach((entry: any) => {
          if (entry && entry.keyword) {
            // Use a case-insensitive regex pattern matching whole words only
            const wordRegex = new RegExp(`\\b${entry.keyword}\\b`, "i");
            if (wordRegex.test(currentText) || (note && wordRegex.test(note))) {
              matchedLore.push(`- ${entry.keyword}: ${entry.description}`);
            }
          }
        });
      }

      if (matchedLore.length > 0) {
        systemInstruction += `\n\nCRITICAL CHARACTER/LORE FACTS TO ENFORCE:\n${matchedLore.join("\n")}\nKeep these details 100% consistent in the next paragraph.`;
      }

      if (remainingBeats && Array.isArray(remainingBeats) && remainingBeats.length > 0) {
        systemInstruction += `
\n\nUPCOMING CHAPTER PLOT OBJECTIVES:
The author has established a list of scene goals. Your highest priority is to fulfill the VERY FIRST objective listed below while subtly building momentum for the rest. Do not skip ahead or execute them all at once.

Next Objective to Write: "${remainingBeats[0]}"
Subsequent targets to seed: ${remainingBeats.slice(1).map((b: any) => `"${b}"`).join(', ') || 'None'}

Keep the prose voice contextually seamless with the established story architecture.`;
      } else {
        systemInstruction += "\n\nNo active plot beats are provided. Freely evaluate the text and continue writing the logical next paragraph beat.";
      }

      let contextBlock = "Continue the scene smoothly. Write exactly one robust paragraph. Do not rush the plot, stay in the current moment.";
      if (note && note.trim().length > 0) {
        contextBlock += `\n\nCRITICAL DIRECTION: You must incorporate the following plot beat, action, or environmental change seamlessly into this paragraph: "${note}"`;
      }

      const prompt = `
<context>
${contextBlock}
</context>

<draft>
${currentText}
</draft>
`.trim();

      const result = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.75,
          maxOutputTokens: 350,
        }
      });

      res.json({ suggestion: result.text || "" });
    } catch (error) {
      console.error("Gemini Co-Writer Error:", error);
      res.status(500).json({ error: "Failed to generate continuation" });
    }
  });

  // API Route: AI Story Assistance
  app.post("/api/ai/suggest", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      const systemInstruction = `You are Inkwell's Elite Co-Writer. Your goal is to help authors expand their stories seamlessly without hijacking their voice or introducing cliché plot tropes.

CRITICAL RULES:
1. Style Matching: Analyze the user's provided snippet for cadence, vocabulary, sentence length, and tone. Match it exactly in dialogue and continuation prompts.
2. Narrative Pacing: Do not rush to resolve a conflict. Focus on sensory details (sounds, visual textures) and internal character thoughts.
3. Positive Framing: Write the next logical progression of the scene. Keep the focus grounded in the immediate physical environment or dialogue.

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
          systemInstruction,
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
      const systemInstruction = `You are Inkwell's Elite Co-Writer performing a critical Plot Audit. Your goal is to help authors identify plot holes and expand their stories seamlessly without hijacking their voice or introducing cliché plot tropes.

CRITICAL RULES FOR AUDITING:
1. Style Matching & Evaluation: Analyze the provided chapter content's style (cadence, vocabulary, sentence length) and note if it feels authentic, rich, or needs grounding.
2. Narrative Pacing: Highlight pacing issues. Ensure that the conflict isn't rushed and suggest where to expand on sensory details (sounds, visual textures) or internal thoughts.
3. Positive Framing: Frame all critiques constructively, emphasizing the next logical progression of the scene while keeping recommendations focused on immediate physical environments or natural dialogue.

You MUST structure your feedback under the following four markdown headers:
### 🔍 Continuity & Inconsistencies
Verify factual cohesion: temporal offsets, logic flips, sudden object disappearance/reappearance, or sequence errors.

### 👤 Character Motivations
Audit psychological realism: checking for actions that feel forced, dialogue that violates established trauma/goals, or scenes where physical acts lack internal triggers.

### 💭 Thematic Weaknesses
Analyze the artistic weight: checking if themes feel unearned, if symbols or motifs are used superficially without narrative evolution, or if tone drifts away.

### 💡 Constructive Recommendations
Provide 2-3 specific, highly actionable rewrite avenues or subplots to weave in, keeping recommendations focused on immediate physical environments or natural dialogue.

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

  // API Route: AI Modify Selection
  app.post("/api/modify-selection", async (req, res) => {
    try {
      const { fullText, selectedText, action } = req.body;

      if (!selectedText || !action) {
        return res.status(400).json({ error: "Selected text and action type are required." });
      }

      const systemInstruction = (
        "You are Inkwell's Master Editor. Your job is to rewrite a specific excerpt of text based " +
        "on the user's editing goal. You MUST preserve the core meaning, character names, and overall " +
        "plot points. Do not include any introductory remarks, explanations, or quotes. Output ONLY the rewritten prose."
      );

      let actionInstruction = "";
      if (action === "enhance") {
        actionInstruction = "Rewrite the selection to inject vivid sensory data, textures, and atmospheric depth. Make the scene rich and highly immersive.";
      } else if (action === "pacing") {
        actionInstruction = "Rewrite the selection to maximize tension and speed up the pacing. Use shorter, punchier sentences and eliminate unnecessary passive phrasing.";
      } else if (action === "dialogue") {
        actionInstruction = "Rewrite the selection to make the spoken dialogue flow naturally. Enhance the cadence, rhythm, and emotional subtext while matching authentic human speech.";
      }

      const prompt = `
<story_context>
The following is the entire background text of the story for context, matching tone and style:
${fullText || ""}
</story_context>

<task>
${actionInstruction}
</task>

<text_to_rewrite>
${selectedText}
</text_to_rewrite>
`.trim();

      const result = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ replacement: (result.text || "").trim() });
    } catch (error) {
      console.error("Gemini Modify Selection Error:", error);
      res.status(500).json({ error: "Failed to modify selection" });
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
