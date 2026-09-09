import React, { useState } from 'react';
import { Project, Task, User, Column } from '../types';
import { TaskCard } from './TaskCard';
import { Plus, MoreHorizontal } from 'lucide-react';

interface BoardViewProps {
  project: Project;
  tasks: Task[];
  users: User[];
  onOpenTask: (task: Task) => void;
  onMoveTask: (taskId: string, targetColumnId: string) => void;
  onOpenCreateTask: (columnId?: string) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  project,
  tasks,
  users,
  onOpenTask,
  onMoveTask,
  onOpenCreateTask,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (dragOverColumnId !== colId) {
      setDragOverColumnId(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumnId(null);
  };

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      onMoveTask(taskId, colId);
      setDraggedTaskId(null);
    }
  };

  const scrollToColumn = (colId: string) => {
    const el = document.getElementById(`column-${colId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Mobile Column Quick Switcher Bar (Visible on mobile/small tablet) */}
      <div className="sm:hidden px-4 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0 bg-zinc-50/90 backdrop-blur-xs border-b border-zinc-200/60 no-scrollbar">
        {project.columns.map((column) => {
          const count = tasks.filter((t) => t.columnId === column.id).length;
          return (
            <button
              key={`mobile-tab-${column.id}`}
              onClick={() => scrollToColumn(column.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-zinc-200 text-zinc-700 hover:border-blue-300 hover:text-blue-600 shrink-0 shadow-2xs active:scale-95 transition-all cursor-pointer select-none"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: column.color || '#64748B' }}
              />
              <span className="truncate max-w-[100px]">{column.title}</span>
              <span className="text-[10px] bg-zinc-100 text-zinc-600 rounded-full px-1.5 py-0.2">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Scroll Container */}
      <div
        id="kanban-board-container"
        className="flex-1 overflow-x-auto px-4 sm:px-8 pb-8 flex items-start gap-4 sm:gap-6 min-h-0 scroll-smooth snap-x snap-mandatory sleek-scrollbar"
      >
        {project.columns.map((column) => {
          const columnTasks = tasks
            .filter((t) => t.columnId === column.id)
            .sort((a, b) => a.order - b.order);

          const isOver = dragOverColumnId === column.id;
          const colTitleLower = column.title.toLowerCase();
          const isInProgress = colTitleLower.includes('progress') || colTitleLower.includes('active');

          return (
            <section
              key={column.id}
              id={`column-${column.id}`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`w-[82vw] max-w-[320px] sm:w-80 shrink-0 flex flex-col gap-3.5 max-h-full rounded-sm p-2 sm:p-2.5 transition-all snap-center sm:snap-align-none ${
                isOver
                  ? 'bg-blue-50/70 ring-2 ring-blue-400/40 rounded-sm'
                  : 'bg-transparent'
              }`}
            >
            {/* Column Header matching Sleek Interface specification */}
            <div className="flex items-center justify-between px-2 shrink-0">
              <h4
                className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${
                  isInProgress ? 'text-blue-600' : 'text-zinc-500'
                }`}
              >
                <span>{column.title}</span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isInProgress
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-zinc-200 text-zinc-600'
                  }`}
                >
                  {columnTasks.length}
                </span>
              </h4>

              <div className="flex items-center gap-1">
                <button
                  id={`add-task-col-btn-${column.id}`}
                  onClick={() => onOpenCreateTask(column.id)}
                  title="Add task in this column"
                  className="p-1 text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 rounded-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Task list container */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-[160px] sleek-scrollbar">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  users={users}
                  columns={project.columns}
                  onOpenTask={onOpenTask}
                  onMoveTask={onMoveTask}
                  onDragStart={handleDragStart}
                />
              ))}

              {columnTasks.length === 0 && (
                <div
                  onClick={() => onOpenCreateTask(column.id)}
                  className="h-28 border-2 border-dashed border-zinc-200 hover:border-blue-300 hover:bg-blue-50/20 rounded-sm flex flex-col items-center justify-center text-zinc-400 hover:text-blue-600 text-xs font-medium cursor-pointer transition-all gap-1"
                >
                  <Plus className="w-4 h-4 text-zinc-300" />
                  <span>No tasks yet. Click to add</span>
                </div>
              )}
            </div>

            {/* Quick add bottom button */}
            <button
              id={`quick-add-bottom-btn-${column.id}`}
              onClick={() => onOpenCreateTask(column.id)}
              className="py-2 px-3 text-xs font-semibold text-zinc-500 hover:text-blue-600 hover:bg-white rounded-sm flex items-center justify-center gap-1.5 transition-colors border border-transparent hover:border-zinc-200 hover:shadow-2xs cursor-pointer min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </section>
        );
      })}
      </div>
    </div>
  );
};
