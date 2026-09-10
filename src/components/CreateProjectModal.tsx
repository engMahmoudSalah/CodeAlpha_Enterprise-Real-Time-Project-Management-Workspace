import React, { useState } from 'react';
import { Project, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Layers, Smartphone, ShieldCheck, Briefcase, Zap, Globe, Check } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onCreateProject: (projectData: Partial<Project>) => Promise<void>;
}

const COLOR_OPTIONS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
];

const ICON_OPTIONS = [
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Layers', icon: Layers },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'ShieldCheck', icon: ShieldCheck },
  { name: 'Zap', icon: Zap },
  { name: 'Globe', icon: Globe },
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  users,
  onCreateProject,
}) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedIcon, setSelectedIcon] = useState('Briefcase');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    currentUser ? [currentUser.id] : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onCreateProject({
        name: name.trim(),
        description: description.trim(),
        color: selectedColor,
        icon: selectedIcon,
        memberIds: selectedMemberIds,
        createdBy: currentUser?.id,
      });

      onClose();
      setName('');
      setDescription('');
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div
        id="create-project-modal"
        className="bg-white rounded-sm border border-zinc-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" /><div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Create Group Project</h2>
            <p className="text-xs text-zinc-500">Set up a collaborative workspace for your team</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-project-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Marketing Campaign & Brand Portal"
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
            <textarea
              id="new-project-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of project goals and scope..."
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Color & Icon Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Theme Color</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center cursor-pointer ${
                      selectedColor === c ? 'scale-115 ring-2 ring-offset-2 ring-zinc-400' : 'hover:scale-105'
                    }`}
                  >
                    {selectedColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Icon</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ICON_OPTIONS.map(({ name: iconName, icon: IconComp }) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    className={`p-1.5 rounded-sm border transition-colors cursor-pointer ${
                      selectedIcon === iconName
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Team Members ({selectedMemberIds.length} selected)
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 border border-zinc-200 rounded-sm p-2">
              {users.map((u) => {
                const isSelected = selectedMemberIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleMember(u.id)}
                    className={`flex items-center justify-between p-2 rounded-sm cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/80 text-blue-900 font-medium' : 'hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-medium leading-none">{u.name}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{u.title}</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-create-project-btn"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-sm shadow-sm shadow-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating...' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
