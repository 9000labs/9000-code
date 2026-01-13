import { app, BrowserWindow, ipcMain, shell as electronShell, dialog } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { registerSessionHandlers, watchSessions, stopWatchingSessions } from './sessions';
import { registerSkillHandlers } from './skills';
import { registerAgentHandlers } from './agents';
import { registerStatsHandlers } from './stats';
import { registerFileHandlers } from './files';
import { startWebServer, stopWebServer, getWebServerInfo, regenerateAccessToken } from './webServer';

// Global error handlers to prevent app crashes
process.on('uncaughtException', (error: Error) => {
  console.error('[CRITICAL] Uncaught Exception:', error);
  console.error('[CRITICAL] Stack:', error.stack);
  // Don't exit - try to keep app running
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('[CRITICAL] Unhandled Promise Rejection:', reason);
  console.error('[CRITICAL] Promise:', promise);
  // Don't exit - try to keep app running
});

// Helper to validate cwd path
function getValidCwd(requestedCwd?: string): string {
  if (requestedCwd && fs.existsSync(requestedCwd)) {
    return requestedCwd;
  }
  return os.homedir();
}

// Safe IPC send helper - prevents crashes when window is destroyed
function safeSend(channel: string, ...args: unknown[]): boolean {
  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[IPC] Failed to send to ${channel}:`, error);
    return false;
  }
}

// Handle node-pty import for native module
// Using @lydell/node-pty which has prebuilt binaries for Electron
let pty: typeof import('@lydell/node-pty') | null = null;
try {
  pty = require('@lydell/node-pty');
  console.log('[node-pty] Successfully loaded @lydell/node-pty');
} catch (e) {
  console.error('[node-pty] Failed to load @lydell/node-pty:', e);
}

// Terminal instances storage with PID tracking to handle race conditions
interface TerminalEntry {
  pty: import('@lydell/node-pty').IPty;
  pid: number;
}
const terminals: Map<string, TerminalEntry> = new Map();
// Track terminals being created to prevent race conditions
const pendingTerminals: Set<string> = new Set();

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: '9000 Code',
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hiddenInset', // macOS style
    frame: process.platform === 'darwin' ? true : true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:9876');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electronShell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Cleanup all terminals
    terminals.forEach((entry) => entry.pty.kill());
    terminals.clear();
  });
}

// Terminal IPC handlers
function setupTerminalHandlers() {
  // Create a new terminal instance
  ipcMain.handle('terminal:create', async (_, options: { id: string; cwd?: string }) => {
    if (!pty) {
      return { success: false, error: 'node-pty not available' };
    }

    const { id, cwd } = options;
    const validCwd = getValidCwd(cwd);

    // Determine shell based on platform
    const shellPath = process.platform === 'win32'
      ? process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe'
      : process.env.SHELL || '/bin/bash';

    const shellArgs = process.platform === 'win32' ? [] : ['--login'];

    console.log('[Terminal] Creating shell:', shellPath, 'cwd:', validCwd);

    try {
      const term = pty.spawn(shellPath, shellArgs, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: validCwd,
        env: process.env as { [key: string]: string },
        useConpty: false, // Use winpty instead of conpty on Windows
      });

      const pid = term.pid;
      terminals.set(id, { pty: term, pid });
      console.log('[Terminal] Created and stored with id:', id, 'pid:', pid, 'total terminals:', terminals.size);

      // Forward terminal output to renderer
      term.onData((data) => {
        safeSend('terminal:data', { id, data });
      });

      term.onExit(({ exitCode }) => {
        console.log('[Terminal] Exit:', id, 'pid:', pid, 'code:', exitCode);
        // Only delete if this terminal is still the active one for this ID
        const entry = terminals.get(id);
        if (entry && entry.pid === pid) {
          safeSend('terminal:exit', { id, exitCode });
          terminals.delete(id);
        } else {
          console.log('[Terminal] Exit ignored - terminal was replaced. Current pid:', entry?.pid);
        }
      });

      return { success: true };
    } catch (error) {
      console.error('[Terminal] Create error:', error);
      return { success: false, error: String(error) };
    }
  });

  // Write data to terminal
  ipcMain.handle('terminal:write', async (_, options: { id: string; data: string }) => {
    console.log('[Terminal] Write request:', options.id, 'data length:', options.data.length, 'terminals:', Array.from(terminals.keys()));
    const entry = terminals.get(options.id);
    if (entry) {
      entry.pty.write(options.data);
      console.log('[Terminal] Write success');
      return { success: true };
    }
    console.log('[Terminal] Write failed - terminal not found');
    return { success: false, error: 'Terminal not found' };
  });

  // Resize terminal
  ipcMain.handle('terminal:resize', async (_, options: { id: string; cols: number; rows: number }) => {
    const entry = terminals.get(options.id);
    if (entry) {
      entry.pty.resize(options.cols, options.rows);
      return { success: true };
    }
    return { success: false, error: 'Terminal not found' };
  });

  // Kill terminal
  ipcMain.handle('terminal:kill', async (_, options: { id: string }) => {
    const entry = terminals.get(options.id);
    if (entry) {
      entry.pty.kill();
      terminals.delete(options.id);
      return { success: true };
    }
    return { success: false, error: 'Terminal not found' };
  });

  // Execute Claude Code CLI
  ipcMain.handle('terminal:runClaude', async (_, options: { id: string; cwd: string }) => {
    if (!pty) {
      console.error('[Terminal] node-pty not available');
      return { success: false, error: 'node-pty not available' };
    }

    const { id, cwd } = options;
    const validCwd = getValidCwd(cwd);

    // Check if terminal with this ID already exists or is being created
    if (terminals.has(id) || pendingTerminals.has(id)) {
      console.log('[Terminal] Terminal already exists or pending:', id);
      return { success: true };
    }

    // Mark as pending to prevent race conditions
    pendingTerminals.add(id);

    // Use PowerShell on Windows for better compatibility
    const isWindows = process.platform === 'win32';
    let shellPath: string;
    let shellArgs: string[];

    if (isWindows) {
      // Try PowerShell first, fall back to cmd.exe
      const powershellPath = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
      if (fs.existsSync(powershellPath)) {
        shellPath = powershellPath;
        shellArgs = ['-NoLogo', '-NoExit'];
      } else {
        shellPath = process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
        shellArgs = [];
      }
    } else {
      shellPath = process.env.SHELL || '/bin/bash';
      shellArgs = ['--login'];
    }

    console.log('[Terminal] Running shell for Claude:', shellPath, 'args:', shellArgs, 'cwd:', validCwd);
    console.log('[Terminal] node-pty version check - spawn exists:', typeof pty.spawn);

    try {
      // Use WinPTY (ConPTY has AttachConsole issues in Electron)
      console.log('[Terminal] Creating terminal with WinPTY...');
      const term = pty.spawn(shellPath, shellArgs, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: validCwd,
        env: { ...process.env } as { [key: string]: string },
        useConpty: false, // Force WinPTY
      });

      const pid = term.pid;
      console.log('[Terminal] PTY spawn successful, pid:', pid);

      // Store terminal and remove from pending
      terminals.set(id, { pty: term, pid });
      pendingTerminals.delete(id);
      console.log('[Terminal] Shell started with id:', id, 'pid:', pid, 'total terminals:', terminals.size);

      term.onData((data) => {
        // Only forward data if this terminal is still active
        const entry = terminals.get(id);
        if (entry && entry.pid === pid) {
          console.log('[Terminal] Data received, length:', data.length);
          safeSend('terminal:data', { id, data });
        }
      });

      term.onExit(({ exitCode, signal }) => {
        console.log('[Terminal] Shell exit:', id, 'pid:', pid, 'code:', exitCode, 'signal:', signal);
        // Only delete and notify if this terminal is still the active one for this ID
        const entry = terminals.get(id);
        if (entry && entry.pid === pid) {
          safeSend('terminal:exit', { id, exitCode });
          terminals.delete(id);
        } else {
          console.log('[Terminal] Exit ignored - terminal was replaced. Current pid:', entry?.pid);
        }
      });

      // Don't send claude command automatically for now - just open shell
      // User can type 'claude' manually to test
      console.log('[Terminal] Shell ready. User can type commands.');

      // Log terminal status periodically for debugging
      let checkCount = 0;
      const statusCheck = setInterval(() => {
        checkCount++;
        const entry = terminals.get(id);
        const exists = entry && entry.pid === pid;
        console.log(`[Terminal] Status check #${checkCount}: terminal exists=${exists}, pid=${pid}`);
        if (!exists || checkCount >= 5) {
          clearInterval(statusCheck);
        }
      }, 1000);

      return { success: true };
    } catch (error) {
      console.error('[Terminal] Shell error:', error);
      pendingTerminals.delete(id);
      return { success: false, error: String(error) };
    }
  });
}

