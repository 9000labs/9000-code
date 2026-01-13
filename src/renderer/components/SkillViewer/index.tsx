import { useState, useEffect } from 'react';
import { Save, X, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import type { SkillFile } from '../../types/electron';

export function SkillViewer() {
  const { selectedSkill, setSelectedSkill, addNotification } = useAppStore();
  const [skillData, setSkillData] = useState<SkillFile | null>(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load skill content when selectedSkill changes
  useEffect(() => {
    if (!selectedSkill) {
      setSkillData(null);
      setContent('');
      setHasChanges(false);
      setError(null);
      return;
    }

    const loadSkill = async () => {
      if (!window.electronAPI?.skills) {
        setError('Skills API not available');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const skill = await window.electronAPI.skills.read(selectedSkill);
        if (skill) {
          setSkillData(skill);
          setContent(skill.content);
          setHasChanges(false);
        } else {
          setError(`Skill "${selectedSkill}" not found`);
        }
      } catch (err) {
        setError(`Failed to load skill: ${err}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadSkill();
  }, [selectedSkill]);

  // Handle content change
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== skillData?.content);
  };

  // Save skill content
  const handleSave = async () => {
    if (!selectedSkill || !window.electronAPI?.skills) return;

    setIsSaving(true);

    try {
      const result = await window.electronAPI.skills.write(selectedSkill, content);
      if (result.success) {
        setHasChanges(false);
        if (skillData) {
          setSkillData({ ...skillData, content });
        }
        addNotification(`Skill "${skillData?.name || selectedSkill}" saved successfully`, 'success');
      } else {
        addNotification(`Failed to save: ${result.error}`, 'error');
      }
    } catch (err) {
      addNotification(`Failed to save skill: ${err}`, 'error');
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
    setSelectedSkill(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && selectedSkill) {
        e.preventDefault();
        handleSave();
      }
      // Escape to close
      if (e.key === 'Escape' && selectedSkill) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSkill, hasChanges, content]);

  if (!selectedSkill) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-claude-bg">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-claude-text-secondary">
            <Loader2 className="animate-spin" size={20} />
            <span>Loading skill...</span>
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
            <FileText size={16} className="text-claude-accent" />
            <span className="font-semibold text-sm">{selectedSkill}</span>
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
          <FileText size={16} className="text-claude-accent flex-shrink-0" />
          <span className="font-semibold text-sm truncate">{skillData?.name || selectedSkill}</span>
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
          <span className="font-mono text-claude-accent">{skillData?.command}</span>
          {skillData?.description && (
            <span className="truncate">{skillData.description}</span>
          )}
        </div>
        {skillData?.filePath && (
          <div className="text-xs text-claude-text-secondary/50 mt-1 truncate font-mono">
            {skillData.filePath}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="w-full h-full p-4 bg-claude-bg text-claude-text font-mono text-sm resize-none focus:outline-none"
          placeholder="Enter skill markdown content..."
          spellCheck={false}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-claude-surface/50 border-t border-claude-border text-xs text-claude-text-secondary">
        <span>
          {content.split('\n').length} lines, {content.length} chars
        </span>
        <span className="text-claude-text-secondary/50">
          Ctrl+S to save • Esc to close
        </span>
      </div>
    </div>
  );
}
