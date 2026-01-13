import { useState, useEffect } from 'react';
import { Users, Star, ChevronDown, ChevronRight, Loader2, Eye, Globe, Folder } from 'lucide-react';
import { useAppStore, type Agent } from '../../stores/appStore';

interface AgentListProps {
  searchQuery: string;
}

export function AgentList({ searchQuery }: AgentListProps) {
  const {
    agents,
    isLoadingAgents,
    toggleAgentFavorite,
    loadAgents,
    setSelectedAgent,
  } = useAppStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['global', 'project']));
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  // Load agents on mount
  useEffect(() => {
    console.log('[AgentList] Loading agents...');
    loadAgents();
  }, [loadAgents]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteAgents = filteredAgents.filter((a) => a.isFavorite);
  const globalAgents = filteredAgents.filter((a) => a.isGlobal && !a.isFavorite);
  const projectAgents = filteredAgents.filter((a) => !a.isGlobal && !a.isFavorite);

  // Open agent in viewer
  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent.filePath);
  };

  const handleFavoriteClick = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    toggleAgentFavorite(agentId);
  };

  const AgentItem = ({ agent }: { agent: Agent }) => (
    <div
      className="sidebar-item w-full group relative cursor-pointer"
      onClick={() => handleAgentClick(agent)}
      onMouseEnter={() => setHoveredAgent(agent.id)}
      onMouseLeave={() => setHoveredAgent(null)}
    >
      <Users size={14} className="text-blue-400 flex-shrink-0" />
      <div className="flex-1 min-w-0 text-left">
        <div className="text-sm truncate">{agent.name}</div>
      </div>

      {/* Scope indicator */}
      <div className="flex items-center gap-0.5">
        <span title={agent.isGlobal ? "Global agent" : "Project agent"}>
          {agent.isGlobal ? (
            <Globe size={10} className="text-claude-text-secondary/50" />
          ) : (
            <Folder size={10} className="text-claude-text-secondary/50" />
          )}
        </span>

        {/* Favorite button */}
        <button
          className={`p-1 rounded transition-all ${
            agent.isFavorite
              ? 'text-claude-accent opacity-100'
              : 'text-claude-text-secondary opacity-0 group-hover:opacity-100 hover:text-claude-accent'
          }`}
          onClick={(e) => handleFavoriteClick(e, agent.id)}
          title={agent.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={12} className={agent.isFavorite ? 'fill-current' : ''} />
        </button>
      </div>

      {/* Tooltip */}
      {hoveredAgent === agent.id && (
        <div className="absolute left-full ml-2 top-0 z-50 w-64 p-3 bg-claude-surface border border-claude-border rounded-lg shadow-lg pointer-events-none">
          <div className="font-medium text-sm mb-1">{agent.name}</div>
          <div className="text-xs text-blue-400 mb-2 flex items-center gap-1">
            {agent.isGlobal ? <Globe size={10} /> : <Folder size={10} />}
            <span>{agent.isGlobal ? 'Global' : 'Project'}</span>
          </div>
          {agent.description && (
            <div className="text-xs text-claude-text-secondary line-clamp-3">{agent.description}</div>
          )}
          <div className="text-xs text-claude-text-secondary/50 mt-2 italic flex items-center gap-1">
            <Eye size={10} />
            <span>Click to view/edit</span>
          </div>
        </div>
      )}
    </div>
  );

  if (isLoadingAgents) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-claude-text-secondary">
          <Loader2 className="animate-spin" size={16} />
          <span className="text-sm">Loading agents...</span>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-sm text-claude-text-secondary">
        <p>No agents found</p>
        <p className="text-xs mt-1 text-claude-text-secondary/50">
          Agents are loaded from ~/.claude/agents/
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Favorites */}
      {favoriteAgents.length > 0 && (
        <div className="px-2">
          <div className="text-xs text-claude-text-secondary px-3 py-1 flex items-center gap-1">
            <Star size={10} className="fill-current" />
            <span>Favorites</span>
          </div>
          {favoriteAgents.map((agent) => (
            <AgentItem key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      {/* Global Agents */}
      {globalAgents.length > 0 && (
        <div className="px-2">
          <button
            className="text-xs text-claude-text-secondary px-3 py-1 flex items-center gap-1 hover:text-claude-text w-full"
            onClick={() => toggleSection('global')}
          >
            {expandedSections.has('global') ? (
              <ChevronDown size={10} />
            ) : (
              <ChevronRight size={10} />
            )}
            <Globe size={10} />
            <span>Global</span>
            <span className="ml-auto text-claude-text-secondary/50">
              {globalAgents.length}
            </span>
          </button>
          {expandedSections.has('global') && (
            <div className="space-y-0.5">
              {globalAgents.map((agent) => (
                <AgentItem key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Project Agents */}
      {projectAgents.length > 0 && (
        <div className="px-2">
          <button
            className="text-xs text-claude-text-secondary px-3 py-1 flex items-center gap-1 hover:text-claude-text w-full"
            onClick={() => toggleSection('project')}
          >
            {expandedSections.has('project') ? (
              <ChevronDown size={10} />
            ) : (
              <ChevronRight size={10} />
            )}
            <Folder size={10} />
            <span>Project</span>
            <span className="ml-auto text-claude-text-secondary/50">
              {projectAgents.length}
            </span>
          </button>
          {expandedSections.has('project') && (
            <div className="space-y-0.5">
              {projectAgents.map((agent) => (
                <AgentItem key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </div>
      )}

      {filteredAgents.length === 0 && searchQuery && (
        <div className="px-3 py-4 text-center text-sm text-claude-text-secondary">
          No agents match "{searchQuery}"
        </div>
      )}
    </div>
  );
}
