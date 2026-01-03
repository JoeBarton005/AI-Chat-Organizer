import { GoogleGenAI, Type } from "@google/genai";
import { Segment, ChatMessage, Document, AppSettings } from "../types";

// --- Google GenAI Client ---
const googleAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Types ---
interface AnalyzeOptions {
  settings: AppSettings;
  keepOriginal: boolean;
}

// --- Helper: Clean JSON ---
// Sometimes LLMs wrap JSON in ```json ... ``` or add text before/after.
function extractJson(text: string): any {
  let cleaned = text.trim();
  // Remove markdown code blocks if present
  if (cleaned.startsWith("```")) {
    const matches = cleaned.match(/```(?:json)?([\s\S]*?)```/);
    if (matches && matches[1]) {
      cleaned = matches[1].trim();
    }
  }
  return JSON.parse(cleaned);
}

// --- CORE FUNCTION: Analyze Text ---
export const analyzeText = async (text: string, options: AnalyzeOptions): Promise<Omit<Segment, 'id'>[]> => {
  const { settings, keepOriginal } = options;

  if (!text || text.trim().length === 0) return [];

  const finalPrompt = `
    ${settings.customPrompt}
    
    ${keepOriginal ? "Requirement: Include 'content' field with original text." : "Requirement: Do NOT include full content, only summaries."}
    
    The output MUST be a valid JSON array of objects.
  `;

  // 1. Route to Google
  if (settings.provider === 'google') {
    return analyzeWithGoogle(text, settings.googleModelId, finalPrompt, keepOriginal, settings.temperature);
  } 
  // 2. Route to OpenAI Compatible
  else {
    return analyzeWithOpenAI(text, settings, finalPrompt, keepOriginal);
  }
};

// --- Google Implementation ---
async function analyzeWithGoogle(text: string, modelId: string, systemPrompt: string, keepOriginal: boolean, temperature: number) {
  const properties: any = {
    title: { type: Type.STRING, description: "Chinese title." },
    summary: { type: Type.STRING, description: "Chinese summary." },
  };
  const required = ["title", "summary"];

  if (keepOriginal) {
    properties.content = { type: Type.STRING, description: "Original text." };
    required.push("content");
  }

  try {
    const response = await googleAi.models.generateContent({
      model: modelId,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }, { text: `\n\n[START OF TEXT]\n${text}\n[END OF TEXT]` }] }
      ],
      config: {
        temperature: temperature,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.OBJECT, properties, required }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    const result = JSON.parse(jsonText);
    return keepOriginal ? result : result.map((r: any) => ({ ...r, content: "" }));

  } catch (error) {
    console.error("Google AI Error:", error);
    throw error;
  }
}

// --- OpenAI Compatible Implementation ---
async function analyzeWithOpenAI(text: string, settings: AppSettings, systemPrompt: string, keepOriginal: boolean) {
  const { openaiBaseUrl, openaiApiKey, openaiModelId, temperature } = settings;

  if (!openaiApiKey) throw new Error("API Key is missing for Custom Provider");

  // OpenAI usually expects messages array
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `[START OF TEXT]\n${text}\n[END OF TEXT]` }
  ];

  try {
    // Normalize URL: remove trailing slash
    const baseUrl = openaiBaseUrl.replace(/\/$/, "");
    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: openaiModelId,
        messages: messages,
        temperature: temperature,
        // Some providers support response_format: { type: "json_object" }, but not all. 
        // We rely on prompt engineering for JSON to be generic.
        response_format: { type: "json_object" } 
      })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI Provider Error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error("Empty response from OpenAI provider");

    // OpenAI generic JSON parsing
    let parsed = extractJson(content);
    
    // Compatibility fix: if the model returned { "segments": [...] } or similar instead of array
    if (!Array.isArray(parsed)) {
        // Look for the first array property
        const keys = Object.keys(parsed);
        for (const k of keys) {
            if (Array.isArray(parsed[k])) {
                parsed = parsed[k];
                break;
            }
        }
    }

    if (!Array.isArray(parsed)) {
        throw new Error("Model did not return a JSON Array. Please tweak the model or prompt.");
    }

    // Sanitize fields
    return parsed.map((item: any) => ({
      title: item.title || "No Title",
      summary: item.summary || "No Summary",
      content: keepOriginal ? (item.content || "") : ""
    }));

  } catch (error) {
    console.error("OpenAI Compatible Error:", error);
    throw error;
  }
}

