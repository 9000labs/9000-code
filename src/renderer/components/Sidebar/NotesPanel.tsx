import { useState } from 'react';
import { Plus, X, Check, Square, CheckSquare, FileText, ListTodo, Trash2 } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export function NotesPanel() {
  const {
    todos,
    memos,
    addTodo,
    removeTodo,
    toggleTodo,
    addMemo,
    removeMemo,
    updateMemo,
  } = useAppStore();

  const [newTodo, setNewTodo] = useState('');
  const [newMemo, setNewMemo] = useState('');
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editingMemoContent, setEditingMemoContent] = useState('');

  // Todo handlers
  const handleAddTodo = () => {
    if (newTodo.trim()) {
      addTodo(newTodo.trim());
      setNewTodo('');
    }
  };

  const handleTodoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    }
  };

  // Memo handlers
  const handleAddMemo = () => {
    if (newMemo.trim()) {
      addMemo(newMemo.trim());
      setNewMemo('');
    }
  };

  const handleMemoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddMemo();
    }
  };

  const handleStartEditMemo = (id: string, content: string) => {
    setEditingMemoId(id);
    setEditingMemoContent(content);
  };

  const handleSaveEditMemo = () => {
    if (editingMemoId && editingMemoContent.trim()) {
      updateMemo(editingMemoId, editingMemoContent.trim());
      setEditingMemoId(null);
      setEditingMemoContent('');
    }
  };

  const handleCancelEditMemo = () => {
    setEditingMemoId(null);
    setEditingMemoContent('');
  };

  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <div className="space-y-4 px-3">
      {/* Todo Section */}
      <div>
        <div className="flex items-center justify-between text-xs text-claude-text-secondary mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <ListTodo size={14} />
            <span>Todo</span>
          </span>
          <span>{completedCount}/{todos.length}</span>
        </div>

        {/* Add Todo Input */}
        <div className="flex items-center gap-1 mb-2">
          <input
            type="text"
            placeholder="Add todo..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={handleTodoKeyDown}
            className="flex-1 px-2 py-1.5 text-xs bg-claude-surface border border-claude-border rounded focus:border-claude-accent focus:outline-none"
          />
          <button
            onClick={handleAddTodo}
            disabled={!newTodo.trim()}
            className="p-1.5 text-claude-text-secondary hover:text-claude-accent hover:bg-claude-surface rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add todo"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Todo List */}
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {todos.length === 0 ? (
            <p className="text-xs text-claude-text-secondary/50 text-center py-2">
              No todos yet
            </p>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className={`group flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-claude-surface transition-colors ${
                  todo.completed ? 'text-claude-text-secondary line-through opacity-60' : ''
                }`}
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className="flex-shrink-0 text-claude-text-secondary hover:text-claude-accent"
                >
                  {todo.completed ? (
                    <CheckSquare size={14} className="text-claude-success" />
                  ) : (
                    <Square size={14} />
                  )}
                </button>
                <span className="flex-1 truncate">{todo.content}</span>
                <button
                  onClick={() => removeTodo(todo.id)}
                  className="flex-shrink-0 p-0.5 text-claude-text-secondary hover:text-claude-error opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete todo"
                >
                  <X size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-claude-border" />

      {/* Memo Section */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-claude-text-secondary mb-2 font-medium">
          <FileText size={14} />
          <span>Memo</span>
        </div>

        {/* Add Memo Input */}
        <div className="mb-2">
          <textarea
            placeholder="Add memo... (Ctrl+Enter to save)"
            value={newMemo}
            onChange={(e) => setNewMemo(e.target.value)}
            onKeyDown={handleMemoKeyDown}
            rows={2}
            className="w-full px-2 py-1.5 text-xs bg-claude-surface border border-claude-border rounded focus:border-claude-accent focus:outline-none resize-none"
          />
          <button
            onClick={handleAddMemo}
            disabled={!newMemo.trim()}
            className="mt-1 w-full py-1 text-xs bg-claude-accent text-white rounded hover:bg-claude-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Memo
          </button>
        </div>

        {/* Memo List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {memos.length === 0 ? (
            <p className="text-xs text-claude-text-secondary/50 text-center py-2">
              No memos yet
            </p>
          ) : (
            memos.map((memo) => (
              <div
                key={memo.id}
                className="group relative p-2 bg-claude-surface rounded border border-claude-border hover:border-claude-accent/50 transition-colors"
              >
                {editingMemoId === memo.id ? (
                  <div>
                    <textarea
                      value={editingMemoContent}
                      onChange={(e) => setEditingMemoContent(e.target.value)}
                      rows={3}
                      className="w-full px-2 py-1 text-xs bg-claude-bg border border-claude-border rounded focus:border-claude-accent focus:outline-none resize-none"
                      autoFocus
                    />
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        onClick={handleSaveEditMemo}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs bg-claude-accent text-white rounded hover:bg-claude-accent/90"
                      >
                        <Check size={10} />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEditMemo}
                        className="px-2 py-0.5 text-xs text-claude-text-secondary hover:text-claude-text"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      className="text-xs text-claude-text whitespace-pre-wrap cursor-pointer"
                      onClick={() => handleStartEditMemo(memo.id, memo.content)}
                    >
                      {memo.content}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-claude-text-secondary/50">
                        {new Date(memo.updatedAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => removeMemo(memo.id)}
                        className="p-0.5 text-claude-text-secondary hover:text-claude-error opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete memo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
