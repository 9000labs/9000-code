// 9000 Code - Remote Terminal Client

(function() {
  'use strict';

  // DOM Elements
  const authScreen = document.getElementById('auth-screen');
  const terminalScreen = document.getElementById('terminal-screen');
  const authForm = document.getElementById('auth-form');
  const tokenInput = document.getElementById('token-input');
  const connectBtn = document.getElementById('connect-btn');
  const authError = document.getElementById('auth-error');
  const terminalContainer = document.getElementById('terminal-container');
  const disconnectBtn = document.getElementById('disconnect-btn');
  const loadingOverlay = document.getElementById('loading-overlay');
  const errorOverlay = document.getElementById('error-overlay');
  const errorMessage = document.getElementById('error-message');
  const reconnectBtn = document.getElementById('reconnect-btn');
  const statusIndicator = document.querySelector('.status-indicator');

  // State
  let socket = null;
  let terminal = null;
  let fitAddon = null;
  let currentToken = null;
  let isConnected = false;

  // Initialize
  function init() {
    authForm.addEventListener('submit', handleAuth);
    disconnectBtn.addEventListener('click', handleDisconnect);
    reconnectBtn.addEventListener('click', handleReconnect);

    // Check for token in URL (for convenience)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      tokenInput.value = urlToken;
      // Clear token from URL for security
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Focus token input
    tokenInput.focus();
  }

  // Handle authentication form submission
  function handleAuth(e) {
    e.preventDefault();

    const token = tokenInput.value.trim();
    if (!token) {
      showAuthError('Please enter an access token');
      return;
    }

    currentToken = token;
    setConnecting(true);
    authError.textContent = '';

    connect(token);
  }

  // Connect to server
  function connect(token) {
    // Disconnect existing connection
    if (socket) {
      socket.disconnect();
    }

    // Create socket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = io({
      transports: ['websocket', 'polling'],
      reconnection: false,
    });

    // Socket event handlers
    socket.on('connect', () => {
      console.log('Socket connected, authenticating...');
      socket.emit('auth', { token });
    });

    socket.on('auth_success', () => {
      console.log('Authentication successful');
      showTerminal();
      createTerminal();
    });

    socket.on('auth_error', (data) => {
      console.log('Authentication failed:', data.message);
      showAuthError(data.message || 'Authentication failed');
      setConnecting(false);
      socket.disconnect();
    });

    socket.on('terminal_ready', (data) => {
      console.log('Terminal ready, pid:', data.pid);
      hideLoading();
      isConnected = true;
      updateStatus(true);
    });

    socket.on('terminal_data', (data) => {
      if (terminal) {
        terminal.write(data);
      }
    });

    socket.on('terminal_exit', (data) => {
      console.log('Terminal exited, code:', data.exitCode);
      showError('Terminal process exited');
    });

    socket.on('error', (data) => {
      console.error('Server error:', data.message);
      showError(data.message || 'Server error');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      isConnected = false;
      updateStatus(false);

      if (reason !== 'io client disconnect') {
        showError('Connection lost: ' + reason);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      showAuthError('Failed to connect to server');
      setConnecting(false);
    });
  }

  // Show terminal screen
  function showTerminal() {
    authScreen.style.display = 'none';
    terminalScreen.style.display = 'flex';
    showLoading();
  }

  // Show auth screen
  function showAuth() {
    terminalScreen.style.display = 'none';
    authScreen.style.display = 'flex';
    hideError();
    setConnecting(false);
  }

  // Create xterm.js terminal
  function createTerminal() {
    // Clean up existing terminal
    if (terminal) {
      terminal.dispose();
    }

    // Create new terminal
    terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#e0e0e0',
        cursor: '#d97706',
        cursorAccent: '#1a1a1a',
        selection: 'rgba(217, 119, 6, 0.3)',
        black: '#1a1a1a',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e0e0e0',
        brightBlack: '#4a4a4a',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      allowTransparency: true,
      scrollback: 10000,
    });

    // Addons
    fitAddon = new FitAddon.FitAddon();
    const webLinksAddon = new WebLinksAddon.WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal in container
    terminal.open(terminalContainer);
    fitAddon.fit();

    // Handle terminal input
    terminal.onData((data) => {
      if (socket && isConnected) {
        socket.emit('terminal_input', data);
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddon && terminal) {
        fitAddon.fit();
        if (socket && isConnected) {
          socket.emit('terminal_resize', {
            cols: terminal.cols,
            rows: terminal.rows,
          });
        }
      }
    });
    resizeObserver.observe(terminalContainer);

    // Request terminal creation from server
    socket.emit('create_terminal', {
      cols: terminal.cols,
      rows: terminal.rows,
    });

    // Focus terminal
    terminal.focus();
  }

  // Handle disconnect button
  function handleDisconnect() {
    if (socket) {
      socket.emit('kill_terminal');
      socket.disconnect();
    }
    cleanupTerminal();
    showAuth();
  }

  // Handle reconnect button
  function handleReconnect() {
    hideError();
    if (currentToken) {
      showLoading();
      connect(currentToken);
    } else {
      showAuth();
    }
  }

  // Cleanup terminal
  function cleanupTerminal() {
    if (terminal) {
      terminal.dispose();
      terminal = null;
    }
    fitAddon = null;
    isConnected = false;
  }

  // UI Helpers
  function setConnecting(connecting) {
    connectBtn.disabled = connecting;
    connectBtn.querySelector('.btn-text').style.display = connecting ? 'none' : 'inline';
    connectBtn.querySelector('.btn-loading').style.display = connecting ? 'inline' : 'none';
  }

  function showAuthError(message) {
    authError.textContent = message;
  }

  function showLoading() {
    loadingOverlay.style.display = 'flex';
  }

  function hideLoading() {
    loadingOverlay.style.display = 'none';
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorOverlay.style.display = 'flex';
  }

  function hideError() {
    errorOverlay.style.display = 'none';
  }

  function updateStatus(connected) {
    statusIndicator.classList.toggle('connected', connected);
    statusIndicator.classList.toggle('disconnected', !connected);
  }

  // Start
  init();
})();
