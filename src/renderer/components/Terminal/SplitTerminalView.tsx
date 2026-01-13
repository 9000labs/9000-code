import { useRef, useCallback, useState, useEffect } from 'react';
import { Plus, Terminal as TerminalIcon } from 'lucide-react';
import { XTerminal, type XTerminalRef } from './XTerminal';
import { useAppStore } from '../../stores/appStore';

interface Tab {
  id: string;
  name: string;
  cwd: string;
  isActive: boolean;
}

interface SplitTerminalViewProps {
  tabs: Tab[];
  activeTabId: string;
  onSwitchTab: (id: string) => void;
  onCreateTab: () => string;
}

interface SplitPanelProps {
  panelId: string;
  terminalId: string | null;
  tabs: Tab[];
  ratio: number;
  isActive: boolean;
  onSelectTerminal: (panelId: string, terminalId: string) => void;
  onSwapTerminal: (droppedTerminalId: string, targetPanelId: string) => void;
  onActivatePanel: (panelId: string) => void;
  onCreateTerminal: () => string;
  terminalRef?: React.RefObject<XTerminalRef>;
}

// Individual split panel component
function SplitPanel({
  panelId,
  terminalId,
  tabs,
  ratio,
  isActive,
  onSelectTerminal,
  onSwapTerminal,
  onActivatePanel,
  onCreateTerminal,
  terminalRef,
}: SplitPanelProps) {
  const selectedTab = tabs.find((t) => t.id === terminalId);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleTerminalSelect = useCallback((tabId: string) => {
    onSelectTerminal(panelId, tabId);
    setIsDropdownOpen(false);
  }, [panelId, onSelectTerminal]);

  const handleCreateNew = useCallback(() => {
    const newTabId = onCreateTerminal();
    onSelectTerminal(panelId, newTabId);
    setIsDropdownOpen(false);
  }, [panelId, onCreateTerminal, onSelectTerminal]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('terminal-id')) {
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedTerminalId = e.dataTransfer.getData('terminal-id');
    if (droppedTerminalId) {
      // swapTerminals를 사용하여 터미널 스왑 처리
      onSwapTerminal(droppedTerminalId, panelId);
    }
  }, [panelId, onSwapTerminal]);

  return (
    <div
      className={`
        flex flex-col h-full overflow-hidden border-2 rounded-lg transition-colors
        ${isDragOver ? 'border-claude-accent border-dashed bg-claude-accent/10' :
          isActive ? 'border-claude-accent' : 'border-claude-border'}
      `}
      onClick={() => onActivatePanel(panelId)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ flex: `${ratio} 0 0` }}
    >
      {/* Panel Header */}
      <div className={`
        flex items-center justify-between px-2 py-1
        ${isActive ? 'bg-claude-accent/10' : 'bg-claude-surface'}
        border-b border-claude-border
      `}>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
            className="flex items-center gap-1.5 px-2 py-0.5 text-xs rounded hover:bg-claude-border transition-colors"
          >
            <TerminalIcon size={12} className="text-claude-accent" />
            <span className="text-claude-text truncate max-w-[100px]">
              {selectedTab?.name || '터미널 선택'}
            </span>
          </button>

          {/* Terminal Selection Dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-claude-surface border border-claude-border rounded-lg shadow-lg z-50">
              <div className="p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTerminalSelect(tab.id);
                    }}
                    className={`
                      w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors
                      ${terminalId === tab.id
                        ? 'bg-claude-accent/20 text-claude-accent'
                        : 'text-claude-text hover:bg-claude-bg'
                      }
                    `}
                  >
                    <TerminalIcon size={12} />
                    <span className="truncate">{tab.name}</span>
                  </button>
                ))}
                <div className="border-t border-claude-border my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateNew();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-claude-text-secondary hover:text-claude-text hover:bg-claude-bg rounded transition-colors"
                >
                  <Plus size={12} />
                  <span>새 터미널</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {isActive && (
          <div className="w-2 h-2 rounded-full bg-claude-accent" title="활성 패널" />
        )}
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden">
        {terminalId && selectedTab ? (
          <XTerminal
            ref={terminalRef}
            terminalId={terminalId}
            cwd={selectedTab.cwd}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-claude-bg">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(true);
              }}
              className="flex flex-col items-center gap-2 p-4 text-claude-text-secondary hover:text-claude-text transition-colors"
            >
              <Plus size={24} />
              <span className="text-xs">터미널 선택</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Resize handle between panels
interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  panelIndex: number;
  onResize: (panelIndex: number, delta: number) => void;
}

function ResizeHandle({ direction, panelIndex, onResize }: ResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;

      const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPos - startPos.current;
      startPos.current = currentPos;

      onResize(panelIndex, delta);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [direction, panelIndex, onResize]);

  return (
    <div
      ref={handleRef}
      onMouseDown={handleMouseDown}
      className={`
        group flex-shrink-0 bg-claude-border hover:bg-claude-accent transition-colors
        ${direction === 'horizontal'
          ? 'w-1 cursor-col-resize hover:w-1.5'
          : 'h-1 cursor-row-resize hover:h-1.5'
        }
      `}
    />
  );
}

export function SplitTerminalView({
  tabs,
  activeTabId,
  onSwitchTab,
  onCreateTab,
}: SplitTerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerminalRef>(null);

  const {
    splitLayout,
    activePanelId,
    setActivePanelId,
    assignTerminalToPanel,
    swapTerminals,
    updatePanelRatios,
    setActiveTerminalId,
  } = useAppStore();

  // Handle terminal selection for a panel
  const handleSelectTerminal = useCallback((panelId: string, terminalId: string) => {
    assignTerminalToPanel(panelId, terminalId);
    onSwitchTab(terminalId);
    setActiveTerminalId(terminalId);
  }, [assignTerminalToPanel, onSwitchTab, setActiveTerminalId]);

  // Handle panel activation
  const handleActivatePanel = useCallback((panelId: string) => {
    setActivePanelId(panelId);
    const panel = splitLayout.panels.find((p) => p.id === panelId);
    if (panel?.terminalId) {
      onSwitchTab(panel.terminalId);
      setActiveTerminalId(panel.terminalId);
    }
  }, [splitLayout.panels, onSwitchTab, setActiveTerminalId]);

  // Handle resize
  const handleResize = useCallback((panelIndex: number, delta: number) => {
    if (!containerRef.current) return;

    const containerSize = splitLayout.direction === 'horizontal'
      ? containerRef.current.offsetWidth
      : containerRef.current.offsetHeight;

    const deltaPercent = (delta / containerSize) * 100;
    const panels = splitLayout.panels;

    if (panelIndex >= panels.length - 1) return;

    const newRatios = panels.map((p, i) => {
      if (i === panelIndex) {
        return Math.max(10, Math.min(90, p.ratio + deltaPercent));
      }
      if (i === panelIndex + 1) {
        return Math.max(10, Math.min(90, p.ratio - deltaPercent));
      }
      return p.ratio;
    });

    // Normalize
    const total = newRatios.reduce((sum, r) => sum + r, 0);
    const normalizedRatios = newRatios.map((r) => (r / total) * 100);

    updatePanelRatios(normalizedRatios);
  }, [splitLayout.direction, splitLayout.panels, updatePanelRatios]);

  // Auto-assign first terminal to first panel if not assigned
  useEffect(() => {
    const firstPanel = splitLayout.panels[0];
    if (firstPanel && !firstPanel.terminalId && tabs.length > 0) {
      assignTerminalToPanel(firstPanel.id, tabs[0].id);
    }
  }, [splitLayout.panels, tabs, assignTerminalToPanel]);

  // Render single panel view
  if (splitLayout.layoutId === 'single' || splitLayout.panels.length === 1) {
    return (
      <div className="flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="h-full"
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
    );
  }

  // Render grid layout (2x2)
  if (splitLayout.direction === 'grid') {
    // 2x2 그리드: 상단 두 패널과 하단 두 패널로 구성
    const topPanels = splitLayout.panels.slice(0, 2);
    const bottomPanels = splitLayout.panels.slice(2, 4);

    return (
      <div ref={containerRef} className="flex-1 flex flex-col gap-1 p-1 bg-claude-bg">
        {/* 상단 행 */}
        <div className="flex gap-1" style={{ flex: '1 1 50%' }}>
          {topPanels.map((panel) => (
            <div key={panel.id} className="flex-1">
              <SplitPanel
                panelId={panel.id}
                terminalId={panel.terminalId}
                tabs={tabs}
                ratio={panel.ratio}
                isActive={activePanelId === panel.id}
                onSelectTerminal={handleSelectTerminal}
                onSwapTerminal={swapTerminals}
                onActivatePanel={handleActivatePanel}
                onCreateTerminal={onCreateTab}
                terminalRef={activePanelId === panel.id ? terminalRef : undefined}
              />
            </div>
          ))}
        </div>
        {/* 하단 행 */}
        <div className="flex gap-1" style={{ flex: '1 1 50%' }}>
          {bottomPanels.map((panel) => (
            <div key={panel.id} className="flex-1">
              <SplitPanel
                panelId={panel.id}
                terminalId={panel.terminalId}
                tabs={tabs}
                ratio={panel.ratio}
                isActive={activePanelId === panel.id}
                onSelectTerminal={handleSelectTerminal}
                onSwapTerminal={swapTerminals}
                onActivatePanel={handleActivatePanel}
                onCreateTerminal={onCreateTab}
                terminalRef={activePanelId === panel.id ? terminalRef : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render left-main layout (1 big + 2 small on right)
  if (splitLayout.layoutId === 'left-main') {
    // 기본 비율: 왼쪽 60%, 오른쪽 40% (오른쪽은 상하 균등 분할)
    const leftRatio = splitLayout.panels[0]?.ratio || 60;
    const rightRatio = 100 - leftRatio;

    return (
      <div ref={containerRef} className="flex-1 flex gap-1 p-1 bg-claude-bg">
        {/* 왼쪽 메인 패널 */}
        <div style={{ width: `${leftRatio}%`, flexShrink: 0 }}>
          <SplitPanel
            panelId={splitLayout.panels[0]?.id || 'panel-0'}
            terminalId={splitLayout.panels[0]?.terminalId || null}
            tabs={tabs}
            ratio={100}
            isActive={activePanelId === splitLayout.panels[0]?.id}
            onSelectTerminal={handleSelectTerminal}
            onSwapTerminal={swapTerminals}
            onActivatePanel={handleActivatePanel}
            onCreateTerminal={onCreateTab}
            terminalRef={activePanelId === splitLayout.panels[0]?.id ? terminalRef : undefined}
          />
        </div>
        <ResizeHandle direction="horizontal" panelIndex={0} onResize={handleResize} />
        {/* 오른쪽 패널들 (상하 분할) */}
        <div className="flex flex-col gap-1" style={{ width: `${rightRatio}%`, flexShrink: 0 }}>
          <div style={{ flex: '1 1 50%' }}>
            <SplitPanel
              panelId={splitLayout.panels[1]?.id || 'panel-1'}
              terminalId={splitLayout.panels[1]?.terminalId || null}
              tabs={tabs}
              ratio={100}
              isActive={activePanelId === splitLayout.panels[1]?.id}
              onSelectTerminal={handleSelectTerminal}
              onSwapTerminal={swapTerminals}
              onActivatePanel={handleActivatePanel}
              onCreateTerminal={onCreateTab}
              terminalRef={activePanelId === splitLayout.panels[1]?.id ? terminalRef : undefined}
            />
          </div>
          <ResizeHandle direction="vertical" panelIndex={1} onResize={handleResize} />
          <div style={{ flex: '1 1 50%' }}>
            <SplitPanel
              panelId={splitLayout.panels[2]?.id || 'panel-2'}
              terminalId={splitLayout.panels[2]?.terminalId || null}
              tabs={tabs}
              ratio={100}
              isActive={activePanelId === splitLayout.panels[2]?.id}
              onSelectTerminal={handleSelectTerminal}
              onSwapTerminal={swapTerminals}
              onActivatePanel={handleActivatePanel}
              onCreateTerminal={onCreateTab}
              terminalRef={activePanelId === splitLayout.panels[2]?.id ? terminalRef : undefined}
            />
          </div>
        </div>
      </div>
    );
  }

  // Render top-main layout (1 big + 2 small on bottom)
  if (splitLayout.layoutId === 'top-main') {
    // 기본 비율: 상단 60%, 하단 40% (하단은 좌우 균등 분할)
    const topRatio = splitLayout.panels[0]?.ratio || 60;
    const bottomRatio = 100 - topRatio;

    return (
      <div ref={containerRef} className="flex-1 flex flex-col gap-1 p-1 bg-claude-bg">
        {/* 상단 메인 패널 */}
        <div style={{ height: `${topRatio}%`, flexShrink: 0 }}>
          <SplitPanel
            panelId={splitLayout.panels[0]?.id || 'panel-0'}
            terminalId={splitLayout.panels[0]?.terminalId || null}
            tabs={tabs}
            ratio={100}
            isActive={activePanelId === splitLayout.panels[0]?.id}
            onSelectTerminal={handleSelectTerminal}
            onSwapTerminal={swapTerminals}
            onActivatePanel={handleActivatePanel}
            onCreateTerminal={onCreateTab}
            terminalRef={activePanelId === splitLayout.panels[0]?.id ? terminalRef : undefined}
          />
        </div>
        <ResizeHandle direction="vertical" panelIndex={0} onResize={handleResize} />
        {/* 하단 패널들 (좌우 분할) */}
        <div className="flex gap-1" style={{ height: `${bottomRatio}%`, flexShrink: 0 }}>
          <div style={{ flex: '1 1 50%' }}>
            <SplitPanel
              panelId={splitLayout.panels[1]?.id || 'panel-1'}
              terminalId={splitLayout.panels[1]?.terminalId || null}
              tabs={tabs}
              ratio={100}
              isActive={activePanelId === splitLayout.panels[1]?.id}
              onSelectTerminal={handleSelectTerminal}
              onSwapTerminal={swapTerminals}
              onActivatePanel={handleActivatePanel}
              onCreateTerminal={onCreateTab}
              terminalRef={activePanelId === splitLayout.panels[1]?.id ? terminalRef : undefined}
            />
          </div>
          <ResizeHandle direction="horizontal" panelIndex={1} onResize={handleResize} />
          <div style={{ flex: '1 1 50%' }}>
            <SplitPanel
              panelId={splitLayout.panels[2]?.id || 'panel-2'}
              terminalId={splitLayout.panels[2]?.terminalId || null}
              tabs={tabs}
              ratio={100}
              isActive={activePanelId === splitLayout.panels[2]?.id}
              onSelectTerminal={handleSelectTerminal}
              onSwapTerminal={swapTerminals}
              onActivatePanel={handleActivatePanel}
              onCreateTerminal={onCreateTab}
              terminalRef={activePanelId === splitLayout.panels[2]?.id ? terminalRef : undefined}
            />
          </div>
        </div>
      </div>
    );
  }

  // Render horizontal/vertical split layout
  const flexDirection = splitLayout.direction === 'horizontal' ? 'flex-row' : 'flex-col';

  return (
    <div ref={containerRef} className={`flex-1 flex ${flexDirection} gap-0 p-1 bg-claude-bg`}>
      {splitLayout.panels.map((panel, index) => (
        <div key={panel.id} className={`flex ${flexDirection} items-stretch`} style={{ flex: `${panel.ratio} 0 0` }}>
          <SplitPanel
            panelId={panel.id}
            terminalId={panel.terminalId}
            tabs={tabs}
            ratio={panel.ratio}
            isActive={activePanelId === panel.id}
            onSelectTerminal={handleSelectTerminal}
            onSwapTerminal={swapTerminals}
            onActivatePanel={handleActivatePanel}
            onCreateTerminal={onCreateTab}
            terminalRef={activePanelId === panel.id ? terminalRef : undefined}
          />
          {index < splitLayout.panels.length - 1 && (
            <ResizeHandle
              direction={splitLayout.direction as 'horizontal' | 'vertical'}
              panelIndex={index}
              onResize={handleResize}
            />
          )}
        </div>
      ))}
    </div>
  );
}