// --- CORE FUNCTION: Generate Title ---
export const generateTitle = async (text: string, settings: AppSettings): Promise<string> => {
  const prompt = `Generate a very short, 3-5 word title for a document that starts with the following text. The title MUST be in Chinese (Simplified). Return ONLY the title text.`;
  const snippet = text.substring(0, 500);

  try {
    if (settings.provider === 'google') {
       const res = await googleAi.models.generateContent({
         model: settings.googleModelId,
         contents: `${prompt}: ${snippet}`
       });
       return res.text?.trim() || "未命名文档";
    } else {
       // OpenAI Title
       const baseUrl = settings.openaiBaseUrl.replace(/\/$/, "");
       const res = await fetch(`${baseUrl}/chat/completions`, {
         method: "POST",
         headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.openaiApiKey}` },
         body: JSON.stringify({
            model: settings.openaiModelId,
            messages: [{ role: "user", content: `${prompt}\n\nText: ${snippet}` }]
         })
       });
       const data = await res.json();
       return data.choices?.[0]?.message?.content?.trim() || "未命名文档";
    }
  } catch (e) {
    return "新文档";
  }
}

// --- CORE FUNCTION: Chat Stream ---
export async function* chatWithDocumentStream(
  doc: Document | null, 
  userMessage: string, 
  history: ChatMessage[], 
  settings: AppSettings
): AsyncGenerator<string, void, unknown> {

  let context = "";
  if (doc) {
      const contextMap = doc.segments.map((s, i) => `Chapter ${i+1}: ${s.title}\nSummary: ${s.summary}`).join("\n\n");
      context = `You are a helpful AI assistant. The user is reading a document organized into chapters.
      Here is the structure and summary of the document:
      ${contextMap}
      Answer the user's question based on this context. Answer in Chinese (Simplified).`;
  } else {
      context = `You are a helpful AI assistant for the 'Context Book' app. 
      The user has not processed a document yet. Guide them to paste text to generate a book. Answer in Chinese (Simplified).`;
  }

  // 1. Google Stream
  if (settings.provider === 'google') {
     try {
       const conversationHistory = history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
       }));

       const result = await googleAi.models.generateContentStream({
          model: settings.googleModelId,
          contents: [
            { role: 'user', parts: [{ text: context }] },
            ...conversationHistory,
            { role: 'user', parts: [{ text: userMessage }] }
          ]
       });

       for await (const chunk of result) {
          const text = chunk.text;
          if (text) yield text;
       }
     } catch (e) {
        console.error(e);
        yield "Error: " + (e as Error).message;
     }
  } 
  // 2. OpenAI Compatible Stream
  else {
      try {
        const messages = [
            { role: "system", content: context },
            ...history.map(m => ({ role: m.role, content: m.text })),
            { role: "user", content: userMessage }
        ];
        
        const baseUrl = settings.openaiBaseUrl.replace(/\/$/, "");
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${settings.openaiApiKey}` 
            },
            body: JSON.stringify({
                model: settings.openaiModelId,
                messages: messages,
                temperature: settings.temperature,
                stream: true
            })
        });

        if (!response.ok || !response.body) {
            yield "Error connecting to API.";
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ")) {
                    const dataStr = trimmed.slice(6);
                    if (dataStr === "[DONE]") return;
                    try {
                        const json = JSON.parse(dataStr);
                        const content = json.choices?.[0]?.delta?.content;
                        if (content) yield content;
                    } catch (e) {
                        // ignore parse errors for partial chunks
                    }
                }
            }
        }
      } catch (e) {
          console.error(e);
          yield "Error: " + (e as Error).message;
      }
  }
}

// Kept for backward compatibility if needed, but UI now uses stream
export const chatWithDocument = async (doc: Document, userMessage: string, history: ChatMessage[], settings: AppSettings): Promise<string> => {
    // Non-streaming fallback simply collects the stream
    let fullText = "";
    for await (const chunk of chatWithDocumentStream(doc, userMessage, history, settings)) {
        fullText += chunk;
    }
    return fullText;
};