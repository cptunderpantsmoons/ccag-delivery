// components/ccag/skills-manager.tsx
'use client';

import { useState } from 'react';
import { useCcag } from '@/lib/ccag/provider';
import { Loader2, Plus, Trash2, RefreshCw, Sparkles } from 'lucide-react';

export function CcagSkillsManager() {
  const { skills, addSkill, removeSkill, refreshSkills, isConnected } = useCcag();
  const [newSkillPath, setNewSkillPath] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newSkillPath.trim()) return;
    setIsAdding(true);
    try {
      await addSkill(newSkillPath.trim());
      setNewSkillPath('');
    } finally {
      setIsAdding(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center justify-center h-32 text-[var(--text-secondary)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting to CCAG runtime...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)] mb-4">
          <Sparkles className="h-4 w-4" />
          Skills
        </h3>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Skill path or URL..."
            value={newSkillPath}
            onChange={(e) => setNewSkillPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="carbon-input flex-1 px-3 py-2 text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={isAdding || !newSkillPath.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--deep)] text-[var(--text-primary)] disabled:opacity-50"
          >
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
          <button
            onClick={refreshSkills}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--background)]"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {skills.length === 0 && (
            <div className="text-sm text-[var(--text-secondary)] text-center py-4">
              No skills installed. Add a skill path or URL above.
            </div>
          )}
          {skills.map((skill) => (
            <div
              key={skill.name}
              className="flex items-start justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] hover:border-[var(--border-strong)] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-[var(--text-primary)] truncate">{skill.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    skill.scope === 'global' 
                      ? 'bg-secondary text-secondary-foreground' 
                      : 'bg-[var(--deep)] text-[var(--text-primary)]'
                  }`}>
                    {skill.scope}
                  </span>
                </div>
                {skill.description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{skill.description}</p>
                )}
                {skill.trigger && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Trigger: {skill.trigger}</p>
                )}
              </div>
              <button
                className="shrink-0 ml-2 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => removeSkill(skill.name)}
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
