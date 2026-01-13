import { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { DetailPanel } from './components/DetailPanel';
import { TerminalPanel } from './components/Terminal/TerminalPanel';
import { ResizeHandle } from './components/ResizeHandle';
import { Notifications } from './components/Notifications';
import { useAppStore } from './stores/appStore';

function App() {
  const { selectedSection } = useAppStore();
  const [detailPanelWidth, setDetailPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleResize = useCallback((deltaX: number) => {
    setDetailPanelWidth((prev) => {
      const newWidth = prev + deltaX;
      return Math.max(240, Math.min(500, newWidth));
    });
  }, []);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  return (
    <div className="flex h-screen bg-claude-bg text-claude-text overflow-hidden">
      {/* Left Sidebar - Icon Navigation */}
      <aside className="flex-shrink-0 border-r border-claude-border">
        <Sidebar />
      </aside>

      {/* Detail Panel - Shows content based on selection */}
      {selectedSection && (
        <>
          <aside
            className="flex-shrink-0 border-r border-claude-border overflow-hidden"
            style={{ width: detailPanelWidth }}
          >
            <DetailPanel />
          </aside>

          {/* Resize Handle */}
          <ResizeHandle
            onResizeStart={handleResizeStart}
            onResize={handleResize}
            onResizeEnd={handleResizeEnd}
            isResizing={isResizing}
          />
        </>
      )}

      {/* Main Content - Terminal */}
      <main className="flex-1 flex flex-col min-w-0">
        <TerminalPanel />
      </main>

      {/* Notifications */}
      <Notifications />
    </div>
  );
}

export default App;
