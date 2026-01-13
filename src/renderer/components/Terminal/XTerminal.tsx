import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
} from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useAppStore } from '../../stores/appStore';

// Module-level storage to persist terminals across React StrictMode remounts
const terminalInstances = new Map<string, { terminal: Terminal; fitAddon: FitAddon }>();
// Track which terminals have been initialized (IPC called) to prevent duplicate IPC calls
const initializedTerminals = new Set<string>();
// Track mounted components to distinguish StrictMode remount from true unmount
const mountedComponents = new Set<string>();

interface XTerminalProps {
  terminalId: string;
  cwd: string;
}

export interface XTerminalRef {
  focus: () => void;
  write: (data: string) => void;
  input: (data: string) => void;
}

export const XTerminal = forwardRef<XTerminalRef, XTerminalProps>(
  function XTerminal({ terminalId, cwd }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const isInitializedRef = useRef(false);
    const initializedTerminalIdRef = useRef<string | null>(null);
    const { registerTerminalCallback } = useAppStore();

    // 컨텍스트 메뉴 상태
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

    // 복사 핸들러
    const handleCopy = useCallback(() => {
      const selection = terminalRef.current?.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
      setContextMenu(null);
    }, []);

    // 붙여넣기 핸들러
    const handlePaste = useCallback(async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && terminalRef.current) {
          terminalRef.current.paste(text);
        }
      } catch (err) {
        console.error('[XTerminal] Paste error:', err);
      }
      setContextMenu(null);
    }, []);

    // 컨텍스트 메뉴 열기
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }, []);

    // 컨텍스트 메뉴 닫기 (외부 클릭)
    useEffect(() => {
      const handleClickOutside = () => setContextMenu(null);
      if (contextMenu) {
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
      }
    }, [contextMenu]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      focus: () => {
        terminalRef.current?.focus();
      },
      write: (data: string) => {
        terminalRef.current?.write(data);
      },
      // Simulate keyboard input (triggers onData like real typing)
      input: (data: string) => {
        terminalRef.current?.paste(data);
      },
    }));

    // Initialize terminal
    useEffect(() => {
      if (!containerRef.current) return;

      // Mark this component as mounted
      mountedComponents.add(terminalId);
      console.log('[XTerminal] Mount:', terminalId, 'mounted components:', Array.from(mountedComponents));

      // Check if terminal already exists in module-level storage (StrictMode remount or split view switch)
      const existingInstance = terminalInstances.get(terminalId);
      if (existingInstance) {
        console.log('[XTerminal] Reusing existing terminal instance:', terminalId);
        // Reuse existing terminal instance
        terminalRef.current = existingInstance.terminal;
        fitAddonRef.current = existingInstance.fitAddon;

        // Move terminal DOM element to new container (instead of calling open() again)
        // xterm.js terminal.open() can only be called once, so we move the DOM element
        const terminalElement = existingInstance.terminal.element;
        if (terminalElement && containerRef.current && !containerRef.current.contains(terminalElement)) {
          console.log('[XTerminal] Moving terminal DOM to new container:', terminalId);
          containerRef.current.appendChild(terminalElement);
        }

        // Fit to new container size
        existingInstance.fitAddon.fit();
        existingInstance.terminal.focus();
        return; // Skip initialization, just return without cleanup
      }

      console.log('[XTerminal] Creating new terminal instance:', terminalId);

      const terminal = new Terminal({
        theme: {
          background: '#1a1a1a',
          foreground: '#e5e5e5',
          cursor: '#d97706',
          cursorAccent: '#1a1a1a',
          selectionBackground: 'rgba(217, 119, 6, 0.3)',
          black: '#1a1a1a',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#e5e5e5',
          brightBlack: '#404040',
          brightRed: '#f87171',
          brightGreen: '#4ade80',
          brightYellow: '#facc15',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#ffffff',
        },
        fontFamily: 'JetBrains Mono, Fira Code, Monaco, monospace',
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        cursorStyle: 'bar',
        scrollback: 10000,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);

      // 복사/붙여넣기 키보드 단축키 설정
      terminal.attachCustomKeyEventHandler((event) => {
        const isMac = navigator.platform.includes('Mac');
        const modKey = isMac ? event.metaKey : event.ctrlKey;

        // 복사: Mac=Cmd+C, Win/Linux=Ctrl+Shift+C
        if (event.type === 'keydown' && event.key === 'c' && modKey && (isMac || event.shiftKey)) {
          const selection = terminal.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection);
            return false; // 이벤트 소비
          }
        }

        // 붙여넣기: Mac=Cmd+V, Win/Linux=Ctrl+Shift+V
        if (event.type === 'keydown' && event.key === 'v' && modKey && (isMac || event.shiftKey)) {
          navigator.clipboard.readText().then(text => {
            if (text) {
              terminal.paste(text);
            }
          });
          return false; // 이벤트 소비
        }

        return true; // 다른 키는 통과
      });

      terminal.open(containerRef.current);
      fitAddon.fit();

      // Store in module-level Map
      terminalInstances.set(terminalId, { terminal, fitAddon });

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;
      isInitializedRef.current = true;
      initializedTerminalIdRef.current = terminalId;

      // Handle terminal input
      terminal.onData((data) => {
        if (window.electronAPI) {
          window.electronAPI.terminal.write({ id: terminalId, data }).catch((err) => {
            console.error('[XTerminal] Write error:', err);
          });
        } else {
          console.error('[XTerminal] electronAPI not available!');
        }
      });

      // Handle resize
      terminal.onResize(({ cols, rows }) => {
        window.electronAPI?.terminal.resize({ id: terminalId, cols, rows });
      });

      // Create terminal in main process
      const initTerminal = async () => {
        // Prevent duplicate IPC calls (important for StrictMode)
        if (initializedTerminals.has(terminalId)) {
          console.log('[XTerminal] initTerminal already called for:', terminalId, '- skipping IPC');
          return;
        }
        initializedTerminals.add(terminalId);
        console.log('[XTerminal] initTerminal calling IPC for:', terminalId);

        // Check if running in Electron
        if (window.electronAPI) {
          const result = await window.electronAPI.terminal.runClaude({
            id: terminalId,
            cwd,
          });

          if (!result.success) {
            terminal.writeln(`\x1b[31mFailed to start Claude: ${result.error}\x1b[0m`);
            terminal.writeln('\x1b[33mMake sure Claude Code CLI is installed and in your PATH.\x1b[0m');
            terminal.writeln('');
            terminal.writeln('To install Claude Code: npm install -g @anthropic/claude-code');
            terminal.writeln('');

            // Fall back to regular shell
            const shellResult = await window.electronAPI.terminal.create({
              id: terminalId,
              cwd,
            });

            if (!shellResult.success) {
              terminal.writeln(`\x1b[31mFailed to start shell: ${shellResult.error}\x1b[0m`);
            }
          }

          // Listen for terminal output
          const unsubscribeData = window.electronAPI.terminal.onData((event) => {
            if (event.id === terminalId) {
              terminal.write(event.data);
            }
          });

          const unsubscribeExit = window.electronAPI.terminal.onExit((event) => {
            if (event.id === terminalId) {
              terminal.writeln(`\r\n\x1b[33mProcess exited with code ${event.exitCode}\x1b[0m`);
            }
          });

          // Cleanup listeners on unmount
          return () => {
            unsubscribeData();
            unsubscribeExit();
          };
        } else {
          // Development mode without Electron
          terminal.writeln('\x1b[36m╔═══════════════════════════════════════════╗\x1b[0m');
          terminal.writeln('\x1b[36m║        9000 Code - Development           ║\x1b[0m');
          terminal.writeln('\x1b[36m╚═══════════════════════════════════════════╝\x1b[0m');
          terminal.writeln('');
          terminal.writeln('\x1b[33mRunning in browser development mode.\x1b[0m');
          terminal.writeln('\x1b[33mTerminal functionality requires Electron.\x1b[0m');
          terminal.writeln('');
          terminal.writeln('Run with: \x1b[32mnpm run dev:electron\x1b[0m');
          terminal.writeln('');
          terminal.write('$ ');

          // Echo input in dev mode
          terminal.onData((data) => {
            if (data === '\r') {
              terminal.writeln('');
              terminal.write('$ ');
            } else if (data === '\x7f') {
              // Backspace
              terminal.write('\b \b');
            } else {
              terminal.write(data);
            }
          });
        }
      };

      initTerminal();

      // Focus terminal
      terminal.focus();

      return () => {
        // Don't cleanup immediately - let StrictMode remount reuse the instance
        // Only cleanup when the terminal is truly being removed (handled by closeTab in TerminalPanel)
        // The module-level Map keeps the terminal alive across StrictMode remounts
      };
    }, [terminalId]); // Remove cwd from dependencies - terminal persists across cwd changes

  // Cleanup terminal when component is truly unmounting (not StrictMode)
  useEffect(() => {
    return () => {
      // Remove from mounted set
      mountedComponents.delete(terminalId);
      console.log('[XTerminal] Unmount:', terminalId, 'mounted components:', Array.from(mountedComponents));

      // Use a small delay to distinguish StrictMode remount from true unmount
      setTimeout(() => {
        // If component was remounted (StrictMode), it will be back in the set
        if (mountedComponents.has(terminalId)) {
          console.log('[XTerminal] Component remounted (StrictMode), skipping cleanup:', terminalId);
          return;
        }

        console.log('[XTerminal] True unmount, cleaning up:', terminalId);
        const instance = terminalInstances.get(terminalId);
        if (instance) {
          instance.terminal.dispose();
          terminalInstances.delete(terminalId);
          initializedTerminals.delete(terminalId);
          if (window.electronAPI) {
            window.electronAPI.terminal.kill({ id: terminalId });
          }
        }
      }, 100);
    };
  }, [terminalId]);

    // Handle window resize
    useEffect(() => {
      const handleResize = () => {
        fitAddonRef.current?.fit();
      };

      window.addEventListener('resize', handleResize);

      // Use ResizeObserver for container resize
      const observer = new ResizeObserver(() => {
        fitAddonRef.current?.fit();
      });

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => {
        window.removeEventListener('resize', handleResize);
        observer.disconnect();
      };
    }, []);

    // Register terminal callback for receiving commands from sidebar
    useEffect(() => {
      const handleTerminalInput = (text: string) => {
        if (terminalRef.current) {
          // Use paste() to simulate real keyboard input
          // This triggers onData internally, which sends to PTY
          terminalRef.current.paste(text);
        }
      };

      const unregister = registerTerminalCallback(terminalId, handleTerminalInput);
      return unregister;
    }, [terminalId, registerTerminalCallback]);

    // Handle drag over to allow drop
    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    }, []);

    // Handle drop to insert file path
    const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Get file path from drag data
      const filePath = e.dataTransfer.getData('application/x-file-path') ||
                       e.dataTransfer.getData('text/plain');

      if (filePath && terminalRef.current) {
        // Quote path if it contains spaces (for shell compatibility)
        const quotedPath = filePath.includes(' ') ? `"${filePath}"` : filePath;

        // Write to terminal display
        terminalRef.current.write(quotedPath);

        // Send to PTY process if in Electron mode
        if (window.electronAPI) {
          window.electronAPI.terminal.write({ id: terminalId, data: quotedPath });
        }

        // Focus terminal after drop
        terminalRef.current.focus();
      }
    }, [terminalId]);

    return (
      <>
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ minHeight: '200px' }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onContextMenu={handleContextMenu}
        />

        {/* 컨텍스트 메뉴 */}
        {contextMenu && (
          <div
            className="fixed bg-claude-surface border border-claude-border rounded-lg shadow-xl z-[9999] py-1 min-w-[120px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCopy}
              className="w-full px-3 py-1.5 text-left text-sm text-claude-text hover:bg-claude-bg flex items-center gap-2"
            >
              <span>복사</span>
              <span className="ml-auto text-xs text-claude-text-secondary">
                {navigator.platform.includes('Mac') ? '⌘C' : 'Ctrl+Shift+C'}
              </span>
            </button>
            <button
              onClick={handlePaste}
              className="w-full px-3 py-1.5 text-left text-sm text-claude-text hover:bg-claude-bg flex items-center gap-2"
            >
              <span>붙여넣기</span>
              <span className="ml-auto text-xs text-claude-text-secondary">
                {navigator.platform.includes('Mac') ? '⌘V' : 'Ctrl+Shift+V'}
              </span>
            </button>
          </div>
        )}
      </>
    );
  }
);
