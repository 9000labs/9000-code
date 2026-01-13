import { useState, useEffect } from 'react';
import { Sparkles, Star, ChevronDown, ChevronRight, Loader2, Eye, Send } from 'lucide-react';
import { useAppStore, type Skill } from '../../stores/appStore';

const defaultCategories = ['Development', 'Git', 'Documentation', 'Analysis', 'Design', 'Automation', 'Other'];

interface SkillListProps {
  searchQuery: string;
}

export function SkillList({ searchQuery }: SkillListProps) {
  const {
    skills,
    isLoadingSkills,
    toggleSkillFavorite,
    loadSkills,
    setSelectedSkill,
    sendToTerminal,
    addNotification
  } = useAppStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(defaultCategories));
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  // Load skills on mount
  useEffect(() => {
    console.log('[SkillList] Loading skills...');
    console.log('[SkillList] electronAPI available:', !!window.electronAPI);
    console.log('[SkillList] skills API available:', !!window.electronAPI?.skills);
    loadSkills();
  }, [loadSkills]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const filteredSkills = skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteSkills = filteredSkills.filter((s) => s.isFavorite);

  // Get unique categories from skills
  const categories = Array.from(new Set(skills.map(s => s.category)));

  const skillsByCategory = categories.reduce((acc, category) => {
    acc[category] = filteredSkills.filter((s) => s.category === category && !s.isFavorite);
    return acc;
  }, {} as Record<string, Skill[]>);

  // Open skill in viewer
  const handleSkillClick = (skill: Skill) => {
    // Extract skill folder name from command (e.g., "/frontend-design" -> "frontend-design")
    const skillName = skill.command.replace('/', '');
    setSelectedSkill(skillName);
  };

  // Send skill command to terminal
  const handleSendToTerminal = (e: React.MouseEvent, skill: Skill) => {
    e.stopPropagation();
    sendToTerminal(skill.command);
    addNotification(`Skill "${skill.name}" sent to terminal`, 'success');
  };

  const handleFavoriteClick = (e: React.MouseEvent, skillId: string) => {
    e.stopPropagation();
    toggleSkillFavorite(skillId);
  };

  const SkillItem = ({ skill }: { skill: Skill }) => (
    <div
      className="sidebar-item w-full group relative cursor-pointer"
      onClick={() => handleSkillClick(skill)}
      onMouseEnter={() => setHoveredSkill(skill.id)}
      onMouseLeave={() => setHoveredSkill(null)}
    >
      <Sparkles size={14} className="text-claude-accent flex-shrink-0" />
      <div className="flex-1 min-w-0 text-left">
        <div className="text-sm truncate">{skill.command}</div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5">
        {/* Send to terminal button */}
        <button
          className="p-1 rounded text-claude-text-secondary opacity-0 group-hover:opacity-100 hover:text-claude-accent hover:bg-claude-surface transition-all"
          onClick={(e) => handleSendToTerminal(e, skill)}
          title="Send to terminal"
        >
          <Send size={12} />
        </button>

        {/* Favorite button */}
        <button
          className={`p-1 rounded transition-all ${
            skill.isFavorite
              ? 'text-claude-accent opacity-100'
              : 'text-claude-text-secondary opacity-0 group-hover:opacity-100 hover:text-claude-accent'
          }`}
          onClick={(e) => handleFavoriteClick(e, skill.id)}
          title={skill.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={12} className={skill.isFavorite ? 'fill-current' : ''} />
        </button>
      </div>

      {/* Tooltip */}
      {hoveredSkill === skill.id && (
        <div className="absolute left-full ml-2 top-0 z-50 w-64 p-3 bg-claude-surface border border-claude-border rounded-lg shadow-lg pointer-events-none">
          <div className="font-medium text-sm mb-1">{skill.name}</div>
          <div className="text-xs text-claude-accent mb-2 font-mono">{skill.command}</div>
          <div className="text-xs text-claude-text-secondary">{skill.description}</div>
          <div className="text-xs text-claude-text-secondary/50 mt-2 italic flex items-center gap-1">
            <Eye size={10} />
            <span>Click to view/edit</span>
          </div>
        </div>
      )}
    </div>
  );

  if (isLoadingSkills) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-claude-text-secondary">
          <Loader2 className="animate-spin" size={16} />
          <span className="text-sm">Loading skills...</span>
        </div>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-sm text-claude-text-secondary">
        <p>No skills found</p>
        <p className="text-xs mt-1 text-claude-text-secondary/50">
          Skills are loaded from ~/.claude/skills/
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Favorites */}
      {favoriteSkills.length > 0 && (
        <div className="px-2">
          <div className="text-xs text-claude-text-secondary px-3 py-1 flex items-center gap-1">
            <Star size={10} className="fill-current" />
            <span>Favorites</span>
          </div>
          {favoriteSkills.map((skill) => (
            <SkillItem key={skill.id} skill={skill} />
          ))}
        </div>
      )}

      {/* By Category */}
      {categories.map((category) => {
        const categorySkills = skillsByCategory[category];
        if (!categorySkills || categorySkills.length === 0) return null;

        return (
          <div key={category} className="px-2">
            <button
              className="text-xs text-claude-text-secondary px-3 py-1 flex items-center gap-1 hover:text-claude-text w-full"
              onClick={() => toggleCategory(category)}
            >
              {expandedCategories.has(category) ? (
                <ChevronDown size={10} />
              ) : (
                <ChevronRight size={10} />
              )}
              <span>{category}</span>
              <span className="ml-auto text-claude-text-secondary/50">
                {categorySkills.length}
              </span>
            </button>
            {expandedCategories.has(category) && (
              <div className="space-y-0.5">
                {categorySkills.map((skill) => (
                  <SkillItem key={skill.id} skill={skill} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {filteredSkills.length === 0 && (
        <div className="px-3 py-4 text-center text-sm text-claude-text-secondary">
          No skills match "{searchQuery}"
        </div>
      )}
    </div>
  );
}
