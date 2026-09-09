export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type MemberRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  title: string;
  role: 'admin' | 'manager' | 'member';
  color: string;
  bio?: string;
  phone?: string;
  statusText?: string;
  department?: string;
  timezone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string; // YYYY-MM-DD
  assigneeIds: string[];
  tags: string[];
  subtasks: Subtask[];
  order: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Column {
  id: string;
  projectId: string;
  title: string;
  order: number;
  color?: string;
}

export interface ProjectMember {
  userId: string;
  role: MemberRole;
  joinedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  memberIds: string[];
  members?: Record<string, MemberRole>; // userId -> MemberRole mapping
  columns: Column[];
  visibility?: 'private' | 'team' | 'public';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  projectName: string;
  projectColor?: string;
  inviterId: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  inviteeId?: string;
  role: MemberRole;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  token: string;
  note?: string;
  createdAt: string;
  respondedAt?: string;
}

export interface Comment {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string; // receiver
  actorId: string; // who triggered it
  type:
    | 'assigned'
    | 'comment'
    | 'mention'
    | 'task_moved'
    | 'task_due_soon'
    | 'project_invite'
    | 'project_invite_accepted'
    | 'member_removed'
    | 'role_changed'
    | 'task_completed';
  taskId?: string;
  taskTitle?: string;
  projectId: string;
  projectName?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  taskId?: string;
  taskTitle?: string;
  userId: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface WsMessage {
  type:
    | 'auth'
    | 'join_project'
    | 'leave_project'
    | 'presence:update'
    | 'task:created'
    | 'task:updated'
    | 'task:moved'
    | 'task:deleted'
    | 'comment:created'
    | 'comment:deleted'
    | 'project:created'
    | 'project:updated'
    | 'project:deleted'
    | 'notification:new'
    | 'user:typing';
  payload?: any;
  projectId?: string;
  userId?: string;
}
