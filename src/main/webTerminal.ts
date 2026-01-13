import type { Server as SocketServer, Socket } from 'socket.io';
import * as os from 'os';
import * as fs from 'fs';
import { validateToken } from './webAuth';
import { EDITION_LIMITS, getEdition } from '../shared/license';

// Import node-pty
let pty: typeof import('@lydell/node-pty') | null = null;
try {
  pty = require('@lydell/node-pty');
} catch (e) {
  console.error('[WebTerminal] Failed to load node-pty:', e);
}

// Track active web terminal sessions
interface WebTerminalSession {
  socket: Socket;
  pty: import('@lydell/node-pty').IPty;
  pid: number;
}

const webTerminals: Map<string, WebTerminalSession> = new Map();

/**
 * Get maximum connections based on current license edition
 * Community: 1, Pro: 10, Enterprise: Unlimited
 */
export function getMaxConnections(): number {
  const edition = getEdition();
  const limit = EDITION_LIMITS[edition].maxRemoteConnections;
  return limit === Infinity ? 999 : limit;
}

/**
 * Get valid working directory
 */
function getValidCwd(requestedCwd?: string): string {
  if (requestedCwd && fs.existsSync(requestedCwd)) {
    return requestedCwd;
  }
  return os.homedir();
}

/**
 * Setup Socket.io handlers for web terminal
 */
export function setupWebTerminalHandlers(io: SocketServer): void {
  if (!pty) {
    console.error('[WebTerminal] node-pty not available, web terminal disabled');
    return;
  }

  io.on('connection', (socket: Socket) => {
    console.log('[WebTerminal] New socket connection:', socket.id);

    // Check connection limit based on license edition
    const maxConnections = getMaxConnections();
    if (webTerminals.size >= maxConnections) {
      console.log(`[WebTerminal] Connection rejected: max connections (${maxConnections}) reached for ${getEdition()} edition`);
      socket.emit('error', {
        message: `최대 연결 수(${maxConnections}명)에 도달했습니다. Pro Edition으로 업그레이드하면 더 많은 동시 연결이 가능합니다.`
      });
      socket.disconnect();
      return;
    }

    let authenticated = false;
    let terminalSession: WebTerminalSession | null = null;

    // Handle authentication
    socket.on('auth', (data: { token: string }) => {
      console.log('[WebTerminal] Auth event received for:', socket.id);
      console.log('[WebTerminal] Token received:', data?.token ? `${data.token.substring(0, 8)}... (${data.token.length} chars)` : 'null');

      if (authenticated) {
        console.log('[WebTerminal] Already authenticated');
        return;
      }

      if (!data.token) {
        console.log('[WebTerminal] No token provided');
        socket.emit('auth_error', { message: 'No token provided' });
        socket.disconnect();
        return;
      }

      const isValid = validateToken(data.token);
      if (!isValid) {
        console.log('[WebTerminal] Authentication failed for:', socket.id);
        socket.emit('auth_error', { message: 'Invalid access token' });
        socket.disconnect();
        return;
      }

      authenticated = true;
      console.log('[WebTerminal] Authentication successful for:', socket.id);
      socket.emit('auth_success');
    });

    // Handle terminal creation (only after auth)
    socket.on('create_terminal', (data: { cwd?: string; cols?: number; rows?: number }) => {
      if (!authenticated) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      if (terminalSession) {
        socket.emit('error', { message: 'Terminal already exists for this session' });
        return;
      }

      const validCwd = getValidCwd(data.cwd);
      const cols = data.cols || 120;
      const rows = data.rows || 30;

      // Determine shell based on platform
      const isWindows = process.platform === 'win32';
      let shellPath: string;
      let shellArgs: string[];

      if (isWindows) {
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

      console.log('[WebTerminal] Creating terminal for:', socket.id, 'shell:', shellPath, 'cwd:', validCwd);

      try {
        const term = pty!.spawn(shellPath, shellArgs, {
          name: 'xterm-256color',
          cols,
          rows,
          cwd: validCwd,
          env: { ...process.env } as { [key: string]: string },
          useConpty: false,
        });

        const pid = term.pid;
        terminalSession = { socket, pty: term, pid };
        webTerminals.set(socket.id, terminalSession);

        console.log('[WebTerminal] Terminal created, pid:', pid, 'total sessions:', webTerminals.size);

        // Forward terminal output to socket
        term.onData((data: string) => {
          socket.emit('terminal_data', data);
        });

        // Handle terminal exit
        term.onExit(({ exitCode }) => {
          console.log('[WebTerminal] Terminal exited, pid:', pid, 'code:', exitCode);
          socket.emit('terminal_exit', { exitCode });
          cleanup();
        });

        socket.emit('terminal_ready', { pid });
      } catch (error) {
        console.error('[WebTerminal] Failed to create terminal:', error);
        socket.emit('error', { message: `Failed to create terminal: ${error}` });
      }
    });

    // Handle terminal input
    socket.on('terminal_input', (data: string) => {
      if (!authenticated || !terminalSession) {
        return;
      }
      terminalSession.pty.write(data);
    });

    // Handle terminal resize
    socket.on('terminal_resize', (data: { cols: number; rows: number }) => {
      if (!authenticated || !terminalSession) {
        return;
      }
      try {
        terminalSession.pty.resize(data.cols, data.rows);
      } catch (error) {
        console.error('[WebTerminal] Resize error:', error);
      }
    });

    // Cleanup function
    const cleanup = () => {
      if (terminalSession) {
        try {
          terminalSession.pty.kill();
        } catch (e) {
          // Ignore errors when killing already dead process
        }
        webTerminals.delete(socket.id);
        terminalSession = null;
        console.log('[WebTerminal] Cleaned up session:', socket.id, 'remaining:', webTerminals.size);
      }
    };

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log('[WebTerminal] Socket disconnected:', socket.id, 'reason:', reason);
      cleanup();
    });

    // Handle explicit terminal kill
    socket.on('kill_terminal', () => {
      if (terminalSession) {
        console.log('[WebTerminal] Kill requested for:', socket.id);
        cleanup();
        socket.emit('terminal_killed');
      }
    });
  });

  console.log('[WebTerminal] Handlers registered');
}

/**
 * Get current connection count
 */
export function getConnectionCount(): number {
  return webTerminals.size;
}

/**
 * Disconnect all web terminals (for shutdown)
 */
export function disconnectAll(): void {
  console.log('[WebTerminal] Disconnecting all sessions...');
  webTerminals.forEach((session, socketId) => {
    try {
      session.pty.kill();
      session.socket.disconnect();
    } catch (e) {
      // Ignore errors
    }
  });
  webTerminals.clear();
}
