import { type ReactNode } from 'react';
import {
  MessageSquare,
  Sparkles,
  StickyNote,
  FileText,
  Settings,
  Bot,
  Users,
  Globe,
  FolderTree,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

type SectionId = 'sessions' | 'agents' | 'skills' | 'notes' | 'templates' | 'remote' | 'files';

interface Section {
  id: SectionId;
  label: string;
  icon: ReactNode;
  description: string;
}

const sections: Section[] = [
  { id: 'sessions', label: 'Sessions', icon: <MessageSquare size={20} />, description: 'Conversation history' },
  { id: 'agents', label: 'Agents', icon: <Users size={20} />, description: 'Custom agents' },
  { id: 'skills', label: 'Skills', icon: <Sparkles size={20} />, description: 'Available skills' },
  { id: 'files', label: 'Files', icon: <FolderTree size={20} />, description: 'File explorer' },
  { id: 'notes', label: 'Notes', icon: <StickyNote size={20} />, description: 'Todo & Memo' },
  { id: 'templates', label: 'Prompts', icon: <FileText size={20} />, description: 'Prompt templates' },
  { id: 'remote', label: 'Remote', icon: <Globe size={20} />, description: 'Remote terminal access' },
];

export function Sidebar() {
  const { selectedSection, setSelectedSection } = useAppStore();

  return (
    <div className="flex flex-col h-full w-16 bg-claude-surface">
      {/* Logo */}
      <div className="flex items-center justify-center py-4 border-b border-claude-border">
        <Bot size={24} className="text-claude-accent" />
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col items-center py-2 gap-1">
        {sections.map((section) => (
          <button
            key={section.id}
            className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg transition-all group relative ${
              selectedSection === section.id
                ? 'bg-claude-accent text-white'
                : 'text-claude-text-secondary hover:text-claude-text hover:bg-claude-border'
            }`}
            onClick={() => setSelectedSection(
              selectedSection === section.id ? null : section.id
            )}
            title={section.label}
          >
            {section.icon}

            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-claude-surface border border-claude-border rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              <div className="text-xs font-medium text-claude-text">{section.label}</div>
              <div className="text-[10px] text-claude-text-secondary">{section.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center py-2 border-t border-claude-border">
        <button
          className="w-12 h-12 flex items-center justify-center rounded-lg text-claude-text-secondary hover:text-claude-text hover:bg-claude-border transition-colors"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}
