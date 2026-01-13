import { Search, X, Lock } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { SessionList } from '../Sidebar/SessionList';
import { SkillList } from '../Sidebar/SkillList';
import { AgentList } from '../Sidebar/AgentList';
import { NotesPanel } from '../Sidebar/NotesPanel';
import { TemplateList } from '../Sidebar/TemplateList';
import { RemoteAccessPanel } from '../Sidebar/RemoteAccessPanel';
import { FileTree } from '../Sidebar/FileTree';
import { SkillViewer } from '../SkillViewer';
import { AgentViewer } from '../AgentViewer';
import { SessionViewer } from '../SessionViewer';
import { FileViewer } from '../FileViewer';
import { isFeatureAvailable } from '../../../shared/license';

const sectionTitles: Record<string, string> = {
  sessions: 'Sessions',
  agents: 'Agents',
  skills: 'Skills',
  files: 'Files',
  notes: 'Notes',
  templates: 'Prompt Templates',
  remote: 'Remote Access',
};

export function DetailPanel() {
  const {
    selectedSection,
    setSelectedSection,
    searchQuery,
    setSearchQuery,
    selectedSkill,
    setSelectedSkill,
    selectedAgent,
    setSelectedAgent,
    selectedSessionId,
    setSelectedSession,
    fileViewer,
    closeFileViewer,
  } = useAppStore();

  if (!selectedSection) {
    return (
      <div className="h-full flex items-center justify-center text-claude-text-secondary">
        <p className="text-sm">Select a section from the sidebar</p>
      </div>
    );
  }

  // If a skill is selected, show the SkillViewer
  if (selectedSection === 'skills' && selectedSkill) {
    return <SkillViewer />;
  }

  // If an agent is selected, show the AgentViewer
  if (selectedSection === 'agents' && selectedAgent) {
    return <AgentViewer />;
  }

  // If a session is selected, show the SessionViewer
  if (selectedSection === 'sessions' && selectedSessionId) {
    return <SessionViewer />;
  }

  // If viewing a file, show the FileViewer
  if (selectedSection === 'files' && fileViewer.filePath) {
    return <FileViewer />;
  }

  const renderContent = () => {
    switch (selectedSection) {
      case 'sessions':
        return <SessionList searchQuery={searchQuery} />;
      case 'agents':
        return <AgentList searchQuery={searchQuery} />;
      case 'skills':
        return <SkillList searchQuery={searchQuery} />;
      case 'files':
        return <FileTree />;
      case 'notes':
        return <NotesPanel />;
      case 'templates':
        return <TemplateList searchQuery={searchQuery} />;
      case 'remote':
        return <RemoteAccessPanel />;
      default:
        return null;
    }
  };

  // Handle closing the panel
  const handleClose = () => {
    // Clear selected skill if any
    if (selectedSkill) {
      setSelectedSkill(null);
    }
    // Clear selected agent if any
    if (selectedAgent) {
      setSelectedAgent(null);
    }
    // Clear selected session if any
    if (selectedSessionId) {
      setSelectedSession(null);
    }
    // Clear file viewer if any
    if (fileViewer.filePath) {
      closeFileViewer();
    }
    setSelectedSection(null);
  };

  return (
    <div className="h-full flex flex-col bg-claude-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-border">
        <h2 className="font-semibold text-sm">{sectionTitles[selectedSection]}</h2>
        <button
          onClick={handleClose}
          className="p-1 text-claude-text-secondary hover:text-claude-text hover:bg-claude-surface rounded transition-colors"
          title="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search - for sessions, skills, templates (not for notes, files, and remote) */}
      {selectedSection !== 'notes' && selectedSection !== 'remote' && selectedSection !== 'files' && (
        <div className="px-3 py-2 border-b border-claude-border">
          {isFeatureAvailable('searchEnabled') ? (
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-claude-text-secondary"
              />
              <input
                type="text"
                placeholder={`Search ${sectionTitles[selectedSection].toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-9 py-1.5 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-claude-text-secondary hover:text-claude-text"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ) : (
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-claude-text-secondary/50"
              />
              <input
                type="text"
                placeholder="검색 기능은 Pro Edition에서 사용 가능합니다"
                disabled
                className="input w-full pl-9 py-1.5 text-sm bg-claude-surface/50 text-claude-text-secondary/50 cursor-not-allowed"
              />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}
