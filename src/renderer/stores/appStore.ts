import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EDITION_LIMITS, getEdition } from '../../shared/license';

// Types
export interface Session {
  id: string;
  name: string;
  slug: string;
  project: string;
  projectPath: string;
  firstMessage: string;
  lastMessage: string;
  date: string;
  lastDate: string;
  messageCount: number;
  isActive: boolean;
  isBookmarked: boolean;
}

// Claude Session from Electron API
export interface ClaudeSession {
  id: string;
  slug: string;
  project: string;
  projectPath: string;
  firstMessage: string;
  lastMessage: string;
  timestamp: string;
  lastTimestamp: string;
  messageCount: number;
  isActive: boolean;
}

export interface Skill {
  id: string;
  name: string;
  command: string;
  description: string;
  filePath: string;
  category: string;
  isFavorite: boolean;
}

// SkillMetadata from Electron API
export interface SkillMetadata {
  name: string;
  command: string;
  description: string;
  filePath: string;
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  description: string;
  filePath: string;
  isGlobal: boolean;
  isFavorite: boolean;
}

// AgentMetadata from Electron API
export interface AgentMetadata {
  name: string;
  description: string;
  filePath: string;
  isGlobal: boolean;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  category: 'personal' | 'community';
  isFavorite: boolean;
  usageCount: number;
}

export interface TodoItem {
  id: string;
  content: string;
  completed: boolean;
  createdAt: string;
}

export interface MemoItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// Quick Command for terminal shortcuts
export interface QuickCommand {
  id: string;
  label: string;
  command: string;
}

// Launch Command for Claude CLI starters
export interface LaunchCommand {
  id: string;
  label: string;
  command: string;
  description: string;
}

// Split Layout Types
export type SplitDirection = 'horizontal' | 'vertical';

export interface SplitLayoutType {
  id: string;
  name: string;
  icon: string; // ASCII art representation for visual selection
  panels: number;
  direction: SplitDirection | 'grid';
  defaultRatios: number[]; // Percentage ratios for each panel
}

export interface SplitPanelState {
  id: string;
  terminalId: string | null; // Linked terminal tab ID
  ratio: number; // Current ratio (percentage)
}

export interface SplitLayoutState {
  layoutId: string;
  panels: SplitPanelState[];
  direction: SplitDirection | 'grid';
}

// Predefined split layouts
export const SPLIT_LAYOUTS: SplitLayoutType[] = [
  {
    id: 'single',
    name: '단일',
    icon: '┌─────┐\n│     │\n│     │\n└─────┘',
    panels: 1,
    direction: 'horizontal',
    defaultRatios: [100],
  },
  {
    id: 'horizontal-2',
    name: '좌우 2분할',
    icon: '┌──┬──┐\n│  │  │\n│  │  │\n└──┴──┘',
    panels: 2,
    direction: 'horizontal',
    defaultRatios: [50, 50],
  },
  {
    id: 'vertical-2',
    name: '상하 2분할',
    icon: '┌─────┐\n│     │\n├─────┤\n│     │\n└─────┘',
    panels: 2,
    direction: 'vertical',
    defaultRatios: [50, 50],
  },
  {
    id: 'horizontal-3',
    name: '좌우 3분할',
    icon: '┌─┬─┬─┐\n│ │ │ │\n│ │ │ │\n└─┴─┴─┘',
    panels: 3,
    direction: 'horizontal',
    defaultRatios: [33, 34, 33],
  },
  {
    id: 'grid-4',
    name: '2x2 그리드',
    icon: '┌──┬──┐\n│  │  │\n├──┼──┤\n│  │  │\n└──┴──┘',
    panels: 4,
    direction: 'grid',
    defaultRatios: [25, 25, 25, 25],
  },
  {
    id: 'left-main',
    name: '왼쪽 메인',
    icon: '┌───┬─┐\n│   │ │\n│   ├─┤\n│   │ │\n└───┴─┘',
    panels: 3,
    direction: 'horizontal',
    defaultRatios: [60, 20, 20],
  },
  {
    id: 'top-main',
    name: '상단 메인',
    icon: '┌─────┐\n│     │\n├──┬──┤\n│  │  │\n└──┴──┘',
    panels: 3,
    direction: 'vertical',
    defaultRatios: [60, 20, 20],
  },
];

// File system types
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  modifiedTime: string;
  extension: string;
}

