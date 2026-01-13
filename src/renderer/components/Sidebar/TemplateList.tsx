import React, { useState } from 'react';
import { FileText, Plus, Star, Copy, Check, Trash2, Edit2, Send } from 'lucide-react';
import { useAppStore, type Template } from '../../stores/appStore';

interface TemplateListProps {
  searchQuery: string;
}

export function TemplateList({ searchQuery }: TemplateListProps) {
  const {
    templates,
    sendToTerminal,
    addTemplate,
    removeTemplate,
    updateTemplate,
    useTemplate,
    toggleTemplateFavorite,
    addNotification
  } = useAppStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort by favorites first, then by usage count
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.usageCount - a.usageCount;
  });

  const handleCreateTemplate = () => {
    if (newName.trim() && newContent.trim()) {
      addTemplate({
        name: newName.trim(),
        content: newContent.trim(),
        category: 'personal',
        isFavorite: false,
      });
      setNewName('');
      setNewContent('');
      setIsCreating(false);
      addNotification('Template created', 'success');
    }
  };

  const handleUseTemplate = (template: Template) => {
    sendToTerminal(template.content);
    useTemplate(template.id);
    addNotification(`Sent to terminal`, 'success');
  };

  const handleCopyTemplate = async (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(template.content);
      setCopiedId(template.id);
      addNotification('Copied to clipboard', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      addNotification('Failed to copy', 'error');
    }
  };

  const handleDeleteTemplate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeTemplate(id);
    addNotification('Template deleted', 'info');
  };

  const handleStartEdit = (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    setEditingId(template.id);
    setEditName(template.name);
    setEditContent(template.content);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim() && editContent.trim()) {
      updateTemplate(editingId, editName.trim(), editContent.trim());
      setEditingId(null);
      addNotification('Template updated', 'success');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditContent('');
  };

  const handleFavoriteClick = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    toggleTemplateFavorite(templateId);
  };

  return (
    <div className="space-y-3 px-3">
      {/* Create Template Button / Form */}
      {isCreating ? (
        <div className="p-3 bg-claude-surface rounded-lg border border-claude-border space-y-2">
          <input
            type="text"
            placeholder="Template name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-2 py-1.5 text-sm bg-claude-bg border border-claude-border rounded focus:border-claude-accent focus:outline-none"
            autoFocus
          />
          <textarea
            placeholder="Prompt content..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={4}
            className="w-full px-2 py-1.5 text-sm bg-claude-bg border border-claude-border rounded focus:border-claude-accent focus:outline-none resize-none font-mono"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateTemplate}
              disabled={!newName.trim() || !newContent.trim()}
              className="flex-1 py-1.5 text-sm bg-claude-accent text-white rounded hover:bg-claude-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewName('');
                setNewContent('');
              }}
              className="px-3 py-1.5 text-sm text-claude-text-secondary hover:text-claude-text"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-claude-text-secondary hover:text-claude-accent border border-dashed border-claude-border hover:border-claude-accent rounded-lg transition-colors"
        >
          <Plus size={16} />
          <span>New Template</span>
        </button>
      )}

      {/* Template List */}
      <div className="space-y-2">
        {sortedTemplates.length === 0 && !isCreating && (
          <div className="text-center py-6 text-sm text-claude-text-secondary">
            <FileText size={24} className="mx-auto mb-2 opacity-50" />
            <p>No templates yet</p>
            <p className="text-xs mt-1">Create your first prompt template</p>
          </div>
        )}

        {sortedTemplates.map((template) => (
          <div
            key={template.id}
            className="group p-3 bg-claude-surface rounded-lg border border-claude-border hover:border-claude-accent/50 transition-colors"
          >
            {editingId === template.id ? (
              // Edit Mode
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2 py-1 text-sm bg-claude-bg border border-claude-border rounded focus:border-claude-accent focus:outline-none"
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full px-2 py-1 text-sm bg-claude-bg border border-claude-border rounded focus:border-claude-accent focus:outline-none resize-none font-mono"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-claude-accent text-white rounded hover:bg-claude-accent/90"
                  >
                    <Check size={12} />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-2 py-1 text-xs text-claude-text-secondary hover:text-claude-text"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={(e) => handleFavoriteClick(e, template.id)}
                      className={`flex-shrink-0 ${
                        template.isFavorite ? 'text-yellow-500' : 'text-claude-text-secondary hover:text-yellow-500'
                      }`}
                    >
                      <Star size={14} className={template.isFavorite ? 'fill-current' : ''} />
                    </button>
                    <span className="font-medium text-sm truncate">{template.name}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleStartEdit(e, template)}
                      className="p-1 text-claude-text-secondary hover:text-claude-accent rounded"
                      title="Edit"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => handleCopyTemplate(e, template)}
                      className="p-1 text-claude-text-secondary hover:text-claude-accent rounded"
                      title="Copy"
                    >
                      {copiedId === template.id ? (
                        <Check size={12} className="text-green-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDeleteTemplate(e, template.id)}
                      className="p-1 text-claude-text-secondary hover:text-claude-error rounded"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Content Preview */}
                <pre className="text-xs text-claude-text-secondary whitespace-pre-wrap font-mono bg-claude-bg p-2 rounded max-h-20 overflow-y-auto mb-2">
                  {template.content}
                </pre>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-claude-text-secondary/50">
                    Used {template.usageCount} times
                  </span>
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-claude-accent text-white rounded hover:bg-claude-accent/90"
                  >
                    <Send size={10} />
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
