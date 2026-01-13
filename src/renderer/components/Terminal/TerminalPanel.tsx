import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as TerminalIcon, Plus, X, FolderOpen, LayoutGrid, ChevronDown, Home, Clock } from 'lucide-react';
import { XTerminal, type XTerminalRef } from './XTerminal';
import { FloatingCommandMenu } from './FloatingCommandMenu';
import { SplitLayoutSelector } from './SplitLayoutSelector';
import { SplitTerminalView } from './SplitTerminalView';
import { useAppStore } from '../../stores/appStore';

interface Tab {
  id: string;
  name: string;
  cwd: string;
  isActive: boolean;
}

// Safe way to get cwd in browser/electron environment
const getDefaultCwd = () => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return '~'; // Will be resolved by electron
  }
  return '~';
};

export function TerminalPanel() {
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'default',
      name: 'Claude',
      cwd: getDefaultCwd(),
      isActive: true,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('default');
  const terminalRef = useRef<XTerminalRef | null>(null);
  const pendingCommandRef = useRef<string | null>(null);

  const {
    pendingNewTerminalCommand,
    clearPendingTerminalCommand,
    sendToTerminal,
    setActiveTerminalId,
    splitLayout,
    openSplitSelector,
    getRecentProjectPaths,
    assignTerminalToPanel,
  } = useAppStore();

  // 이전 레이아웃 ID 추적 (레이아웃 변경 감지용)
  const prevLayoutIdRef = useRef(splitLayout.layoutId);

  // 프로젝트 선택 드롭다운 상태
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // 프로젝트 경로 변경 핸들러
  const changeProjectPath = useCallback((newPath: string) => {
    // 현재 탭의 cwd 업데이트
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, cwd: newPath } : t
      )
    );
    // activeTerminalId를 현재 탭으로 동기화
    setActiveTerminalId(activeTabId);
    // 터미널에 cd 명령어 전송
    setTimeout(() => {
      sendToTerminal(`cd "${newPath}"\r`);
    }, 50);
    setIsProjectDropdownOpen(false);
  }, [activeTabId, sendToTerminal, setActiveTerminalId]);

  // Handle folder selection via OS dialog
  const handleSelectFolder = useCallback(async () => {
    if (!window.electronAPI?.dialog) return;

    const result = await window.electronAPI.dialog.selectFolder();
    if (result.success && result.path) {
      changeProjectPath(result.path);
    }
  }, [changeProjectPath]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = () => setIsProjectDropdownOpen(false);
    if (isProjectDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isProjectDropdownOpen]);

  const createNewTab = useCallback((customName?: string, customCwd?: string) => {
    const id = `tab-${Date.now()}`;
    const newTab: Tab = {
      id,
      name: customName || `Claude ${tabs.length + 1}`,
      cwd: customCwd || '~',
      isActive: true,
    };
    setTabs((prev) => [...prev.map((t) => ({ ...t, isActive: false })), newTab]);
    setActiveTabId(id);
    setActiveTerminalId(id);
    return id;
  }, [tabs.length, setActiveTerminalId]);

  // Handle pending new terminal command requests
  useEffect(() => {
    if (pendingNewTerminalCommand) {
      const { command, name, cwd } = pendingNewTerminalCommand;

      // Create new tab with specified cwd
      createNewTab(name, cwd);

      // Store command to be sent after terminal initializes
      pendingCommandRef.current = command;

      // Clear the pending request
      clearPendingTerminalCommand();
    }
  }, [pendingNewTerminalCommand, createNewTab, clearPendingTerminalCommand]);

  // Send pending command when active tab changes (new terminal initialized)
  useEffect(() => {
    if (pendingCommandRef.current) {
      // Small delay to ensure terminal is ready
      const timer = setTimeout(() => {
        if (pendingCommandRef.current) {
          sendToTerminal(pendingCommandRef.current);
          pendingCommandRef.current = null;
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeTabId, sendToTerminal]);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== id);
      if (newTabs.length === 0) {
        // Create a new default tab if all tabs are closed
        return [{
          id: 'default',
          name: 'Claude',
          cwd: '~',
          isActive: true,
        }];
      }
      // If closing active tab, activate the last tab
      if (id === activeTabId) {
        const lastTab = newTabs[newTabs.length - 1];
        setActiveTabId(lastTab.id);
      }
      return newTabs;
    });
  }, [activeTabId]);

  const switchTab = useCallback((id: string) => {
    setActiveTabId(id);
    setActiveTerminalId(id);
    setTabs((prev) =>
      prev.map((t) => ({ ...t, isActive: t.id === id }))
    );
  }, [setActiveTerminalId]);

  // Sync activeTerminalId on mount
  useEffect(() => {
    setActiveTerminalId(activeTabId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 레이아웃 변경 시 기존 탭들을 새 패널에 자동 할당
  useEffect(() => {
    const prevLayoutId = prevLayoutIdRef.current;
    const currentLayoutId = splitLayout.layoutId;

    // 레이아웃이 변경되었는지 확인
    if (prevLayoutId !== currentLayoutId) {
      console.log('[TerminalPanel] Layout changed:', prevLayoutId, '->', currentLayoutId);
      prevLayoutIdRef.current = currentLayoutId;

      // 단일 모드가 아닌 분할 모드로 전환된 경우
      if (currentLayoutId !== 'single') {
        // 기존 탭들을 새 패널에 순서대로 할당
        tabs.forEach((tab, index) => {
          const panelId = `panel-${index}`;
          // 해당 인덱스의 패널이 존재하면 할당
          if (index < splitLayout.panels.length) {
            console.log('[TerminalPanel] Assigning tab', tab.id, 'to panel', panelId);
            assignTerminalToPanel(panelId, tab.id);
          }
        });

        // 첫 번째 탭을 활성화
        if (tabs.length > 0) {
          setActiveTerminalId(tabs[0].id);
        }
      }
    }
  }, [splitLayout.layoutId, splitLayout.panels.length, tabs, assignTerminalToPanel, setActiveTerminalId]);

  // Focus terminal when tab changes
  useEffect(() => {
    terminalRef.current?.focus();
  }, [activeTabId]);

  return (
    <div className="flex h-full bg-claude-bg">
      {/* Floating Command Menu (Left Side) */}
      <FloatingCommandMenu />

      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Terminal Tabs & Split Layout Section */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-claude-surface/50 border-b border-claude-border">
        {/* Layout Selector */}
        <button
          onClick={openSplitSelector}
          className="flex items-center gap-1.5 px-2 py-1 text-xs bg-claude-bg hover:bg-claude-accent hover:text-white rounded border border-claude-border transition-colors shrink-0"
          title="분할 레이아웃 설정"
        >
          <LayoutGrid size={12} />
          <span>
            {splitLayout.layoutId === 'single' ? '단일' :
             splitLayout.layoutId === 'horizontal-2' ? '좌우 2' :
             splitLayout.layoutId === 'vertical-2' ? '상하 2' :
             splitLayout.layoutId === 'horizontal-3' ? '좌우 3' :
             splitLayout.layoutId === 'vertical-3' ? '상하 3' :
             splitLayout.layoutId === 'grid' ? '4그리드' :
             splitLayout.layoutId === 'left-main' ? '좌메인' :
             splitLayout.layoutId === 'top-main' ? '상메인' : '선택'}
          </span>
        </button>

        {/* Project Folder Selector */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsProjectDropdownOpen(!isProjectDropdownOpen);
            }}
            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-claude-bg hover:bg-claude-accent hover:text-white rounded border border-claude-border transition-colors"
            title="프로젝트 폴더 선택"
          >
            <FolderOpen size={12} />
            <span className="truncate max-w-[150px]">{activeTab?.cwd || '~'}</span>
            <ChevronDown size={10} className={`transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* 프로젝트 선택 드롭다운 */}
          {isProjectDropdownOpen && (
            <div
              className="absolute top-full left-0 mt-1 w-80 bg-claude-surface border border-claude-border rounded-lg shadow-xl z-50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 최근 프로젝트 목록 */}
              <div className="p-2 border-b border-claude-border">
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-claude-text-secondary">
                  <Clock size={12} />
                  <span>최근 프로젝트</span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {getRecentProjectPaths().length > 0 ? (
                    getRecentProjectPaths().map((path, index) => (
                      <button
                        key={index}
                        onClick={() => changeProjectPath(path)}
                        className="w-full text-left px-2 py-1.5 text-xs text-claude-text hover:bg-claude-bg rounded truncate"
                        title={path}
                      >
                        {path}
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-2 text-xs text-claude-text-secondary">
                      최근 프로젝트가 없습니다
                    </div>
                  )}
                </div>
              </div>

              {/* 빠른 액세스 */}
              <div className="p-2">
                <button
                  onClick={() => changeProjectPath('~')}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-claude-text hover:bg-claude-bg rounded"
                >
                  <Home size={12} />
                  <span>홈 디렉토리</span>
                </button>
                <button
                  onClick={handleSelectFolder}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-claude-accent hover:bg-claude-accent/10 rounded mt-1"
                >
                  <FolderOpen size={12} />
                  <span>폴더 찾아보기...</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-claude-border" />

        {/* Terminal Tabs */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('terminal-id', tab.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-colors cursor-grab active:cursor-grabbing group ${
                tab.id === activeTabId
                  ? 'bg-claude-accent/20 text-claude-accent border-claude-accent/50'
                  : 'bg-claude-bg text-claude-text-secondary hover:text-claude-text border-claude-border hover:border-claude-accent/30'
              }`}
              onClick={() => switchTab(tab.id)}
              title={splitLayout.layoutId !== 'single' ? '패널로 드래그하여 배치' : tab.name}
            >
              <TerminalIcon size={12} />
              <span className="truncate max-w-[80px]">{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  className="p-0.5 hover:bg-claude-border rounded opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Tab Button */}
        <button
          className="p-1 text-claude-text-secondary hover:text-claude-accent hover:bg-claude-bg rounded transition-colors shrink-0"
          onClick={() => createNewTab()}
          title="새 터미널"
        >
          <Plus size={14} />
        </button>
        </div>

        {/* Terminal Content - Single or Split View */}
        {splitLayout.layoutId === 'single' ? (
          // Single terminal view (original behavior)
          <div className="flex-1 overflow-hidden relative">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="absolute inset-0"
                style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
              >
                <XTerminal
                  ref={tab.id === activeTabId ? terminalRef : undefined}
                  terminalId={tab.id}
                  cwd={tab.cwd}
                />
              </div>
            ))}
          </div>
        ) : (
          // Split terminal view
          <SplitTerminalView
            tabs={tabs}
            activeTabId={activeTabId}
            onSwitchTab={switchTab}
            onCreateTab={createNewTab}
          />
        )}

        {/* Split Layout Selector Modal */}
        <SplitLayoutSelector />
      </div>
    </div>
  );
}