export interface FileViewerState {
  filePath: string | null;
  content: string | null;
  isLoading: boolean;
  error: string | null;
}

// App Store Interface
interface AppState {
  // Sessions
  sessions: Session[];
  activeSessionId: string | null;
  selectedSessionId: string | null;
  isLoadingSessions: boolean;
  setActiveSession: (id: string) => void;
  setSelectedSession: (id: string | null) => void;
  addSession: (session: Omit<Session, 'id'>) => void;
  toggleBookmark: (id: string) => void;
  loadSessions: () => Promise<void>;
  setSessions: (sessions: Session[]) => void;

  // Terminal interaction
  terminalInput: string;
  setTerminalInput: (input: string) => void;
  sendToTerminal: (text: string) => void;
  terminalCallbacks: Map<string, (text: string) => void>;
  registerTerminalCallback: (terminalId: string, callback: (text: string) => void) => () => void;
  activeTerminalId: string;
  setActiveTerminalId: (id: string) => void;

  // New terminal tab with command
  pendingNewTerminalCommand: { command: string; name?: string; cwd?: string } | null;
  requestNewTerminal: (command: string, name?: string, cwd?: string) => void;
  clearPendingTerminalCommand: () => void;

  // Quick Commands
  quickCommands: QuickCommand[];
  addQuickCommand: (label: string, command: string) => void;
  removeQuickCommand: (id: string) => void;
  updateQuickCommand: (id: string, label: string, command: string) => void;

  // Launch Commands
  launchCommands: LaunchCommand[];
  addLaunchCommand: (label: string, command: string, description: string) => void;
  removeLaunchCommand: (id: string) => void;
  updateLaunchCommand: (id: string, label: string, command: string, description: string) => void;
  resetLaunchCommands: () => void;

  // Skills
  skills: Skill[];
  isLoadingSkills: boolean;
  selectedSkill: string | null;
  toggleSkillFavorite: (id: string) => void;
  loadSkills: () => Promise<void>;
  setSelectedSkill: (skillName: string | null) => void;

  // Agents
  agents: Agent[];
  isLoadingAgents: boolean;
  selectedAgent: string | null;  // filePath of selected agent
  toggleAgentFavorite: (id: string) => void;
  loadAgents: (projectPath?: string) => Promise<void>;
  setSelectedAgent: (filePath: string | null) => void;

  // Templates
  templates: Template[];
  addTemplate: (template: Omit<Template, 'id' | 'usageCount'>) => void;
  removeTemplate: (id: string) => void;
  updateTemplate: (id: string, name: string, content: string) => void;
  useTemplate: (id: string) => void;
  toggleTemplateFavorite: (id: string) => void;

  // Notes (Todos & Memos)
  todos: TodoItem[];
  memos: MemoItem[];
  addTodo: (content: string) => void;
  removeTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
  addMemo: (content: string) => void;
  removeMemo: (id: string) => void;
  updateMemo: (id: string, content: string) => void;

  // UI State
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Panel selection
  selectedSection: 'sessions' | 'agents' | 'skills' | 'notes' | 'templates' | 'remote' | 'files' | null;
  setSelectedSection: (section: 'sessions' | 'agents' | 'skills' | 'notes' | 'templates' | 'remote' | 'files' | null) => void;

  // Files
  currentPath: string;
  fileEntries: FileEntry[];
  isLoadingFiles: boolean;
  fileViewer: FileViewerState;
  expandedFolders: Set<string>;
  setCurrentPath: (path: string) => void;
  loadDirectory: (path: string) => Promise<void>;
  loadDrives: () => Promise<void>;
  goToParentDirectory: () => Promise<void>;
  openFile: (filePath: string) => Promise<void>;
  closeFileViewer: () => void;
  toggleFolder: (path: string) => void;

  // Notifications
  notifications: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;

  // Split Layout
  splitLayout: SplitLayoutState;
  isSplitSelectorOpen: boolean;
  activePanelId: string;
  setSplitLayout: (layoutId: string) => void;
  updatePanelRatio: (panelId: string, newRatio: number) => void;
  updatePanelRatios: (ratios: number[]) => void;
  assignTerminalToPanel: (panelId: string, terminalId: string) => void;
  swapTerminals: (droppedTerminalId: string, targetPanelId: string) => void;
  setActivePanelId: (panelId: string) => void;
  openSplitSelector: () => void;
  closeSplitSelector: () => void;

