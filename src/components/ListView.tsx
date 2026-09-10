import React from 'react';
import { Project, Task, User } from '../types';
import { CheckCircle2, Clock, CheckSquare, Plus, ArrowRight } from 'lucide-react';

interface ListViewProps {
  project: Project;
  tasks: Task[];
  users: User[];
  onOpenTask: (task: Task) => void;
  onMoveTask: (taskId: string, targetColumnId: string) => void;
  onOpenCreateTask: (columnId?: string) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  project,
  tasks,
  users,
  onOpenTask,
  onMoveTask,
  onOpenCreateTask,
}) => {
  const getPriorityBadge = (priority: Task['priority']) => {
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

  return (
    <div id="list-view-container" className="flex-1 overflow-y-auto px-2 sm:px-8 pb-20 sm:pb-8 pt-2 sm:pt-4 max-w-6xl mx-auto w-full space-y-6 sm:space-y-8 sleek-scrollbar">
      {project.columns.map((column) => {
        const columnTasks = tasks
          .filter((t) => t.columnId === column.id)
          .sort((a, b) => a.order - b.order);

        const colTitleLower = column.title.toLowerCase();
        const isInProgress = colTitleLower.includes('progress') || colTitleLower.includes('active');

        return (
          <div key={column.id} id={`list-section-${column.id}`} className="space-y-3">
            {/* Section Header matching sleek typography */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2 px-1">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: column.color || '#64748B' }}
                />
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
              </div>
              <button
                id={`list-add-task-${column.id}`}
                onClick={() => onOpenCreateTask(column.id)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            {/* Tasks Table */}
            <div className="bg-white rounded-sm border border-zinc-200 shadow-xs overflow-hidden divide-y divide-slate-100">
              {columnTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-400">
                  No tasks in {column.title}. Click "+ Add Task" to create one.
                </div>
              ) : (
                columnTasks.map((task) => {
                  const assignees = (users || []).filter((u) => (task?.assigneeIds || []).includes(u.id));
                  const isDone = column.title.toLowerCase().includes('done');
                  const totalSubtasks = task.subtasks?.length || 0;
                  const completedSubtasks = task.subtasks?.filter((c) => c.completed).length || 0;

                  return (
                    <div
                      key={task.id}
                      id={`list-task-row-${task.id}`}
                      onClick={() => onOpenTask(task)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-5 hover:bg-blue-50/20 cursor-pointer transition-colors gap-3 group"
                    >
                      {/* Left: Checkmark & Title */}
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <button
                          type="button"
                          aria-label="Toggle task completion"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Toggle done
                            const doneCol = project.columns.find((c) => c.title.toLowerCase().includes('done'));
                            const firstCol = project.columns[0];
                            if (isDone && firstCol) {
                              onMoveTask(task.id, firstCol.id);
                            } else if (doneCol) {
                              onMoveTask(task.id, doneCol.id);
                            }
                          }}
                          className="shrink-0 p-2 -ml-2 text-zinc-400 hover:text-emerald-600 transition-colors cursor-pointer"
                        >
                          <CheckCircle2
                            className={`w-5 h-5 ${isDone ? 'text-emerald-500 fill-emerald-50' : 'text-zinc-300'}`}
                          />
                        </button>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-bold truncate ${
                              isDone ? 'line-through text-zinc-400' : 'text-zinc-800'
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-zinc-400 truncate mt-0.5">{task.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Meta fields */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 text-xs text-zinc-500 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                        {/* Subtasks */}
                        {totalSubtasks > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
                            <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
                            <span>
                              {completedSubtasks}/{totalSubtasks}
                            </span>
                          </div>
                        )}

                        {/* Priority Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${getPriorityBadge(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>

                        {/* Due Date */}
                        <div className="flex items-center gap-1 text-zinc-500 font-medium min-w-[75px]">
                          {task.dueDate ? (
                            <>
                              <Clock className="w-3.5 h-3.5 text-zinc-400" />
                              <span>
                                {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </>
                          ) : (
                            <span className="text-zinc-300 italic text-[11px]">No date</span>
                          )}
                        </div>

                        {/* Assignees */}
                        <div className="flex items-center -space-x-2 w-16 justify-end">
                          {assignees.map((assignee) => (
                            <img
                              key={assignee.id}
                              src={assignee.avatar}
                              alt={assignee.name}
                              title={assignee.name}
                              className="w-6 h-6 rounded-full ring-2 ring-white object-cover shadow-2xs"
                            />
                          ))}
                        </div>

                        <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all hidden sm:block" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
