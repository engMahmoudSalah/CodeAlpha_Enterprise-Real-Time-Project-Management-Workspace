import React, { useState, useEffect } from 'react';
import { Project, Task, User, Column } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Calendar, Tag, CheckSquare } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  defaultColumnId?: string;
  users: User[];
  onCreateTask: (newTaskData: Partial<Task>) => Promise<void>;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  project,
  defaultColumnId,
  users,
  onCreateTask,
}) => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState(defaultColumnId || project.columns[0]?.id || '');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(currentUser ? [currentUser.id] : []);
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize columnId and reset form when modal opens with a specific column
  useEffect(() => {
    if (isOpen) {
      if (defaultColumnId) {
        setColumnId(defaultColumnId);
      } else if (project.columns && project.columns.length > 0) {
        setColumnId(project.columns[0].id);
      }
      // Reset input fields for fresh task entry
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setTagsInput('');
      setAssigneeIds(currentUser ? [currentUser.id] : []);
    }
  }, [isOpen, defaultColumnId, project.columns, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await onCreateTask({
        title: title.trim(),
        description: description.trim(),
        columnId: columnId || project.columns[0]?.id,
        priority,
        dueDate,
        assigneeIds,
        tags,
        createdBy: currentUser?.id,
      });

      onClose();
      setTitle('');
      setDescription('');
      setTagsInput('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-xs p-4">
      <div
        id="create-task-modal"
        className="bg-white rounded-sm border border-zinc-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Create New Task</h2>
            <p className="text-xs text-zinc-500">In project: {project.name}</p>
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
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-task-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design responsive navigation header"
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
            <textarea
              id="new-task-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context, requirements, acceptance criteria..."
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Initial Column</label>
              <select
                id="new-task-column"
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500"
              >
                {project.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Priority</label>
              <select
                id="new-task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Assignees</label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {(() => {
                const projectMembers = users.filter((u) => (project.memberIds || []).includes(u.id));
                const displayUsers = projectMembers.length > 0 ? projectMembers : users;
                return displayUsers.map((u) => {
                  const isSelected = assigneeIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAssignee(u.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                          : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      <img src={u.avatar} alt={u.name} className="w-4 h-4 rounded-full object-cover" />
                      <span>{u.name}</span>
                      {isSelected && <span className="text-[10px] text-blue-600 font-bold">✓</span>}
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Due Date</label>
              <input
                id="new-task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Tags (comma-separated)</label>
              <input
                id="new-task-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Frontend, UX, Bug"
                className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-create-task-btn"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-sm shadow-sm shadow-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating...' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
