// Session types
export interface Session {
  id: string;
  name: string;
  project: string;
  cwd: string;
  createdAt: Date;
  updatedAt: Date;
  isBookmarked: boolean;
  tags: string[];
  messageCount: number;
}

// Skill types
export interface Skill {
  id: string;
  name: string;
  command: string;
  description: string;
  category: string;
  isFavorite: boolean;
  usageCount: number;
}

// Template types
export interface Template {
  id: string;
  name: string;
  content: string;
  category: 'personal' | 'community';
  isFavorite: boolean;
  usageCount: number;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Context usage types
export interface ContextUsage {
  current: number;
  max: number;
  percentage: number;
  files: ContextFile[];
}

export interface ContextFile {
  path: string;
  tokens: number;
}

// Todo types
export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
}

// Terminal types
export interface TerminalTab {
  id: string;
  name: string;
  cwd: string;
  isActive: boolean;
  isClaudeMode: boolean;
}

export interface TerminalMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: Date;
}

// Settings types
export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  fontSize: number;
  fontFamily: string;
  sidebarWidth: number;
  showLineNumbers: boolean;
  enableAnimations: boolean;
  autoSaveSessions: boolean;
  defaultCwd: string;
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  type: string;
  description: string;
  tools: string[];
}

// IPC message types
export interface IPCTerminalCreate {
  id: string;
  cwd?: string;
}

export interface IPCTerminalWrite {
  id: string;
  data: string;
}

export interface IPCTerminalResize {
  id: string;
  cols: number;
  rows: number;
}

export interface IPCTerminalData {
  id: string;
  data: string;
}

export interface IPCTerminalExit {
  id: string;
  exitCode: number;
}

export interface IPCResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