  // 최근 프로젝트 경로 조회
  getRecentProjectPaths: () => string[];
}

// Convert Claude session to app session
function convertClaudeSession(claudeSession: ClaudeSession, isBookmarked = false): Session {
  return {
    id: claudeSession.id,
    name: claudeSession.slug || claudeSession.id.slice(0, 8),
    slug: claudeSession.slug,
    project: claudeSession.project,
    projectPath: claudeSession.projectPath,
    firstMessage: claudeSession.firstMessage,
    lastMessage: claudeSession.lastMessage,
    date: claudeSession.timestamp,
    lastDate: claudeSession.lastTimestamp,
    messageCount: claudeSession.messageCount,
    isActive: claudeSession.isActive,
    isBookmarked,
  };
}

// Initial empty sessions (will be loaded from Electron API)
const initialSessions: Session[] = [];

// Initial empty skills (will be loaded from Electron API)
const initialSkills: Skill[] = [];

// Convert skill metadata to app skill
function convertSkillMetadata(metadata: SkillMetadata, isFavorite = false): Skill {
  // Extract category from skill name or use default
  const categoryMap: Record<string, string> = {
    'frontend': 'Development',
    'backend': 'Development',
    'git': 'Git',
    'pdf': 'Documentation',
    'docx': 'Documentation',
    'pptx': 'Documentation',
    'security': 'Analysis',
    'code-review': 'Analysis',
    'qa': 'Analysis',
    'devops': 'Automation',
    'ui': 'Design',
    'ux': 'Design',
  };

  const skillKey = metadata.command.replace('/', '').toLowerCase();
  let category = 'Other';
  for (const [key, value] of Object.entries(categoryMap)) {
    if (skillKey.includes(key)) {
      category = value;
      break;
    }
  }

  return {
    id: metadata.command,
    name: metadata.name,
    command: metadata.command,
    description: metadata.description,
    filePath: metadata.filePath,
    category,
    isFavorite,
  };
}

// Convert agent metadata to app agent
function convertAgentMetadata(metadata: AgentMetadata, isFavorite = false): Agent {
  return {
    id: metadata.filePath,  // Use filePath as unique ID
    name: metadata.name,
    description: metadata.description,
    filePath: metadata.filePath,
    isGlobal: metadata.isGlobal,
    isFavorite,
  };
}

// Initial empty agents
const initialAgents: Agent[] = [];

// Initial empty templates (will be loaded from persist)
const initialTemplates: Template[] = [];

// Initial empty todos and memos (will be loaded from persist)
const initialTodos: TodoItem[] = [];
const initialMemos: MemoItem[] = [];

// Default quick commands
const defaultQuickCommands: QuickCommand[] = [
  { id: 'cmd-1', label: '/usage', command: '/usage\r' },
  { id: 'cmd-2', label: '/help', command: '/help\r' },
  { id: 'cmd-3', label: '/clear', command: '/clear\r' },
  { id: 'cmd-4', label: '/compact', command: '/compact\r' },
  { id: 'cmd-5', label: '/config', command: '/config\r' },
];

// Default launch commands
const defaultLaunchCommands: LaunchCommand[] = [
  { id: 'launch-1', label: 'claude', command: 'claude\r', description: 'Start Claude Code' },
  { id: 'launch-2', label: '--resume', command: 'claude --resume\r', description: 'Resume last session' },
  { id: 'launch-3', label: '--chrome', command: 'claude --chrome\r', description: 'With Chrome MCP' },
  { id: 'launch-4', label: '--dangerously-skip-permissions', command: 'claude --dangerously-skip-permissions\r', description: 'Skip permission prompts' },
];