// Web server IPC handlers
function setupWebServerHandlers() {
  // Start web server
  ipcMain.handle('webserver:start', async () => {
    try {
      const result = await startWebServer();
      console.log('[WebServer] Started via IPC');
      return { success: true, ...result };
    } catch (error) {
      console.error('[WebServer] Failed to start:', error);
      return { success: false, error: String(error) };
    }
  });

  // Stop web server
  ipcMain.handle('webserver:stop', async () => {
    try {
      await stopWebServer();
      console.log('[WebServer] Stopped via IPC');
      return { success: true };
    } catch (error) {
      console.error('[WebServer] Failed to stop:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get web server info
  ipcMain.handle('webserver:info', async () => {
    return getWebServerInfo();
  });

  // Regenerate token
  ipcMain.handle('webserver:regenerateToken', async () => {
    const newToken = regenerateAccessToken();
    return { success: true, token: newToken };
  });
}

// Dialog IPC handlers
function setupDialogHandlers() {
  // Open folder selection dialog
  ipcMain.handle('dialog:selectFolder', async () => {
    if (!mainWindow) {
      return { success: false, error: 'No main window' };
    }

    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Project Folder',
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      return { success: true, path: result.filePaths[0] };
    } catch (error) {
      console.error('[Dialog] Folder selection error:', error);
      return { success: false, error: String(error) };
    }
  });
}

// App lifecycle
app.whenReady().then(async () => {
  setupTerminalHandlers();
  setupWebServerHandlers();
  setupDialogHandlers();
  registerSessionHandlers();
  registerSkillHandlers();
  registerAgentHandlers();
  registerStatsHandlers();
  registerFileHandlers();
  createWindow();

  // Start watching sessions for changes
  if (mainWindow) {
    watchSessions(mainWindow);
  }

  // Start web server automatically
  try {
    const webServerInfo = await startWebServer();
    console.log('[App] Web server started automatically');
    console.log('[App] Access URLs:', webServerInfo.urls);
    console.log('[App] Access Token:', webServerInfo.token.substring(0, 8) + '...');

    // Send web server info to renderer when ready
    mainWindow?.webContents.once('did-finish-load', () => {
      safeSend('webserver:started', webServerInfo);
    });
  } catch (error) {
    console.error('[App] Failed to start web server:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  stopWatchingSessions();
  await stopWebServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new windows from being created
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});
