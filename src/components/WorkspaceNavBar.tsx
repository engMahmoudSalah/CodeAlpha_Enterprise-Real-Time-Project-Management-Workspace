import React from 'react';
import { Project, User, MemberRole } from '../types';
import {
  Folder,
  Crown,
  Shield,
  Trash2,
  CheckSquare,
  SlidersHorizontal,
  Plus,
  LayoutGrid,
  ListTodo,
  X,
  Users,
} from 'lucide-react';

interface WorkspaceNavBarProps {
  activeProject: Project;
  userProjectRole: MemberRole | 'member';
  currentUser: User | null;
  users: User[];
  viewMode: 'board' | 'list';
  onChangeViewMode: (mode: 'board' | 'list') => void;
  isMyTasksOnly: boolean;
  onToggleMyTasksOnly: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  assigneeFilter: string;
  onChangeAssigneeFilter: (val: string) => void;
  priorityFilter: string;
  onChangePriorityFilter: (val: string) => void;
  onResetFilters: () => void;
  onOpenMembersModal: () => void;
  onOpenCreateTask: () => void;
  onDeleteProject: (id: string, name: string) => void;
}

export const WorkspaceNavBar: React.FC<WorkspaceNavBarProps> = ({
  activeProject,
  userProjectRole,
  currentUser,
  users,
  viewMode,
  onChangeViewMode,
  isMyTasksOnly,
  onToggleMyTasksOnly,
  showFilters,
  onToggleFilters,
  assigneeFilter,
  onChangePriorityFilter,
  onChangeAssigneeFilter,
  priorityFilter,
  onResetFilters,
  onOpenMembersModal,
  onOpenCreateTask,
  onDeleteProject,
}) => {
  const projectMembers = users.filter((u) => activeProject.memberIds?.includes(u.id));
  const hasActiveFilters = assigneeFilter !== 'all' || priorityFilter !== 'all';

  return (
    <div
      id="workspace-top-nav"
      className="bg-white border-b border-zinc-200/90 shrink-0 sticky top-0 z-20 shadow-2xs w-full overflow-x-hidden"
    >
      {/* Top Bar with Title, Meta, & Actions - Uses flex-wrap for graceful stacking */}
      <div className="px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 w-full">
        {/* Left Info: Breadcrumb + Title */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <nav className="flex items-center gap-1.5 sm:gap-2 text-xs text-zinc-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-zinc-400" />
              <span>Projects</span>
            </span>
            <span>/</span>
            <span className="text-zinc-700 font-semibold truncate max-w-[120px] xs:max-w-[180px] sm:max-w-xs md:max-w-md">
              {activeProject.name}
            </span>

            {/* Role Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
              {userProjectRole === 'owner' && <Crown className="w-3 h-3 text-amber-500" />}
              {userProjectRole === 'admin' && <Shield className="w-3 h-3 text-blue-600" />}
              <span className="uppercase">{userProjectRole}</span>
            </span>

            {/* Delete button for owners/admins */}
            {(userProjectRole === 'owner' || currentUser?.role === 'admin') && (
              <button
                onClick={() => onDeleteProject(activeProject.id, activeProject.name)}
                className="ml-0.5 text-zinc-400 hover:text-rose-600 p-1 rounded-sm hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                title="Delete this project"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h2 className="text-base sm:text-xl lg:text-2xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
              <span>{viewMode === 'board' ? 'Production Board' : 'Task List'}</span>
            </h2>

            {isMyTasksOnly && (
              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded-full flex items-center gap-1 shadow-2xs shrink-0">
                <CheckSquare className="w-3 h-3" />
                <span>My Tasks</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Actions: Members, View Mode, Filters, Add Task - flex-wrap enabled for zero overflow */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-wrap justify-start sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 w-full sm:w-auto">
          {/* Members avatar stack */}
          <button
            onClick={onOpenMembersModal}
            className="flex items-center gap-1.5 p-1 hover:bg-zinc-100 rounded-sm transition-colors cursor-pointer group shrink-0"
            title="Manage project team"
          >
            <div className="flex -space-x-2 items-center">
              {projectMembers.slice(0, 3).map((u) => (
                <img
                  key={u.id}
                  src={u.avatar}
                  alt={u.name}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full ring-2 ring-white object-cover border border-zinc-200"
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-zinc-600 group-hover:text-zinc-900 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>{projectMembers.length}</span>
            </span>
          </button>

          {/* View toggle (Board vs List) */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-sm border border-zinc-200/80 shrink-0">
            <button
              onClick={() => onChangeViewMode('board')}
              className={`px-2.5 py-1 rounded-sm text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-white text-blue-700 shadow-2xs border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => onChangeViewMode('list')}
              className={`px-2.5 py-1 rounded-sm text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-blue-700 shadow-2xs border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Filters Toggle Button */}
          <button
            onClick={onToggleFilters}
            className={`bg-white border text-zinc-700 px-2.5 py-1 min-h-[32px] sm:min-h-[36px] rounded-sm text-xs font-semibold hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              showFilters || hasActiveFilters
                ? 'border-blue-400 text-blue-700 bg-blue-50/50 ring-2 ring-blue-100'
                : 'border-zinc-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            <span>Filters</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-600" />}
          </button>

          {/* Add Task Primary Action Button */}
          <button
            onClick={onOpenCreateTask}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1 sm:py-1.5 min-h-[32px] sm:min-h-[36px] rounded-sm text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-98 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Expandable Filter Bar if toggled - flex-wrap enabled */}
      {showFilters && (
        <div className="px-3 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2.5 sm:gap-3 flex-wrap bg-zinc-50/90 border-t border-zinc-100 animate-in fade-in duration-150 w-full">
          {/* Filter by Assignee */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-sm border border-zinc-200 text-xs shrink-0 max-w-full">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
              Assignee:
            </span>
            <select
              value={assigneeFilter}
              onChange={(e) => onChangeAssigneeFilter(e.target.value)}
              className="bg-transparent font-bold text-zinc-800 focus:outline-hidden cursor-pointer text-xs max-w-[150px] truncate"
            >
              <option value="all">All Members</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Priority */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-sm border border-zinc-200 text-xs shrink-0 max-w-full">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
              Priority:
            </span>
            <select
              value={priorityFilter}
              onChange={(e) => onChangePriorityFilter(e.target.value)}
              className="bg-transparent font-bold text-zinc-800 focus:outline-hidden cursor-pointer text-xs"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* My Tasks Toggle */}
          <button
            onClick={onToggleMyTasksOnly}
            className={`px-2.5 py-1 rounded-sm text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              isMyTasksOnly
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Assigned to Me</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 flex items-center gap-1 cursor-pointer shrink-0 ml-auto sm:ml-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
