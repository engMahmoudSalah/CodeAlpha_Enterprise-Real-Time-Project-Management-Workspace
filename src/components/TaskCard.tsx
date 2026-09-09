import React from 'react';
import { Task, User, Column } from '../types';
import { Clock, ArrowRight, Check, MessageSquare, Paperclip } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  users: User[];
  columns: Column[];
  onOpenTask: (task: Task) => void;
  onMoveTask: (taskId: string, targetColumnId: string) => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  users,
  columns,
  onOpenTask,
  onMoveTask,
  onDragStart,
}) => {
  const assignees = (users || []).filter((u) => (task?.assigneeIds || []).includes(u.id));

  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter((c) => c.completed).length || 0;
  const commentsCount = task.commentsCount || 0;

  // Determine column status
  const currentColumn = columns.find((c) => c.id === task.columnId);
  const columnTitleLower = (currentColumn?.title || '').toLowerCase();
  const isInProgress = columnTitleLower.includes('progress') || columnTitleLower.includes('active');
  const isDone = columnTitleLower.includes('done') || columnTitleLower.includes('completed');

  // Format due date & check overdue
  const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
  const isDueToday = task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString();

  const getPriorityBadgeStyle = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'bg-rose-50 text-rose-600';
      case 'medium':
        return 'bg-amber-50 text-amber-600';
      case 'low':
      default:
        return 'bg-zinc-100 text-zinc-500';
    }
  };

  const getTagBadgeStyle = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes('dev') || t.includes('code') || t.includes('api')) {
      return 'bg-emerald-50 text-emerald-600';
    }
    if (t.includes('design') || t.includes('ui') || t.includes('ux')) {
      return 'bg-blue-50 text-blue-600';
    }
    if (t.includes('active') || t.includes('rebrand') || t.includes('core')) {
      return 'bg-blue-50 text-blue-600';
    }
    return 'bg-zinc-100 text-zinc-600';
  };

  const currentColIndex = columns.findIndex((c) => c.id === task.columnId);
  const nextColumn = currentColIndex >= 0 && currentColIndex < columns.length - 1 ? columns[currentColIndex + 1] : null;

  // If task is completed
  if (isDone) {
    return (
      <div
        id={`task-card-${task.id}`}
        draggable
        onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
        onClick={() => onOpenTask(task)}
        className="group relative bg-zinc-100/50 p-4 rounded-sm border border-dashed border-zinc-200 opacity-70 hover:opacity-100 grayscale-[0.4] hover:grayscale-0 transition-all cursor-pointer select-none"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
              ✓
            </span>
            <h5 className="text-sm font-semibold text-zinc-500 line-through leading-snug">
              {task.title}
            </h5>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-zinc-400 line-clamp-1 leading-relaxed pl-6">
            {task.description}
          </p>
        )}
      </div>
    );
  }

  // Active or regular card
  return (
    <div
      id={`task-card-${task.id}`}
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      onClick={() => onOpenTask(task)}
      className={`group relative bg-white p-4 rounded-sm shadow-xs hover:shadow-sm transition-all cursor-pointer select-none ${
        isInProgress
          ? 'border-l-4 border-l-indigo-500 border-y border-r border-zinc-200 ring-4 ring-blue-500/5'
          : 'border border-zinc-200'
      }`}
    >
      {/* Top row: Badges (Priority & Tags) */}
      <div className="flex items-center justify-between gap-1.5 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Priority pill */}
          <span
            className={`px-2 py-0.5 text-[10px] font-bold rounded-sm uppercase tracking-wider ${getPriorityBadgeStyle(
              task.priority
            )}`}
          >
            {task.priority}
          </span>

          {/* Custom tags pills */}
          {task.tags?.slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-sm uppercase tracking-wider ${getTagBadgeStyle(
                tag
              )}`}
            >
              {tag}
            </span>
          ))}

          {task.tags && task.tags.length > 2 && (
            <span className="text-[10px] text-zinc-400 font-semibold">
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      </div>

      {/* Task Title */}
      <h5 className="text-sm font-bold text-zinc-800 mb-1.5 leading-snug">
        {task.title}
      </h5>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-3">
          {task.description}
        </p>
      )}

      {/* Subtask progress bar */}
      {totalSubtasks > 0 && (
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
            <span>Subtasks</span>
            <span>
              {completedSubtasks}/{totalSubtasks}
            </span>
          </div>
          <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                completedSubtasks === totalSubtasks ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer Row: Comments, Attachments/Subtasks, Due Date, and Avatars */}
      <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3 text-zinc-400 text-[10px] font-medium">
          {/* Comments count */}
          <span
            className={`flex items-center gap-1 ${
              isInProgress && commentsCount > 0 ? 'text-blue-600 font-bold' : ''
            }`}
          >
            💬 {commentsCount}
          </span>

          {/* Subtasks or attachment counter */}
          {totalSubtasks > 0 && (
            <span className="flex items-center gap-1">
              📎 {totalSubtasks}
            </span>
          )}

          {/* Due date if specified */}
          {task.dueDate && (
            <span
              className={`flex items-center gap-1 ${
                isOverdue
                  ? 'text-rose-600 font-bold'
                  : isDueToday
                  ? 'text-amber-600 font-bold'
                  : ''
              }`}
              title={isOverdue ? 'Overdue' : 'Due date'}
            >
              🕒 {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Assignee Avatar Stack */}
        <div className="flex items-center -space-x-2">
          {assignees.length > 0 ? (
            assignees.map((assignee) => (
              <img
                key={assignee.id}
                src={assignee.avatar}
                alt={assignee.name}
                title={assignee.name}
                className="w-6 h-6 rounded-full ring-2 ring-white object-cover shadow-2xs"
              />
            ))
          ) : (
            <div
              className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-400 ring-2 ring-white flex items-center justify-center text-[9px] font-bold"
              title="Unassigned"
            >
              —
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
