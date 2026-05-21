import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getAISuggestion(prompt: string, context?: string) {
  const response = await fetch("/api/ai/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, context }),
  });
  if (!response.ok) throw new Error("AI failed");
  return response.json();
}

export async function getAIReview(content: string, context?: string) {
  const response = await fetch("/api/ai/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, context }),
  });
  if (!response.ok) throw new Error("AI failed");
  return response.json();
}

export async function generateNext(currentText: string, note?: string) {
  const response = await fetch("/api/generate-next", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentText, note }),
  });
  if (!response.ok) throw new Error("Co-Writer failed");
  return response.json();
}
