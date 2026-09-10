import React from 'react';
import { LayoutGrid, ListTodo, Plus, UserCheck, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  viewMode: 'board' | 'list';
  onChangeViewMode: (mode: 'board' | 'list') => void;
  onOpenCreateTask: () => void;
  isMyTasksOnly: boolean;
  onToggleMyTasksOnly: () => void;
  onOpenMobileMenu: () => void;
  hasActiveProject: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  viewMode,
  onChangeViewMode,
  onOpenCreateTask,
  isMyTasksOnly,
  onToggleMyTasksOnly,
  onOpenMobileMenu,
  hasActiveProject,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 h-14 px-3 flex items-center justify-around select-none shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Board View Button */}
      <button
        onClick={() => onChangeViewMode('board')}
        className={`flex flex-col items-center justify-center gap-0.5 w-12 py-1 transition-all cursor-pointer ${
          viewMode === 'board' ? 'text-blue-600 font-bold' : 'text-zinc-500 hover:text-zinc-800'
        }`}
      >
        <LayoutGrid className="w-5 h-5" />
        <span className="text-[10px] leading-tight">Board</span>
      </button>

      {/* List View Button */}
      <button
        onClick={() => onChangeViewMode('list')}
        className={`flex flex-col items-center justify-center gap-0.5 w-12 py-1 transition-all cursor-pointer ${
          viewMode === 'list' ? 'text-blue-600 font-bold' : 'text-zinc-500 hover:text-zinc-800'
        }`}
      >
        <ListTodo className="w-5 h-5" />
        <span className="text-[10px] leading-tight">List</span>
      </button>

      {/* Prominent Quick Add Task Action */}
      <button
        onClick={onOpenCreateTask}
        disabled={!hasActiveProject}
        title={hasActiveProject ? 'Create Task' : 'Select a project first'}
        className={`flex items-center justify-center w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-all active:scale-95 cursor-pointer ring-4 ring-white -mt-3 ${
          !hasActiveProject ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* My Tasks Filter Button */}
      <button
        onClick={onToggleMyTasksOnly}
        className={`flex flex-col items-center justify-center gap-0.5 w-12 py-1 transition-all cursor-pointer ${
          isMyTasksOnly ? 'text-blue-600 font-bold' : 'text-zinc-500 hover:text-zinc-800'
        }`}
      >
        <UserCheck className="w-5 h-5" />
        <span className="text-[10px] leading-tight">Mine</span>
      </button>

      {/* Open Workspace Menu Drawer */}
      <button
        onClick={onOpenMobileMenu}
        className="flex flex-col items-center justify-center gap-0.5 w-12 py-1 text-zinc-500 hover:text-zinc-800 transition-all cursor-pointer"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] leading-tight">Menu</span>
      </button>
    </nav>
  );
};
