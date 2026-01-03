import { Project, Document, AppSettings } from "../types";

// Base keys
const DATA_KEY_PREFIX = "context_book_data_";
const SETTINGS_KEY_PREFIX = "context_book_settings_";

const DEFAULT_PROMPT = `You are an expert editor and archivist. 
Analyze the following raw text (which may be a chat log, a transcript, or a long article).

Your task is to organize this text into a "book" structure by splitting it into logical sections/chapters.

IMPORTANT: 
- The 'title' MUST be in Chinese (Simplified).
- The 'summary' MUST be in Chinese (Simplified).
- If 'content' is requested, it must remain in the original language of the source text.

For each section:
1. 'title': Create a descriptive, concise title (In Chinese).
2. 'summary': Write a high-quality summary of the IMPORTANT content (In Chinese).
3. 'content': (If requested) Return the EXACT verbatim original text corresponding to this section.

The output must be a valid JSON array.`;

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'google',
  temperature: 0.7,
  customPrompt: DEFAULT_PROMPT,
  
  // Google Defaults
  googleModelId: "gemini-3-flash-preview",
  
  // OpenAI Defaults (Empty by default)
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiApiKey: "",
  openaiModelId: "gpt-4o"
};

// --- Updated functions requiring User ID ---

export const loadProjects = (userId: string): Project[] => {
  try {
    const key = `${DATA_KEY_PREFIX}${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load projects", e);
    return [];
  }
};

export const saveProjects = (userId: string, projects: Project[]) => {
  try {
    const key = `${DATA_KEY_PREFIX}${userId}`;
    localStorage.setItem(key, JSON.stringify(projects));
  } catch (e) {
    console.error("Failed to save projects", e);
  }
};

export const loadSettings = (userId?: string): AppSettings => {
  try {
    // If no userId provided (e.g. initial load before auth), return defaults
    if (!userId) return DEFAULT_SETTINGS;

    const key = `${SETTINGS_KEY_PREFIX}${userId}`;
    const data = localStorage.getItem(key);
    if (!data) return DEFAULT_SETTINGS;
    
    const parsed = JSON.parse(data);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (userId: string, settings: AppSettings) => {
  try {
    const key = `${SETTINGS_KEY_PREFIX}${userId}`;
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
};

export const createId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};