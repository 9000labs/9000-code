import { useState } from 'react';
import { Plus, X, Terminal, Rocket, Edit2, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export function FloatingCommandMenu() {
  const {
    quickCommands,
    launchCommands,
    sendToTerminal,
    addQuickCommand,
    removeQuickCommand,
    addLaunchCommand,
    removeLaunchCommand,
    updateLaunchCommand,
    resetLaunchCommands,
  } = useAppStore();

  // Menu expanded state
  const [isExpanded, setIsExpanded] = useState(false);

  // Quick command adding state
  const [isAddingQuick, setIsAddingQuick] = useState(false);
  const [newQuickLabel, setNewQuickLabel] = useState('');
  const [newQuickCommand, setNewQuickCommand] = useState('');

  // Launch command adding state
  const [isAddingLaunch, setIsAddingLaunch] = useState(false);
  const [newLaunchLabel, setNewLaunchLabel] = useState('');
  const [newLaunchCommand, setNewLaunchCommand] = useState('');
  const [newLaunchDescription, setNewLaunchDescription] = useState('');

  // Launch command editing state
  const [editingLaunchId, setEditingLaunchId] = useState<string | null>(null);
  const [editLaunchLabel, setEditLaunchLabel] = useState('');
  const [editLaunchCommand, setEditLaunchCommand] = useState('');
  const [editLaunchDescription, setEditLaunchDescription] = useState('');

  const handleCommandClick = (command: string) => {
    const cleanCmd = command.replace(/[\r\n]+$/, '');
    sendToTerminal(cleanCmd + '\r');
  };

  // Quick command handlers
  const handleAddQuickCommand = () => {
    if (newQuickLabel.trim() && newQuickCommand.trim()) {
      addQuickCommand(newQuickLabel.trim(), newQuickCommand.trim());
      setNewQuickLabel('');
      setNewQuickCommand('');
      setIsAddingQuick(false);
    }
  };

  const handleQuickKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddQuickCommand();
    } else if (e.key === 'Escape') {
      setIsAddingQuick(false);
      setNewQuickLabel('');
      setNewQuickCommand('');
    }
  };

  // Launch command handlers
  const handleAddLaunchCommand = () => {
    if (newLaunchLabel.trim() && newLaunchCommand.trim()) {
      addLaunchCommand(
        newLaunchLabel.trim(),
        newLaunchCommand.trim(),
        newLaunchDescription.trim() || newLaunchLabel.trim()
      );
      setNewLaunchLabel('');
      setNewLaunchCommand('');
      setNewLaunchDescription('');
      setIsAddingLaunch(false);
    }
  };

  const handleLaunchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddLaunchCommand();
    } else if (e.key === 'Escape') {
      setIsAddingLaunch(false);
      setNewLaunchLabel('');
      setNewLaunchCommand('');
      setNewLaunchDescription('');
    }
  };

  const startEditLaunch = (cmd: { id: string; label: string; command: string; description: string }) => {
    setEditingLaunchId(cmd.id);
    setEditLaunchLabel(cmd.label);
    setEditLaunchCommand(cmd.command.replace('\r', ''));
    setEditLaunchDescription(cmd.description);
  };

  const handleUpdateLaunchCommand = () => {
    if (editingLaunchId && editLaunchLabel.trim() && editLaunchCommand.trim()) {
      updateLaunchCommand(
        editingLaunchId,
        editLaunchLabel.trim(),
        editLaunchCommand.trim(),
        editLaunchDescription.trim() || editLaunchLabel.trim()
      );
      cancelEditLaunch();
    }
  };

  const cancelEditLaunch = () => {
    setEditingLaunchId(null);
    setEditLaunchLabel('');
    setEditLaunchCommand('');
    setEditLaunchDescription('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUpdateLaunchCommand();
    } else if (e.key === 'Escape') {
      cancelEditLaunch();
    }
  };

  // Collapsed view - just icons
  if (!isExpanded) {
    return (
      <div className="flex flex-col h-full bg-claude-surface border-r border-claude-border">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex flex-col items-center gap-3 p-2 hover:bg-claude-bg transition-colors"
          title="명령어 메뉴 열기"
        >
          <ChevronRight size={14} className="text-claude-text-secondary" />
          <div className="flex flex-col gap-2">
            <div className="p-1.5 rounded bg-claude-accent/10 text-claude-accent" title="Launch">
              <Rocket size={14} />
            </div>
            <div className="p-1.5 rounded bg-claude-bg text-claude-text-secondary" title="Quick">
              <Terminal size={14} />
            </div>
          </div>
        </button>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="flex flex-col h-full w-48 bg-claude-surface border-r border-claude-border overflow-hidden">
      {/* Header with close button */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-claude-border bg-claude-bg">
        <span className="text-xs font-medium text-claude-text">명령어</span>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 hover:bg-claude-border rounded transition-colors"
          title="접기"
        >
          <ChevronLeft size={14} className="text-claude-text-secondary" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Launch Commands Section */}
        <div className="border-b border-claude-border">
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-claude-accent/5">
            <Rocket size={12} className="text-claude-accent" />
            <span className="text-xs font-medium text-claude-accent">Launch</span>
            <div className="flex-1" />
            <button
              onClick={() => setIsAddingLaunch(true)}
              className="p-0.5 text-claude-text-secondary hover:text-claude-accent rounded transition-colors"
              title="추가"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={resetLaunchCommands}
              className="p-0.5 text-claude-text-secondary hover:text-claude-accent rounded transition-colors"
              title="초기화"
            >
              <RotateCcw size={10} />
            </button>
          </div>

          <div className="p-1.5 space-y-1">
            {launchCommands.map((cmd) =>
              editingLaunchId === cmd.id ? (
                <div key={cmd.id} className="p-1.5 bg-claude-bg rounded border border-claude-accent space-y-1">
                  <input
                    type="text"
                    placeholder="Label"
                    value={editLaunchLabel}
                    onChange={(e) => setEditLaunchLabel(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    className="w-full px-1.5 py-0.5 text-xs bg-claude-surface border border-claude-border rounded focus:outline-none focus:border-claude-accent"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Command"
                    value={editLaunchCommand}
                    onChange={(e) => setEditLaunchCommand(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    className="w-full px-1.5 py-0.5 text-xs font-mono bg-claude-surface border border-claude-border rounded focus:outline-none focus:border-claude-accent"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={editLaunchDescription}
                    onChange={(e) => setEditLaunchDescription(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    className="w-full px-1.5 py-0.5 text-xs bg-claude-surface border border-claude-border rounded focus:outline-none focus:border-claude-accent"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={handleUpdateLaunchCommand}
                      disabled={!editLaunchLabel.trim() || !editLaunchCommand.trim()}
                      className="flex-1 px-1.5 py-0.5 text-xs bg-claude-accent text-white rounded disabled:opacity-50"
                    >
                      저장
                    </button>
                    <button
                      onClick={cancelEditLaunch}
                      className="px-1.5 py-0.5 text-xs text-claude-text-secondary hover:text-claude-text"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div key={cmd.id} className="group relative">
                  <button
                    onClick={() => handleCommandClick(cmd.command)}
                    className="w-full px-2 py-1.5 text-left text-xs font-mono bg-claude-accent/10 hover:bg-claude-accent hover:text-white text-claude-accent rounded border border-claude-accent/30 transition-colors truncate"
                    title={cmd.description}
                  >
                    {cmd.label}
                  </button>
                  <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditLaunch(cmd)}
                      className="w-4 h-4 bg-blue-500 text-white rounded flex items-center justify-center"
                      title="편집"
                    >
                      <Edit2 size={8} />
                    </button>
                    <button
                      onClick={() => removeLaunchCommand(cmd.id)}
                      className="w-4 h-4 bg-red-500 text-white rounded flex items-center justify-center"
                      title="삭제"
                    >
                      <X size={8} />
                    </button>
                  </div>
                </div>
              )
            )}

            {isAddingLaunch && (
              <div className="p-1.5 bg-claude-bg rounded border border-claude-border space-y-1">
                <input
                  type="text"
                  placeholder="Label"
                  value={newLaunchLabel}
                  onChange={(e) => setNewLaunchLabel(e.target.value)}
                  onKeyDown={handleLaunchKeyDown}
                  className="w-full px-1.5 py-0.5 text-xs bg-claude-surface border border-claude-border rounded focus:outline-none focus:border-claude-accent"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Command"
                  value={newLaunchCommand}
                  onChange={(e) => setNewLaunchCommand(e.target.value)}
                  onKeyDown={handleLaunchKeyDown}
                  className="w-full px-1.5 py-0.5 text-xs font-mono bg-claude-surface border border-claude-border rounded focus:outline-none focus:border-claude-accent"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newLaunchDescription}
                  onChange={(e) => setNewLaunchDescription(e.target.value)}
                  onKeyDown={handleLaunchKeyDown}
                  className="w-full px-1.5 py-0.5 text-xs bg-claude-surface border border-claude-border rounded focus:outline-none focus:border-claude-accent"
                />
                <div className="flex gap-1">
                  <button
                    onClick={handleAddLaunchCommand}
                    disabled={!newLaunchLabel.trim() || !newLaunchCommand.trim()}
                    className="flex-1 px-1.5 py-0.5 text-xs bg-claude-accent text-white rounded disabled:opacity-50"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingLaunch(false);
                      setNewLaunchLabel('');
                      setNewLaunchCommand('');
                      setNewLaunchDescription('');
                    }}
                    className="px-1.5 py-0.5 text-xs text-claude-text-secondary hover:text-claude-text"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Commands Section */}
        <div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-claude-bg/50">
            <Terminal size={12} className="text-claude-text-secondary" />
            <span className="text-xs font-medium text-claude-text-secondary">Quick</span>
            <div className="flex-1" />
            <button
              onClick={() => setIsAddingQuick(true)}
              className="p-0.5 text-claude-text-secondary hover:text-claude-accent rounded transition-colors"
              title="추가"
            >
              <Plus size={12} />
            </button>
          </div>

          <div className="p-1.5 space-y-1">
            {quickCommands.map((cmd) => (
              <div key={cmd.id} className="group relative">
                <button
                  onClick={() => handleCommandClick(cmd.command)}
                  className="w-full px-2 py-1.5 text-left text-xs font-mono bg-claude-bg hover:bg-claude-accent hover:text-white rounded border border-claude-border transition-colors truncate"
                  title={`Send: ${cmd.command.replace('\r', '')}`}
                >
                  {cmd.label}
                </button>
                <button
                  onClick={() => removeQuickCommand(cmd.id)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  title="삭제"
                >
                  <X size={8} />
                </button>
              </div>
            ))}

            {isAddingQuick && (
              <div className="p-1.5 bg-claude-bg rounded border border-claude-border space-y-1">
                <input
                  type="text"
                  placeholder="Label"
                  value={newQuickLabel}
                  onChange={(e) => setNewQuickLabel(e.target.value)}
                  onKeyDown={handleQuickKeyDown}
                  className="w-full px-1.5 py-0.5 text-xs bg-claude-surface border border-claude-border rounded focus:outline-none focus:border-claude-accent"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Command"
                  value={newQuickCommand}
                  onChange={(e) => setNewQuickCommand(e.target.value)}
                  onKeyDown={handleQuickKeyDown}
                  className="w-full px-1.5 py-0.5 text-xs font-mono bg-claude-surface border border-claude-border rounded focus:outline-none focus:border-claude-accent"
                />
                <div className="flex gap-1">
                  <button
                    onClick={handleAddQuickCommand}
                    disabled={!newQuickLabel.trim() || !newQuickCommand.trim()}
                    className="flex-1 px-1.5 py-0.5 text-xs bg-claude-accent text-white rounded disabled:opacity-50"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingQuick(false);
                      setNewQuickLabel('');
                      setNewQuickCommand('');
                    }}
                    className="px-1.5 py-0.5 text-xs text-claude-text-secondary hover:text-claude-text"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