// Create store with persist for notes and quick commands
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  // Sessions
  sessions: initialSessions,
  activeSessionId: null,
  selectedSessionId: null,
  isLoadingSessions: false,

  setActiveSession: (id) => set((state) => ({
    sessions: state.sessions.map((s) => ({
      ...s,
      isActive: s.id === id,
    })),
    activeSessionId: id,
  })),

  setSelectedSession: (id) => set({ selectedSessionId: id }),

  addSession: (session) => set((state) => ({
    sessions: [
      ...state.sessions.map((s) => ({ ...s, isActive: false })),
      { ...session, id: `session-${Date.now()}`, isActive: true },
    ],
  })),

  toggleBookmark: (id) => set((state) => ({
    sessions: state.sessions.map((s) =>
      s.id === id ? { ...s, isBookmarked: !s.isBookmarked } : s
    ),
  })),

  loadSessions: async () => {
    // Only load in Electron environment
    if (!window.electronAPI?.sessions) {
      console.log('Sessions API not available (browser mode)');
      return;
    }

    set({ isLoadingSessions: true });

    try {
      const claudeSessions = await window.electronAPI.sessions.getAll();
      const { sessions: currentSessions } = get();

      // Preserve bookmarks from current sessions
      const bookmarkedIds = new Set(
        currentSessions.filter(s => s.isBookmarked).map(s => s.id)
      );

      const sessions = claudeSessions.map((cs: ClaudeSession) =>
        convertClaudeSession(cs, bookmarkedIds.has(cs.id))
      );

      set({
        sessions,
        isLoadingSessions: false,
        activeSessionId: sessions.length > 0 ? sessions[0].id : null,
      });
    } catch (error) {
      console.error('Failed to load sessions:', error);
      set({ isLoadingSessions: false });
    }
  },

  setSessions: (sessions) => set({ sessions }),

  // Terminal interaction
  terminalInput: '',
  terminalCallbacks: new Map(),
  activeTerminalId: 'default',

  setTerminalInput: (input) => set({ terminalInput: input }),

  setActiveTerminalId: (id) => set({ activeTerminalId: id }),

  sendToTerminal: (text) => {
    const { terminalCallbacks, activeTerminalId, addNotification } = get();
    const callback = terminalCallbacks.get(activeTerminalId);
    if (callback) {
      callback(text);
    } else {
      addNotification('Terminal not connected', 'error');
    }
  },

  registerTerminalCallback: (terminalId, callback) => {
    set((state) => {
      const newCallbacks = new Map(state.terminalCallbacks);
      newCallbacks.set(terminalId, callback);
      return { terminalCallbacks: newCallbacks };
    });
    return () => {
      set((state) => {
        const newCallbacks = new Map(state.terminalCallbacks);
        newCallbacks.delete(terminalId);
        return { terminalCallbacks: newCallbacks };
      });
    };
  },

  // New terminal tab with command
  pendingNewTerminalCommand: null,

  requestNewTerminal: (command, name, cwd) => {
    set({ pendingNewTerminalCommand: { command, name, cwd } });
  },

  clearPendingTerminalCommand: () => {
    set({ pendingNewTerminalCommand: null });
  },

  // Quick Commands
  quickCommands: defaultQuickCommands,

  addQuickCommand: (label, command) => {
    const state = get();
    const maxCommands = EDITION_LIMITS[getEdition()].maxQuickCommands;

    // Check limit for Community Edition
    if (state.quickCommands.length >= maxCommands) {
      state.addNotification(
        `빠른 명령어는 최대 ${maxCommands}개까지 추가할 수 있습니다. Pro Edition으로 업그레이드하면 무제한으로 사용 가능합니다.`,
        'error'
      );
      return;
    }

    set((state) => ({
      quickCommands: [
        ...state.quickCommands,
        { id: `cmd-${Date.now()}`, label, command: command.endsWith('\r') ? command : command + '\r' },
      ],
    }));
  },

  removeQuickCommand: (id) => set((state) => ({
    quickCommands: state.quickCommands.filter((cmd) => cmd.id !== id),
  })),

  updateQuickCommand: (id, label, command) => set((state) => ({
    quickCommands: state.quickCommands.map((cmd) =>
      cmd.id === id ? { ...cmd, label, command: command.endsWith('\r') ? command : command + '\r' } : cmd
    ),
  })),

  // Launch Commands
  launchCommands: defaultLaunchCommands,

  addLaunchCommand: (label, command, description) => set((state) => ({
    launchCommands: [
      ...state.launchCommands,
      {
        id: `launch-${Date.now()}`,
        label,
        command: command.endsWith('\r') ? command : command + '\r',
        description,
      },
    ],
  })),

  removeLaunchCommand: (id) => set((state) => ({
    launchCommands: state.launchCommands.filter((cmd) => cmd.id !== id),
  })),

  updateLaunchCommand: (id, label, command, description) => set((state) => ({
    launchCommands: state.launchCommands.map((cmd) =>
      cmd.id === id ? {
        ...cmd,
        label,
        command: command.endsWith('\r') ? command : command + '\r',
        description,
      } : cmd
    ),
  })),

  resetLaunchCommands: () => set({ launchCommands: defaultLaunchCommands }),

  // Skills
  skills: initialSkills,
  isLoadingSkills: false,
  selectedSkill: null,

  toggleSkillFavorite: (id) => set((state) => ({
    skills: state.skills.map((s) =>
      s.id === id ? { ...s, isFavorite: !s.isFavorite } : s
    ),
  })),

  loadSkills: async () => {
    console.log('[loadSkills] Starting...');
    // Only load in Electron environment
    if (!window.electronAPI?.skills) {
      console.log('[loadSkills] Skills API not available (browser mode)');
      return;
    }

    set({ isLoadingSkills: true });

    try {
      console.log('[loadSkills] Calling electronAPI.skills.getAll()...');
      const skillsMetadata = await window.electronAPI.skills.getAll();
      console.log('[loadSkills] Got skills:', skillsMetadata?.length || 0);
      const { skills: currentSkills } = get();

      // Preserve favorites from current skills
      const favoriteCommands = new Set(
        currentSkills.filter(s => s.isFavorite).map(s => s.command)
      );

      const skills = skillsMetadata.map((sm: SkillMetadata) =>
        convertSkillMetadata(sm, favoriteCommands.has(sm.command))
      );

      set({
        skills,
        isLoadingSkills: false,
      });
    } catch (error) {
      console.error('Failed to load skills:', error);
      set({ isLoadingSkills: false });
    }
  },

  setSelectedSkill: (skillName) => set({ selectedSkill: skillName }),

  // Agents
  agents: initialAgents,
  isLoadingAgents: false,
  selectedAgent: null,

  toggleAgentFavorite: (id) => set((state) => ({
    agents: state.agents.map((a) =>
      a.id === id ? { ...a, isFavorite: !a.isFavorite } : a
    ),
  })),

  loadAgents: async (projectPath) => {
    console.log('[loadAgents] Starting...');
    // Only load in Electron environment
    if (!window.electronAPI?.agents) {
      console.log('[loadAgents] Agents API not available (browser mode)');
      return;
    }

    set({ isLoadingAgents: true });

    try {
      console.log('[loadAgents] Calling electronAPI.agents.getAll()...');
      const agentsMetadata = await window.electronAPI.agents.getAll(projectPath);
      console.log('[loadAgents] Got agents:', agentsMetadata?.length || 0);
      const { agents: currentAgents } = get();

      // Preserve favorites from current agents
      const favoritePaths = new Set(
        currentAgents.filter(a => a.isFavorite).map(a => a.filePath)
      );

      const agents = agentsMetadata.map((am: AgentMetadata) =>
        convertAgentMetadata(am, favoritePaths.has(am.filePath))
      );

      set({
        agents,
        isLoadingAgents: false,
      });
    } catch (error) {
      console.error('Failed to load agents:', error);
      set({ isLoadingAgents: false });
    }
  },

  setSelectedAgent: (filePath) => set({ selectedAgent: filePath }),

  // Templates
  templates: initialTemplates,

  addTemplate: (template) => set((state) => ({
    templates: [
      ...state.templates,
      { ...template, id: `template-${Date.now()}`, usageCount: 0 },
    ],
  })),

  removeTemplate: (id) => set((state) => ({
    templates: state.templates.filter((t) => t.id !== id),
  })),

  updateTemplate: (id, name, content) => set((state) => ({
    templates: state.templates.map((t) =>
      t.id === id ? { ...t, name, content } : t
    ),
  })),

  useTemplate: (id) => set((state) => ({
    templates: state.templates.map((t) =>
      t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t
    ),
  })),

  toggleTemplateFavorite: (id) => set((state) => ({
    templates: state.templates.map((t) =>
      t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
    ),
  })),

  // Notes (Todos & Memos)
  todos: initialTodos,
  memos: initialMemos,

  addTodo: (content) => set((state) => ({
    todos: [
      ...state.todos,
      {
        id: `todo-${Date.now()}`,
        content,
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ],
  })),

  removeTodo: (id) => set((state) => ({
    todos: state.todos.filter((t) => t.id !== id),
  })),

  toggleTodo: (id) => set((state) => ({
    todos: state.todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ),
  })),

  addMemo: (content) => set((state) => ({
    memos: [
      ...state.memos,
      {
        id: `memo-${Date.now()}`,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  })),

  removeMemo: (id) => set((state) => ({
    memos: state.memos.filter((m) => m.id !== id),
  })),

  updateMemo: (id, content) => set((state) => ({
    memos: state.memos.map((m) =>
      m.id === id ? { ...m, content, updatedAt: new Date().toISOString() } : m
    ),
  })),

  // UI State
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Panel selection
  selectedSection: 'sessions' as const,
  setSelectedSection: (section) => set({ selectedSection: section }),

  // Files
  currentPath: '',
  fileEntries: [],
  isLoadingFiles: false,
  fileViewer: {
    filePath: null,
    content: null,
    isLoading: false,
    error: null,
  },
  expandedFolders: new Set<string>(),

  setCurrentPath: (path) => set({ currentPath: path }),

  loadDirectory: async (dirPath) => {
    if (!window.electronAPI?.files) {
      console.log('[Files] Files API not available');
      return;
    }

    set({ isLoadingFiles: true });

    try {
      const result = await window.electronAPI.files.readDirectory(dirPath);
      if (result.success && result.entries) {
        set({
          currentPath: dirPath,
          fileEntries: result.entries,
          isLoadingFiles: false,
        });
      } else {
        console.error('[Files] Failed to read directory:', result.error);
        set({ isLoadingFiles: false });
        get().addNotification(result.error || 'Failed to read directory', 'error');
      }
    } catch (error) {
      console.error('[Files] Error loading directory:', error);
      set({ isLoadingFiles: false });
    }
  },

  loadDrives: async () => {
    if (!window.electronAPI?.files) {
      console.log('[Files] Files API not available');
      return;
    }

    set({ isLoadingFiles: true });

    try {
      const result = await window.electronAPI.files.getDrives();
      if (result.success && result.drives) {
        set({
          currentPath: '', // Empty path means showing drives
          fileEntries: result.drives,
          isLoadingFiles: false,
        });
      } else {
        console.error('[Files] Failed to get drives:', result.error);
        set({ isLoadingFiles: false });
      }
    } catch (error) {
      console.error('[Files] Error loading drives:', error);
      set({ isLoadingFiles: false });
    }
  },

  goToParentDirectory: async () => {
    if (!window.electronAPI?.files) return;

    const { currentPath } = get();
    if (!currentPath) {
      // Already at drives list, do nothing
      return;
    }

    try {
      const result = await window.electronAPI.files.getParentPath(currentPath);
      if (result.success) {
        if (result.showDrives) {
          // Show drives list
          await get().loadDrives();
        } else if (!result.isRoot) {
          await get().loadDirectory(result.path);
        }
      }
    } catch (error) {
      console.error('[Files] Error going to parent:', error);
    }
  },

  openFile: async (filePath) => {
    if (!window.electronAPI?.files) return;

    try {
      const canView = await window.electronAPI.files.canViewInternally(filePath);

      if (canView) {
        // Open internally
        set({
          fileViewer: {
            filePath,
            content: null,
            isLoading: true,
            error: null,
          },
        });

        const result = await window.electronAPI.files.readFile(filePath);
        if (result.success && result.content !== undefined) {
          set({
            fileViewer: {
              filePath,
              content: result.content,
              isLoading: false,
              error: null,
            },
          });
        } else {
          set({
            fileViewer: {
              filePath,
              content: null,
              isLoading: false,
              error: result.error || 'Failed to read file',
            },
          });
        }
      } else {
        // Open with external application
        const result = await window.electronAPI.files.openExternal(filePath);
        if (!result.success) {
          get().addNotification(result.error || 'Failed to open file', 'error');
        }
      }
    } catch (error) {
      console.error('[Files] Error opening file:', error);
      get().addNotification('Failed to open file', 'error');
    }
  },

  closeFileViewer: () => set({
    fileViewer: {
      filePath: null,
      content: null,
      isLoading: false,
      error: null,
    },
  }),

  toggleFolder: (folderPath) => set((state) => {
    const newExpanded = new Set(state.expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    return { expandedFolders: newExpanded };
  }),

  // Notifications
  notifications: [],

  addNotification: (message, type) => {
    const id = `notif-${Date.now()}`;
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));
    // Auto-remove after 3 seconds
    setTimeout(() => {
      get().removeNotification(id);
    }, 3000);
  },

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),

  // Split Layout
  splitLayout: {
    layoutId: 'single',
    panels: [{ id: 'panel-0', terminalId: null, ratio: 100 }],
    direction: 'horizontal',
  },
  isSplitSelectorOpen: false,
  activePanelId: 'panel-0',

  setSplitLayout: (layoutId) => {
    const layout = SPLIT_LAYOUTS.find((l) => l.id === layoutId);
    if (!layout) return;

    // 기존 패널에서 터미널 할당 정보 순서대로 수집
    const currentPanels = get().splitLayout.panels;
    const existingTerminalIds = currentPanels
      .map(p => p.terminalId)
      .filter((id): id is string => id !== null);

    const panels: SplitPanelState[] = layout.defaultRatios.map((ratio, index) => ({
      id: `panel-${index}`,
      // 기존 터미널 할당 순서대로 보존
      terminalId: existingTerminalIds[index] ?? (index === 0 && existingTerminalIds.length === 0 ? get().activeTerminalId : null),
      ratio,
    }));

    // 레이아웃 변경 시 activePanelId를 첫 번째 패널로 리셋
    set({
      splitLayout: {
        layoutId,
        panels,
        direction: layout.direction,
      },
      activePanelId: 'panel-0',
    });
  },

  updatePanelRatio: (panelId, newRatio) => set((state) => ({
    splitLayout: {
      ...state.splitLayout,
      panels: state.splitLayout.panels.map((p) =>
        p.id === panelId ? { ...p, ratio: newRatio } : p
      ),
    },
  })),

  updatePanelRatios: (ratios) => set((state) => ({
    splitLayout: {
      ...state.splitLayout,
      panels: state.splitLayout.panels.map((p, index) => ({
        ...p,
        ratio: ratios[index] ?? p.ratio,
      })),
    },
  })),

  assignTerminalToPanel: (panelId, terminalId) => set((state) => ({
    splitLayout: {
      ...state.splitLayout,
      panels: state.splitLayout.panels.map((p) =>
        p.id === panelId ? { ...p, terminalId } : p
      ),
    },
  })),

  // 터미널 스왑: 드래그된 터미널을 대상 패널에 배치하고, 기존 터미널은 소스 패널로 이동
  swapTerminals: (droppedTerminalId, targetPanelId) => set((state) => {
    const panels = state.splitLayout.panels;

    // 드래그된 터미널이 있던 소스 패널 찾기
    const sourcePanel = panels.find(p => p.terminalId === droppedTerminalId);
    const targetPanel = panels.find(p => p.id === targetPanelId);

    if (!targetPanel) return state;

    // 대상 패널에 있던 터미널
    const targetTerminalId = targetPanel.terminalId;

    return {
      splitLayout: {
        ...state.splitLayout,
        panels: panels.map(p => {
          // 대상 패널: 드래그된 터미널 할당
          if (p.id === targetPanelId) {
            return { ...p, terminalId: droppedTerminalId };
          }
          // 소스 패널: 대상 터미널 할당 (스왑)
          if (sourcePanel && p.id === sourcePanel.id) {
            return { ...p, terminalId: targetTerminalId };
          }
          return p;
        }),
      },
    };
  }),

  setActivePanelId: (panelId) => set({ activePanelId: panelId }),

  openSplitSelector: () => set({ isSplitSelectorOpen: true }),
  closeSplitSelector: () => set({ isSplitSelectorOpen: false }),

  // 최근 프로젝트 경로 조회 (세션 데이터 기반)
  getRecentProjectPaths: () => {
    const sessions = get().sessions;
    const paths = sessions
      .filter(s => s.projectPath)
      .sort((a, b) => {
        const dateA = new Date(b.lastDate || b.date).getTime();
        const dateB = new Date(a.lastDate || a.date).getTime();
        return dateA - dateB;
      })
      .map(s => s.projectPath);
    // 중복 제거 후 최근 10개 반환
    return [...new Set(paths)].slice(0, 10);
  },
    }),
    {
      name: 'claude-helper-storage',
      partialize: (state) => ({
        todos: state.todos,
        memos: state.memos,
        quickCommands: state.quickCommands,
        launchCommands: state.launchCommands,
        templates: state.templates,
        splitLayout: state.splitLayout,
      }),
    }
  )
);
