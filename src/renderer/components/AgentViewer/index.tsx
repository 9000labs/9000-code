import { useState, useEffect } from 'react';
import { Save, X, Users, Loader2, AlertCircle, Globe, Folder } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import type { AgentFile } from '../../types/electron';

export function AgentViewer() {
  const { selectedAgent, setSelectedAgent, addNotification } = useAppStore();
  const [agentData, setAgentData] = useState<AgentFile | null>(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load agent content when selectedAgent changes
  useEffect(() => {
    if (!selectedAgent) {
      setAgentData(null);
      setContent('');
      setHasChanges(false);
      setError(null);
      return;
    }

    const loadAgent = async () => {
      if (!window.electronAPI?.agents) {
        setError('Agents API not available');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const agent = await window.electronAPI.agents.read(selectedAgent);
        if (agent) {
          setAgentData(agent);
          setContent(agent.content);
          setHasChanges(false);
        } else {
          setError(`Agent not found at "${selectedAgent}"`);
        }
      } catch (err) {
        setError(`Failed to load agent: ${err}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadAgent();
  }, [selectedAgent]);

  // Handle content change
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== agentData?.content);
  };

  // Save agent content
  const handleSave = async () => {
    if (!selectedAgent || !window.electronAPI?.agents) return;

    setIsSaving(true);

    try {
      const result = await window.electronAPI.agents.write(selectedAgent, content);
      if (result.success) {
        setHasChanges(false);
        if (agentData) {
          setAgentData({ ...agentData, content });
        }
        addNotification(`Agent "${agentData?.name || 'Unknown'}" saved successfully`, 'success');
      } else {
        addNotification(`Failed to save: ${result.error}`, 'error');
      }
    } catch (err) {
      addNotification(`Failed to save agent: ${err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Close viewer
  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    setSelectedAgent(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && selectedAgent) {
        e.preventDefault();
        handleSave();
      }
      // Escape to close
      if (e.key === 'Escape' && selectedAgent) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAgent, hasChanges, content]);

  if (!selectedAgent) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-claude-bg">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-claude-text-secondary">
            <Loader2 className="animate-spin" size={20} />
            <span>Loading agent...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col bg-claude-bg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-claude-border">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-400" />
            <span className="font-semibold text-sm truncate">{selectedAgent.split('/').pop()}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-claude-text-secondary hover:text-claude-text hover:bg-claude-surface rounded transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-claude-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-border">
        <div className="flex items-center gap-2 min-w-0">
          <Users size={16} className="text-blue-400 flex-shrink-0" />
          <span className="font-semibold text-sm truncate">{agentData?.name || 'Agent'}</span>
          {hasChanges && (
            <span className="text-xs text-claude-accent bg-claude-accent/10 px-1.5 py-0.5 rounded">
              Modified
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
              hasChanges
                ? 'bg-claude-accent text-white hover:bg-claude-accent/90'
                : 'bg-claude-surface text-claude-text-secondary cursor-not-allowed'
            }`}
            title="Save (Ctrl+S)"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>Save</span>
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 text-claude-text-secondary hover:text-claude-text hover:bg-claude-surface rounded transition-colors"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="px-4 py-2 bg-claude-surface/50 border-b border-claude-border">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-claude-text-secondary">
          <span className="flex items-center gap-1">
            {agentData?.isGlobal ? (
              <>
                <Globe size={12} className="text-blue-400" />
                <span className="text-blue-400">Global Agent</span>
              </>
            ) : (
              <>
                <Folder size={12} className="text-green-400" />
                <span className="text-green-400">Project Agent</span>
              </>
            )}
          </span>
          {agentData?.description && (
            <span className="truncate">{agentData.description}</span>
          )}
        </div>
        {agentData?.filePath && (
          <div className="text-xs text-claude-text-secondary/50 mt-1 truncate font-mono">
            {agentData.filePath}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="w-full h-full p-4 bg-claude-bg text-claude-text font-mono text-sm resize-none focus:outline-none"
          placeholder="Enter agent markdown content..."
          spellCheck={false}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-claude-surface/50 border-t border-claude-border text-xs text-claude-text-secondary">
        <span>
          {content.split('\n').length} lines, {content.length} chars
        </span>
        <span className="text-claude-text-secondary/50">
          Ctrl+S to save / Esc to close
        </span>
      </div>
    </div>
  );
}
