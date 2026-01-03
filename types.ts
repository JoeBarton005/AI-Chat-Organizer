export interface Segment {
  id: string;
  title: string;
  summary: string;
  content: string; // The verbatim full text for this section
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Document {
  id: string;
  title: string;
  segments: Segment[];
  chatHistory: ChatMessage[]; // Store chat history specific to this document
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  documents: Document[];
}

export interface User {
  id: string;
  username: string;
  passwordHash: string; // In a real app, this would be hashed properly backend-side
  createdAt: number;
}

export type AIProvider = 'google' | 'openai';

export interface AppSettings {
  // Common
  provider: AIProvider;
  temperature: number;
  customPrompt: string;

  // Google Specific
  googleModelId: string;

  // OpenAI Compatible Specific
  openaiBaseUrl: string;
  openaiApiKey: string;
  openaiModelId: string;
}

export type ViewMode = 'dashboard' | 'document';

export interface AppState {
  projects: Project[];
  currentProjectId: string | null;
  currentDocumentId: string | null;
  viewMode: ViewMode;
}