import { useState } from 'react';
import { Plus, X, Terminal, Rocket, Edit2, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export function QuickCommands() {
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
    // Remove any existing line ending and add \r for execution
    // xterm.js sends \r when Enter key is pressed
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

  return (
    <div className="flex flex-col border-b border-claude-border">
      {/* Launch Commands - Claude CLI starters */}
      <div className="flex items-center gap-2 px-3 py-2 bg-claude-surface/80 border-b border-claude-border/50 overflow-x-auto">
        <div className="flex items-center gap-1.5 text-claude-accent shrink-0">
          <Rocket size={14} />
          <span className="text-xs font-medium">Launch</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {launchCommands.map((cmd) => (
            editingLaunchId === cmd.id ? (
              <div key={cmd.id} className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Label"
                  value={editLaunchLabel}
                  onChange={(e) => setEditLaunchLabel(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="w-20 px-2 py-1 text-xs bg-claude-bg border border-claude-accent rounded focus:outline-none"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Command"
                  value={editLaunchCommand}
                  onChange={(e) => setEditLaunchCommand(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="w-32 px-2 py-1 text-xs font-mono bg-claude-bg border border-claude-accent rounded focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={editLaunchDescription}
                  onChange={(e) => setEditLaunchDescription(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="w-24 px-2 py-1 text-xs bg-claude-bg border border-claude-accent rounded focus:outline-none"
                />
                <button
                  onClick={handleUpdateLaunchCommand}
                  disabled={!editLaunchLabel.trim() || !editLaunchCommand.trim()}
                  className="px-2 py-1 text-xs bg-claude-accent text-white rounded disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={cancelEditLaunch}
                  className="px-2 py-1 text-xs text-claude-text-secondary hover:text-claude-text"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div key={cmd.id} className="group relative">
                <button
                  onClick={() => handleCommandClick(cmd.command)}
                  className="px-2.5 py-1 text-xs font-mono bg-claude-accent/10 hover:bg-claude-accent hover:text-white text-claude-accent rounded border border-claude-accent/30 transition-colors"
                  title={cmd.description}
                >
                  {cmd.label}
                </button>
                <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditLaunch(cmd)}
                    className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center"
                    title="Edit command"
                  >
                    <Edit2 size={8} />
                  </button>
                  <button
                    onClick={() => removeLaunchCommand(cmd.id)}
                    className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"
                    title="Remove command"
                  >
                    <X size={10} />
                  </button>
                </div>
              </div>
            )
          ))}

          {isAddingLaunch ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Label"
                value={newLaunchLabel}
                onChange={(e) => setNewLaunchLabel(e.target.value)}
                onKeyDown={handleLaunchKeyDown}
                className="w-20 px-2 py-1 text-xs bg-claude-bg border border-claude-border rounded focus:border-claude-accent focus:outline-none"
                autoFocus
              />
              <input
                type="text"
                placeholder="Command"
                value={newLaunchCommand}
                onChange={(e) => setNewLaunchCommand(e.target.value)}
                onKeyDown={handleLaunchKeyDown}
                className="w-32 px-2 py-1 text-xs font-mono bg-claude-bg border border-claude-border rounded focus:border-claude-accent focus:outline-none"
              />
              <input
                type="text"
                placeholder="Description"
                value={newLaunchDescription}
                onChange={(e) => setNewLaunchDescription(e.target.value)}
                onKeyDown={handleLaunchKeyDown}
                className="w-24 px-2 py-1 text-xs bg-claude-bg border border-claude-border rounded focus:border-claude-accent focus:outline-none"
              />
              <button
                onClick={handleAddLaunchCommand}
                disabled={!newLaunchLabel.trim() || !newLaunchCommand.trim()}
                className="px-2 py-1 text-xs bg-claude-accent text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingLaunch(false);
                  setNewLaunchLabel('');
                  setNewLaunchCommand('');
                  setNewLaunchDescription('');
                }}
                className="px-2 py-1 text-xs text-claude-text-secondary hover:text-claude-text"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsAddingLaunch(true)}
                className="p-1 text-claude-text-secondary hover:text-claude-accent hover:bg-claude-bg rounded transition-colors"
                title="Add new launch command"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={resetLaunchCommands}
                className="p-1 text-claude-text-secondary hover:text-claude-accent hover:bg-claude-bg rounded transition-colors"
                title="Reset to defaults"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Commands - Slash commands */}
      <div className="flex items-center gap-2 px-3 py-2 bg-claude-surface overflow-x-auto">
        <div className="flex items-center gap-1.5 text-claude-text-secondary shrink-0">
          <Terminal size={14} />
          <span className="text-xs font-medium">Quick</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {quickCommands.map((cmd) => (
          <div key={cmd.id} className="group relative">
            <button
              onClick={() => handleCommandClick(cmd.command)}
              className="px-2.5 py-1 text-xs font-mono bg-claude-bg hover:bg-claude-accent hover:text-white rounded border border-claude-border transition-colors"
              title={`Send: ${cmd.command.replace('\r', '')}`}
            >
              {cmd.label}
            </button>
            <button
              onClick={() => removeQuickCommand(cmd.id)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              title="Remove command"
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {isAddingQuick ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Label"
              value={newQuickLabel}
              onChange={(e) => setNewQuickLabel(e.target.value)}
              onKeyDown={handleQuickKeyDown}
              className="w-16 px-2 py-1 text-xs bg-claude-bg border border-claude-border rounded focus:border-claude-accent focus:outline-none"
              autoFocus
            />
            <input
              type="text"
              placeholder="Command"
              value={newQuickCommand}
              onChange={(e) => setNewQuickCommand(e.target.value)}
              onKeyDown={handleQuickKeyDown}
              className="w-24 px-2 py-1 text-xs font-mono bg-claude-bg border border-claude-border rounded focus:border-claude-accent focus:outline-none"
            />
            <button
              onClick={handleAddQuickCommand}
              disabled={!newQuickLabel.trim() || !newQuickCommand.trim()}
              className="px-2 py-1 text-xs bg-claude-accent text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAddingQuick(false);
                setNewQuickLabel('');
                setNewQuickCommand('');
              }}
              className="px-2 py-1 text-xs text-claude-text-secondary hover:text-claude-text"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingQuick(true)}
            className="p-1 text-claude-text-secondary hover:text-claude-accent hover:bg-claude-bg rounded transition-colors"
            title="Add new command"
          >
            <Plus size={14} />
          </button>
        )}
        </div>
      </div>
    </div>
  );
}
