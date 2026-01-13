import express from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import * as path from 'path';
import * as os from 'os';
import { getToken, getTokenInfo, regenerateToken } from './webAuth';
import { setupWebTerminalHandlers, getConnectionCount, disconnectAll, getMaxConnections } from './webTerminal';

// Server state
let httpServer: HttpServer | null = null;
let io: SocketServer | null = null;
let isRunning = false;

// Default configuration
const DEFAULT_PORT = 3001;
const DEFAULT_HOST = '0.0.0.0'; // Listen on all interfaces for remote access

interface WebServerConfig {
  port?: number;
  host?: string;
}

/**
 * Get local network IP addresses
 */
function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        ips.push(alias.address);
      }
    }
  }

  return ips;
}

/**
 * Start the web server
 */
export function startWebServer(config: WebServerConfig = {}): Promise<{ port: number; token: string; urls: string[] }> {
  return new Promise((resolve, reject) => {
    if (isRunning) {
      const token = getToken();
      const port = config.port || DEFAULT_PORT;
      resolve({
        port,
        token,
        urls: getAccessURLs(port),
      });
      return;
    }

    const port = config.port || DEFAULT_PORT;
    const host = config.host || DEFAULT_HOST;

    const app = express();

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
          connectSrc: ["'self'", "ws:", "wss:"],
          fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        },
      },
    }));

    // CORS for local/remote access
    app.use(cors({
      origin: true, // Allow all origins for personal use
      credentials: true,
    }));

    // JSON parsing
    app.use(express.json());

    // Serve static files from web-client directory
    const webClientPath = path.join(__dirname, 'web-client');
    app.use(express.static(webClientPath));

    // API endpoint: Get server status
    app.get('/api/status', (req, res) => {
      res.json({
        status: 'running',
        connections: getConnectionCount(),
        maxConnections: getMaxConnections(),
      });
    });

    // Serve index.html for root
    app.get('/', (req, res) => {
      res.sendFile(path.join(webClientPath, 'index.html'));
    });

    // Create HTTP server
    httpServer = createServer(app);

    // Create Socket.io server
    io = new SocketServer(httpServer, {
      cors: {
        origin: true,
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Setup terminal WebSocket handlers
    setupWebTerminalHandlers(io);

    // Start listening
    httpServer.listen(port, host, () => {
      isRunning = true;
      const token = getToken();
      const urls = getAccessURLs(port);

      console.log('[WebServer] Started on port', port);
      console.log('[WebServer] Access URLs:');
      urls.forEach(url => console.log('  -', url));
      console.log('[WebServer] Access token:', token.substring(0, 8) + '...');

      resolve({ port, token, urls });
    });

    httpServer.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use`));
      } else {
        reject(error);
      }
    });
  });
}

/**
 * Stop the web server
 */
export function stopWebServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!isRunning || !httpServer) {
      resolve();
      return;
    }

    console.log('[WebServer] Stopping...');

    // Disconnect all terminals first
    disconnectAll();

    // Close Socket.io
    if (io) {
      io.close();
      io = null;
    }

    // Close HTTP server
    httpServer.close(() => {
      console.log('[WebServer] Stopped');
      isRunning = false;
      httpServer = null;
      resolve();
    });
  });
}

/**
 * Get access URLs for the web server
 */
function getAccessURLs(port: number): string[] {
  const urls: string[] = [`http://localhost:${port}`];

  const localIPs = getLocalIPs();
  localIPs.forEach(ip => {
    urls.push(`http://${ip}:${port}`);
  });

  return urls;
}

/**
 * Check if server is running
 */
export function isWebServerRunning(): boolean {
  return isRunning;
}

/**
 * Get server info
 */
export function getWebServerInfo(): {
  running: boolean;
  port: number | null;
  token: string | null;
  urls: string[];
  connections: number;
} {
  if (!isRunning) {
    return {
      running: false,
      port: null,
      token: null,
      urls: [],
      connections: 0,
    };
  }

  const tokenInfo = getTokenInfo();
  return {
    running: true,
    port: DEFAULT_PORT,
    token: tokenInfo.token,
    urls: getAccessURLs(DEFAULT_PORT),
    connections: getConnectionCount(),
  };
}

/**
 * Regenerate access token
 */
export function regenerateAccessToken(): string {
  return regenerateToken();
}
