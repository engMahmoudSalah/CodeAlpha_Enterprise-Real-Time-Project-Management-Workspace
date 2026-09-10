import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  or,
} from 'firebase/firestore';
import { db, auth, signInAnonymously, isFirebaseConfigured } from '../firebase';
import {
  Project,
  Task,
  Comment,
  Notification,
  ActivityLog,
  User,
  ProjectInvitation,
  MemberRole,
} from '../types';

// Collection references
const USERS_COL = 'users';
const PROJECTS_COL = 'projects';
const TASKS_COL = 'tasks';
const COMMENTS_COL = 'comments';
const ACTIVITY_COL = 'activity_logs';
const NOTIFICATIONS_COL = 'notifications';
const INVITATIONS_COL = 'invitations';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Error Handled:', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Recursively strips undefined keys and nested undefined values so Firestore does not throw serialization errors
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item)) as any;
  }
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        clean[key] = cleanFirestoreData(val);
      } else if (Array.isArray(val)) {
        clean[key] = val.map((item) => (typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item));
      } else {
        clean[key] = val;
      }
    }
  }
  return clean as T;
}

// Standard Kanban columns for newly created projects
export const DEFAULT_PROJECT_COLUMNS = [
  { id: 'col-todo', projectId: '', title: 'To Do', order: 0, color: '#94a3b8' },
  { id: 'col-in-progress', projectId: '', title: 'In Progress', order: 1, color: '#6366f1' },
  { id: 'col-review', projectId: '', title: 'In Review', order: 2, color: '#f59e0b' },
  { id: 'col-done', projectId: '', title: 'Done', order: 3, color: '#10b981' },
];

/**
 * No-op in production: No mock or demo projects are seeded.
 * Workspaces start completely clean for real users.
 */
export async function seedInitialFirestoreData(_seedUser: User): Promise<void> {
  // Production: Do not seed any mock data or fake projects
  return;
}

// Local storage fallback constants & events
const LOCAL_PROJECTS_KEY = 'pm_local_projects';
const LOCAL_TASKS_KEY = 'pm_local_tasks';
const LOCAL_USERS_KEY = 'pm_local_users';
const LOCAL_COMMENTS_KEY = 'pm_local_comments';
const LOCAL_ACTIVITY_KEY = 'pm_local_activity';
const LOCAL_NOTIFS_KEY = 'pm_local_notifications';
const LOCAL_INVITES_KEY = 'pm_local_invitations';

function notifyLocalChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pm_data_changed'));
  }
}

export function isCloudSyncActive(): boolean {
  return Boolean(isFirebaseConfigured && auth.currentUser);
}

// ----------------------------------------------------
// USERS
// ----------------------------------------------------
export function subscribeUsers(
  onUpdate: (users: User[]) => void,
  onError?: (err: Error) => void
) {
  if (!isCloudSyncActive()) {
    const fetchLocal = () => {
      try {
        const stored = localStorage.getItem(LOCAL_USERS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            onUpdate(parsed);
            return;
          }
        }
      } catch (_) {}
      onUpdate([]);
    };
    fetchLocal();
    const handleStorage = () => fetchLocal();
    window.addEventListener('pm_data_changed', handleStorage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('pm_data_changed', handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }

  if (!auth.currentUser) {
    onUpdate([]);
    return () => {};
  }
  const q = collection(db, USERS_COL);
  return onSnapshot(
    q,
    (snap) => {
      const users: User[] = [];
      snap.forEach((docSnap) => {
        users.push(docSnap.data() as User);
      });
      onUpdate(users);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, USERS_COL);
      if (onError) onError(err);
    }
  );
}

export async function upsertUserInFirestore(user: User): Promise<void> {
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_USERS_KEY);
      let users: User[] = stored ? JSON.parse(stored) : [];
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx >= 0) users[idx] = { ...users[idx], ...user };
      else users.push(user);
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
      notifyLocalChange();
    } catch (_) {}
    return;
  }
  const userRef = doc(db, USERS_COL, user.id);
  await setDoc(userRef, cleanFirestoreData({
    ...user,
    updatedAt: new Date().toISOString(),
  }), { merge: true });
}

export async function getUserFromFirestore(userId: string): Promise<User | null> {
  if (!userId) return null;
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_USERS_KEY);
      if (stored) {
        const users: User[] = JSON.parse(stored);
        return users.find((u) => u.id === userId) || null;
      }
    } catch (_) {}
    return null;
  }
  try {
    const userRef = doc(db, USERS_COL, userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as User;
    }
    return null;
  } catch (err) {
    console.warn('getUserFromFirestore error:', err);
    return null;
  }
}

export async function updateUserProfileInFirestore(
  userId: string,
  updates: Partial<User>
): Promise<void> {
  const userRef = doc(db, USERS_COL, userId);
  await setDoc(userRef, cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }), { merge: true });
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const userRef = doc(db, USERS_COL, userId);
  await deleteDoc(userRef);
}

export async function updateUserWorkspaceRoleInFirestore(
  userId: string,
  newRole: 'admin' | 'manager' | 'member',
  actor: User
): Promise<void> {
  const userRef = doc(db, USERS_COL, userId);
  await updateDoc(userRef, cleanFirestoreData({
    role: newRole,
    updatedAt: new Date().toISOString(),
  }));
}

export async function getUserWorkspaceStats(userId: string): Promise<{
  ownedProjectsCount: number;
  assignedTasksCount: number;
  completedTasksCount: number;
}> {
  try {
    // 1. Projects where user is a member
    const projSnap = await getDocs(
      query(collection(db, PROJECTS_COL), where('memberIds', 'array-contains', userId))
    );
    const ownedProjectsCount = projSnap.docs.filter((d) => (d.data() as Project).createdBy === userId).length;

    // 2. Tasks assigned to user
    const tasksSnap = await getDocs(
      query(collection(db, TASKS_COL), where('assigneeIds', 'array-contains', userId))
    );
    const tasks = tasksSnap.docs.map((d) => d.data() as Task);
    const assignedTasksCount = tasks.length;
    const completedTasksCount = tasks.filter((t) => t.columnId === 'col-done' || t.columnId.includes('done')).length;

    return {
      ownedProjectsCount,
      assignedTasksCount,
      completedTasksCount,
    };
  } catch (err) {
    console.warn('Could not fetch user stats:', err);
    return {
      ownedProjectsCount: 0,
      assignedTasksCount: 0,
      completedTasksCount: 0,
    };
  }
}

// ----------------------------------------------------
// PROJECTS
// ----------------------------------------------------
export function subscribeProjects(
  userId: string,
  onUpdate: (projects: Project[]) => void,
  onError?: (err: Error) => void
) {
  if (!isCloudSyncActive()) {
    const fetchLocal = () => {
      try {
        const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
        let projects: Project[] = stored ? JSON.parse(stored) : [];
        if (projects.length === 0) {
          const starterProject: Project = {
            id: 'proj-velocity-primary',
            name: 'Core Platform Workspace',
            description: 'Main product iteration and task management workspace.',
            color: '#6366F1',
            icon: 'Folder',
            columns: DEFAULT_PROJECT_COLUMNS.map((c) => ({ ...c, projectId: 'proj-velocity-primary' })),
            memberIds: [userId],
            members: { [userId]: 'owner' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: userId,
          };
          projects = [starterProject];
          localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
        }
        onUpdate(projects);
      } catch (_) {
        onUpdate([]);
      }
    };
    fetchLocal();
    const handleUpdate = () => fetchLocal();
    window.addEventListener('pm_data_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('pm_data_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }

  if (!auth.currentUser) {
    onUpdate([]);
    return () => {};
  }
  const q = query(
    collection(db, PROJECTS_COL),
    where('memberIds', 'array-contains', userId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const projects: Project[] = [];
      snap.forEach((docSnap) => {
        projects.push(docSnap.data() as Project);
      });
      // Sort projects by createdAt ascending
      projects.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      onUpdate(projects);
    },
    (err) => {
      console.error('Firestore subscribeProjects error:', err);
      if (onError) onError(err);
    }
  );
}

export async function createProjectInFirestore(
  projectData: Partial<Project>,
  user: User
): Promise<Project> {
  const id = projectData.id || `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const columns =
    projectData.columns && projectData.columns.length > 0
      ? projectData.columns.map((c) => ({ ...c, projectId: id }))
      : DEFAULT_PROJECT_COLUMNS.map((c) => ({ ...c, projectId: id }));

  const memberIds = projectData.memberIds?.length
    ? Array.from(new Set([user.id, ...projectData.memberIds]))
    : [user.id];

  const membersMap: Record<string, MemberRole> = { [user.id]: 'owner' };
  memberIds.forEach((mId) => {
    if (!membersMap[mId]) membersMap[mId] = 'member';
  });

  const project: Project = {
    name: projectData.name || 'Untitled Project',
    description: projectData.description || '',
    color: projectData.color || '#6366F1',
    icon: projectData.icon || 'Folder',
    ...projectData,
    id,
    columns,
    memberIds,
    members: { ...membersMap, ...(projectData.members || {}) },
    createdAt: now,
    updatedAt: now,
    createdBy: user.id,
  };

  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
      const projects: Project[] = stored ? JSON.parse(stored) : [];
      projects.push(project);
      localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
      notifyLocalChange();
    } catch (_) {}
    return project;
  }

  await setDoc(doc(db, PROJECTS_COL, id), cleanFirestoreData(project));

  // Log activity
  await logActivityInFirestore({
    projectId: id,
    userId: user.id,
    action: 'Created Project',
    details: `${user.name} created project "${project.name}"`,
  });

  return project;
}

export async function updateProjectInFirestore(
  projectId: string,
  updates: Partial<Project>
): Promise<void> {
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
      if (stored) {
        const projects: Project[] = JSON.parse(stored);
        const idx = projects.findIndex((p) => p.id === projectId);
        if (idx >= 0) {
          projects[idx] = { ...projects[idx], ...updates, updatedAt: new Date().toISOString() };
          localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
          notifyLocalChange();
        }
      }
    } catch (_) {}
    return;
  }
  const ref = doc(db, PROJECTS_COL, projectId);
  await updateDoc(ref, cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Permanently delete a project and cascade delete all associated tasks, invitations, comments, and logs
 */
export async function deleteProjectInFirestore(projectId: string): Promise<void> {
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
      if (stored) {
        const projects: Project[] = JSON.parse(stored);
        const filtered = projects.filter((p) => p.id !== projectId);
        localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(filtered));
      }
      const tasksStored = localStorage.getItem(LOCAL_TASKS_KEY);
      if (tasksStored) {
        const tasks: Task[] = JSON.parse(tasksStored);
        const filtered = tasks.filter((t) => t.projectId !== projectId);
        localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(filtered));
      }
      notifyLocalChange();
    } catch (_) {}
    return;
  }
  try {
    // Ensure Firebase auth session is active
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.warn('Anonymous sign-in before deleteDoc:', e);
      }
    }

    // 1. Delete all tasks in project
    try {
      const tasksSnap = await getDocs(query(collection(db, TASKS_COL), where('projectId', '==', projectId)));
      await Promise.all(tasksSnap.docs.map((d) => deleteDoc(d.ref).catch(() => null)));
    } catch (e) {
      console.warn('Could not delete some tasks during project deletion:', e);
    }

    // 2. Delete all invitations for project
    try {
      const invSnap = await getDocs(query(collection(db, INVITATIONS_COL), where('projectId', '==', projectId)));
      await Promise.all(invSnap.docs.map((d) => deleteDoc(d.ref).catch(() => null)));
    } catch (e) {
      console.warn('Could not delete some invitations during project deletion:', e);
    }

    // 3. Delete comments for tasks in this project
    try {
      const commentsSnap = await getDocs(query(collection(db, COMMENTS_COL), where('projectId', '==', projectId)));
      await Promise.all(commentsSnap.docs.map((d) => deleteDoc(d.ref).catch(() => null)));
    } catch (e) {
      console.warn('Could not delete comments during project deletion:', e);
    }

    // 4. Delete activity logs for project
    try {
      const actSnap = await getDocs(query(collection(db, ACTIVITY_COL), where('projectId', '==', projectId)));
      await Promise.all(actSnap.docs.map((d) => deleteDoc(d.ref).catch(() => null)));
    } catch (e) {
      console.warn('Could not delete activity logs during project deletion:', e);
    }

    // 5. Delete project document
    await deleteDoc(doc(db, PROJECTS_COL, projectId));
  } catch (err) {
    console.error('Cascade delete project error:', err);
    throw err;
  }
}

/**
 * Purge any leftover legacy demo projects (created with proj-core-* or proj-mobile-*) for a user
 */
export async function purgeLegacyDemoData(userId: string): Promise<number> {
  try {
    const q = query(collection(db, PROJECTS_COL), where('memberIds', 'array-contains', userId));
    const snap = await getDocs(q);
    let deletedCount = 0;
    for (const docSnap of snap.docs) {
      const pId = docSnap.id;
      if (pId.startsWith('proj-core-') || pId.startsWith('proj-mobile-')) {
        await deleteProjectInFirestore(pId);
        deletedCount++;
      }
    }
    return deletedCount;
  } catch (err) {
    console.warn('Purge legacy demo data warning:', err);
    return 0;
  }
}

// ----------------------------------------------------
// TASKS
// ----------------------------------------------------
export function subscribeTasks(
  projectId: string,
  onUpdate: (tasks: Task[]) => void,
  onError?: (err: Error) => void
) {
  if (!isCloudSyncActive()) {
    const fetchLocal = () => {
      try {
        const stored = localStorage.getItem(LOCAL_TASKS_KEY);
        let tasks: Task[] = stored ? JSON.parse(stored) : [];
        const projectTasks = tasks.filter((t) => t.projectId === projectId);
        if (projectTasks.length === 0 && tasks.length === 0) {
          const starterTasks: Task[] = [
            {
              id: 'task-starter-1',
              projectId,
              title: 'Review System Architecture & Tech Specs',
              description: 'Examine API interfaces, database schema models, and security rules.',
              columnId: 'col-todo',
              priority: 'high',
              dueDate: '',
              order: 0,
              assigneeIds: [],
              tags: ['Architecture', 'Docs'],
              subtasks: [{ id: 'st-1', text: 'Verify database connections', completed: true }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'system',
            },
            {
              id: 'task-starter-2',
              projectId,
              title: 'Configure Workspace Collaboration',
              description: 'Connect live synchronization and team member invitations.',
              columnId: 'col-in-progress',
              priority: 'medium',
              dueDate: '',
              order: 1,
              assigneeIds: [],
              tags: ['Feature', 'Sync'],
              subtasks: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'system',
            },
            {
              id: 'task-starter-3',
              projectId,
              title: 'Launch Velocity Board',
              description: 'Project board is active, responsive, and ready for productivity.',
              columnId: 'col-done',
              priority: 'low',
              dueDate: '',
              order: 2,
              assigneeIds: [],
              tags: ['Milestone'],
              subtasks: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'system',
            },
          ];
          localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(starterTasks));
          onUpdate(starterTasks);
          return;
        }
        projectTasks.sort((a, b) => a.order - b.order);
        onUpdate(projectTasks);
      } catch (_) {
        onUpdate([]);
      }
    };
    fetchLocal();
    const handleUpdate = () => fetchLocal();
    window.addEventListener('pm_data_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('pm_data_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }

  if (!auth.currentUser) {
    onUpdate([]);
    return () => {};
  }
  const q = query(collection(db, TASKS_COL), where('projectId', '==', projectId));
  return onSnapshot(
    q,
    (snap) => {
      const tasks: Task[] = [];
      snap.forEach((docSnap) => {
        tasks.push(docSnap.data() as Task);
      });
      tasks.sort((a, b) => a.order - b.order);
      onUpdate(tasks);
    },
    (err) => {
      console.error('Firestore subscribeTasks error:', err);
      if (onError) onError(err);
    }
  );
}

export async function createTaskInFirestore(
  taskData: Partial<Task> & { projectId: string },
  user: User
): Promise<Task> {
  const id = taskData.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const task: Task = {
    columnId: 'col-backlog',
    title: 'Untitled Task',
    description: '',
    priority: 'medium',
    dueDate: '',
    ...taskData,
    id,
    projectId: taskData.projectId,
    order: taskData.order ?? 0,
    subtasks: taskData.subtasks || [],
    assigneeIds: taskData.assigneeIds || [],
    tags: taskData.tags || [],
    createdAt: now,
    updatedAt: now,
    createdBy: user.id,
  };

  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_TASKS_KEY);
      const tasks: Task[] = stored ? JSON.parse(stored) : [];
      tasks.push(task);
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
      notifyLocalChange();
    } catch (_) {}
    return task;
  }

  await setDoc(doc(db, TASKS_COL, id), cleanFirestoreData(task));

  // Log activity
  await logActivityInFirestore({
    projectId: task.projectId,
    taskId: task.id,
    taskTitle: task.title,
    userId: user.id,
    action: 'Created Task',
    details: `${user.name} added task "${task.title}" with priority ${task.priority.toUpperCase()}`,
  });

  // Notify assignees
  if (task.assigneeIds && task.assigneeIds.length > 0) {
    for (const assigneeId of task.assigneeIds) {
      if (assigneeId !== user.id) {
        await createNotificationInFirestore({
          userId: assigneeId,
          actorId: user.id,
          type: 'assigned',
          taskId: task.id,
          taskTitle: task.title,
          projectId: task.projectId,
          message: `${user.name} assigned you to task "${task.title}"`,
        });
      }
    }
  }

  return task;
}

export async function getTaskFromFirestore(taskId: string): Promise<Task | null> {
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_TASKS_KEY);
      if (stored) {
        const tasks: Task[] = JSON.parse(stored);
        return tasks.find((t) => t.id === taskId) || null;
      }
    } catch (_) {}
    return null;
  }
  const ref = doc(db, TASKS_COL, taskId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Task;
}

export async function updateTaskInFirestore(
  taskId: string,
  updates: Partial<Task>,
  user?: User,
  actionSummary?: string
): Promise<void> {
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_TASKS_KEY);
      if (stored) {
        const tasks: Task[] = JSON.parse(stored);
        const idx = tasks.findIndex((t) => t.id === taskId);
        if (idx >= 0) {
          tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
          localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
          notifyLocalChange();
        }
      }
    } catch (_) {}
    return;
  }
  const ref = doc(db, TASKS_COL, taskId);

  let existingTask: Task | null = null;
  if (user) {
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        existingTask = snap.data() as Task;
      }
    } catch (e) {
      console.warn('Could not fetch existing task before update:', e);
    }
  }

  await updateDoc(ref, cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));

  if (user) {
    const projectId = updates.projectId || existingTask?.projectId;
    const taskTitle = updates.title || existingTask?.title || 'Task';

    if (projectId) {
      let actionName = 'Updated Task';
      let detailsText = actionSummary || `${user.name} updated task "${taskTitle}"`;

      if (updates.columnId && existingTask?.columnId && updates.columnId !== existingTask.columnId) {
        const isDone = updates.columnId.includes('done') || updates.columnId.includes('complete');
        actionName = isDone ? 'Completed Task' : 'Moved Task';
        detailsText = actionSummary || (isDone
          ? `${user.name} marked "${taskTitle}" as completed`
          : `${user.name} moved "${taskTitle}"`);

        // Notify assignees and creator about move or completion
        const targetUserIds = new Set<string>();
        (existingTask?.assigneeIds || []).forEach((uid) => targetUserIds.add(uid));
        if (existingTask?.createdBy) targetUserIds.add(existingTask.createdBy);
        targetUserIds.delete(user.id);

        for (const targetUid of targetUserIds) {
          await createNotificationInFirestore({
            userId: targetUid,
            actorId: user.id,
            type: isDone ? 'task_completed' : 'task_moved',
            taskId,
            taskTitle,
            projectId,
            message: isDone
              ? `${user.name} completed task "${taskTitle}"`
              : `${user.name} moved task "${taskTitle}"`,
          });
        }
      } else if (updates.priority && existingTask?.priority && updates.priority !== existingTask.priority) {
        actionName = 'Changed Priority';
        detailsText = `${user.name} changed priority of "${taskTitle}" to ${updates.priority.toUpperCase()}`;
      }

      // Check if newly assigned users were added
      if (updates.assigneeIds && existingTask) {
        const oldAssigneeSet = new Set(existingTask.assigneeIds || []);
        const newAssignees = updates.assigneeIds.filter((id) => !oldAssigneeSet.has(id) && id !== user.id);
        for (const newUid of newAssignees) {
          await createNotificationInFirestore({
            userId: newUid,
            actorId: user.id,
            type: 'assigned',
            taskId,
            taskTitle,
            projectId,
            message: `${user.name} assigned you to task "${taskTitle}"`,
          });
        }
      }

      await logActivityInFirestore({
        projectId,
        taskId,
        taskTitle,
        userId: user.id,
        action: actionName,
        details: detailsText,
      });
    }
  }
}

export async function deleteTaskInFirestore(
  taskId: string,
  projectId: string,
  taskTitle: string,
  user: User
): Promise<void> {
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_TASKS_KEY);
      if (stored) {
        const tasks: Task[] = JSON.parse(stored);
        const filtered = tasks.filter((t) => t.id !== taskId);
        localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(filtered));
        notifyLocalChange();
      }
    } catch (_) {}
    return;
  }
  await deleteDoc(doc(db, TASKS_COL, taskId));

  await logActivityInFirestore({
    projectId,
    taskId,
    taskTitle,
    userId: user.id,
    action: 'Deleted Task',
    details: `${user.name} deleted task "${taskTitle}"`,
  });
}

// ----------------------------------------------------
// COMMENTS
// ----------------------------------------------------
export function subscribeComments(
  projectId: string,
  taskId: string,
  onUpdate: (comments: Comment[]) => void,
  onError?: (err: Error) => void
) {
  if (!isCloudSyncActive()) {
    const fetchLocal = () => {
      try {
        const stored = localStorage.getItem(LOCAL_COMMENTS_KEY);
        const comments: Comment[] = stored ? JSON.parse(stored) : [];
        const taskComments = comments.filter((c) => c.taskId === taskId);
        taskComments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        onUpdate(taskComments);
      } catch (_) {
        onUpdate([]);
      }
    };
    fetchLocal();
    const handleUpdate = () => fetchLocal();
    window.addEventListener('pm_data_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('pm_data_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }

  if (!auth.currentUser) {
    onUpdate([]);
    return () => {};
  }
  const q = query(
    collection(db, COMMENTS_COL),
    where('projectId', '==', projectId),
    where('taskId', '==', taskId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const comments: Comment[] = [];
      snap.forEach((docSnap) => {
        comments.push(docSnap.data() as Comment);
      });
      comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      onUpdate(comments);
    },
    (err) => {
      console.error('Firestore subscribeComments error:', err);
      if (onError) onError(err);
    }
  );
}

export async function addCommentInFirestore(
  commentData: {
    taskId: string;
    projectId: string;
    text: string;
    taskTitle?: string;
  },
  user: User
): Promise<Comment> {
  const id = `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const comment: Comment = {
    id,
    taskId: commentData.taskId,
    projectId: commentData.projectId,
    userId: user.id,
    text: commentData.text,
    createdAt: now,
  };

  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_COMMENTS_KEY);
      const comments: Comment[] = stored ? JSON.parse(stored) : [];
      comments.push(comment);
      localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(comments));
      notifyLocalChange();
    } catch (_) {}
    return comment;
  }

  await setDoc(doc(db, COMMENTS_COL, id), cleanFirestoreData(comment));

  // Log activity
  await logActivityInFirestore({
    projectId: commentData.projectId,
    taskId: commentData.taskId,
    taskTitle: commentData.taskTitle,
    userId: user.id,
    action: 'Added Comment',
    details: `${user.name} commented on "${commentData.taskTitle || 'task'}": "${commentData.text.length > 40 ? commentData.text.substring(0, 37) + '...' : commentData.text}"`,
  });

  // Notify task assignees & creator, plus any @mentioned users
  try {
    const taskSnap = await getDoc(doc(db, TASKS_COL, commentData.taskId));
    if (taskSnap.exists()) {
      const tData = taskSnap.data() as Task;
      const targetUserIds = new Set<string>();
      (tData.assigneeIds || []).forEach((uid) => targetUserIds.add(uid));
      if (tData.createdBy) targetUserIds.add(tData.createdBy);
      targetUserIds.delete(user.id);

      // Check for @mentions in comment text
      const mentionedUserIds = new Set<string>();
      try {
        const usersSnap = await getDocs(collection(db, USERS_COL));
        usersSnap.forEach((uDoc) => {
          const u = uDoc.data() as User;
          if (u.id !== user.id && u.name) {
            const firstName = u.name.split(' ')[0].toLowerCase();
            const fullName = u.name.toLowerCase();
            const textLower = commentData.text.toLowerCase();
            if (
              textLower.includes(`@${fullName}`) ||
              textLower.includes(`@${firstName}`) ||
              textLower.includes(`@${u.id}`)
            ) {
              mentionedUserIds.add(u.id);
            }
          }
        });
      } catch (e) {
        console.warn('Mention check error:', e);
      }

      const snippet = commentData.text.length > 45 ? commentData.text.substring(0, 42) + '...' : commentData.text;

      // Send mention notifications (higher priority)
      for (const mentionedUid of mentionedUserIds) {
        await createNotificationInFirestore({
          userId: mentionedUid,
          actorId: user.id,
          type: 'mention',
          taskId: commentData.taskId,
          taskTitle: commentData.taskTitle || tData.title,
          projectId: commentData.projectId,
          message: `${user.name} mentioned you in a comment on "${tData.title}": "${snippet}"`,
        });
        targetUserIds.delete(mentionedUid); // Avoid double notifying
      }

      // Send standard comment notifications to remaining assignees/creator
      for (const targetUid of targetUserIds) {
        await createNotificationInFirestore({
          userId: targetUid,
          actorId: user.id,
          type: 'comment',
          taskId: commentData.taskId,
          taskTitle: commentData.taskTitle || tData.title,
          projectId: commentData.projectId,
          message: `${user.name} commented on "${tData.title}": "${snippet}"`,
        });
      }
    }
  } catch (err) {
    console.warn('Comment notification trigger notice:', err);
  }

  return comment;
}

export async function deleteCommentInFirestore(
  commentId: string,
  projectId: string,
  taskId: string,
  taskTitle: string,
  user: User
): Promise<void> {
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_COMMENTS_KEY);
      if (stored) {
        const comments: Comment[] = JSON.parse(stored);
        const filtered = comments.filter((c) => c.id !== commentId);
        localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(filtered));
        notifyLocalChange();
      }
    } catch (_) {}
    return;
  }
  await deleteDoc(doc(db, COMMENTS_COL, commentId));

  await logActivityInFirestore({
    projectId,
    taskId,
    taskTitle,
    userId: user.id,
    action: 'Deleted Comment',
    details: `${user.name} deleted a comment on "${taskTitle}"`,
  });
}

// ----------------------------------------------------
// ACTIVITY LOGS
// ----------------------------------------------------
export function subscribeActivityLogs(
  projectId: string,
  onUpdate: (logs: ActivityLog[]) => void,
  onError?: (err: Error) => void
) {
  if (!isCloudSyncActive()) {
    const fetchLocal = () => {
      try {
        const stored = localStorage.getItem(LOCAL_ACTIVITY_KEY);
        const logs: ActivityLog[] = stored ? JSON.parse(stored) : [];
        const projectLogs = logs.filter((l) => l.projectId === projectId);
        projectLogs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        onUpdate(projectLogs);
      } catch (_) {
        onUpdate([]);
      }
    };
    fetchLocal();
    const handleUpdate = () => fetchLocal();
    window.addEventListener('pm_data_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('pm_data_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }

  if (!auth.currentUser) {
    onUpdate([]);
    return () => {};
  }
  const q = query(collection(db, ACTIVITY_COL), where('projectId', '==', projectId));
  return onSnapshot(
    q,
    (snap) => {
      const logs: ActivityLog[] = [];
      snap.forEach((docSnap) => {
        logs.push(docSnap.data() as ActivityLog);
      });
      logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onUpdate(logs);
    },
    (err) => {
      console.error('Firestore subscribeActivityLogs error:', err);
      if (onError) onError(err);
    }
  );
}

export async function logActivityInFirestore(
  data: Omit<ActivityLog, 'id' | 'createdAt'>
): Promise<void> {
  const id = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const log: ActivityLog = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_ACTIVITY_KEY);
      const logs: ActivityLog[] = stored ? JSON.parse(stored) : [];
      logs.push(log);
      localStorage.setItem(LOCAL_ACTIVITY_KEY, JSON.stringify(logs));
      notifyLocalChange();
    } catch (_) {}
    return;
  }
  await setDoc(doc(db, ACTIVITY_COL, id), cleanFirestoreData(log));
}

export async function clearProjectActivityLogsInFirestore(
  projectId: string,
  actor: User
): Promise<void> {
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_ACTIVITY_KEY);
      if (stored) {
        const logs: ActivityLog[] = JSON.parse(stored);
        const filtered = logs.filter((l) => l.projectId !== projectId);
        localStorage.setItem(LOCAL_ACTIVITY_KEY, JSON.stringify(filtered));
        notifyLocalChange();
      }
    } catch (_) {}
    return;
  }
  const q = query(collection(db, ACTIVITY_COL), where('projectId', '==', projectId));
  const snap = await getDocs(q);
  const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);

  await logActivityInFirestore({
    projectId,
    userId: actor.id,
    action: 'Cleared Activity',
    details: `${actor.name} cleared the project activity stream`,
  });
}

// ----------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------
export function subscribeNotifications(
  userId: string,
  onUpdate: (notifications: Notification[]) => void,
  onError?: (err: Error) => void
) {
  if (!isCloudSyncActive()) {
    const fetchLocal = () => {
      try {
        const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
        const notifs: Notification[] = stored ? JSON.parse(stored) : [];
        const userNotifs = notifs.filter((n) => n.userId === userId);
        userNotifs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        onUpdate(userNotifs);
      } catch (_) {
        onUpdate([]);
      }
    };
    fetchLocal();
    const handleUpdate = () => fetchLocal();
    window.addEventListener('pm_data_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('pm_data_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }

  if (!auth.currentUser) {
    onUpdate([]);
    return () => {};
  }
  const q = query(collection(db, NOTIFICATIONS_COL), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const notifications: Notification[] = [];
      snap.forEach((docSnap) => {
        notifications.push(docSnap.data() as Notification);
      });
      notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onUpdate(notifications);
    },
    (err) => {
      console.error('Firestore subscribeNotifications error:', err);
      if (onError) onError(err);
    }
  );
}

export async function createNotificationInFirestore(
  data: Omit<Notification, 'id' | 'read' | 'createdAt'>
): Promise<void> {
  const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const notification: Notification = {
    ...data,
    id,
    read: false,
    createdAt: new Date().toISOString(),
  };
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      const notifs: Notification[] = stored ? JSON.parse(stored) : [];
      notifs.push(notification);
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(notifs));
      notifyLocalChange();
    } catch (_) {}
    return;
  }
  await setDoc(doc(db, NOTIFICATIONS_COL, id), cleanFirestoreData(notification));
}

export async function markNotificationReadInFirestore(notificationId: string): Promise<void> {
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (stored) {
        const notifs: Notification[] = JSON.parse(stored);
        const target = notifs.find((n) => n.id === notificationId);
        if (target) {
          target.read = true;
          localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(notifs));
          notifyLocalChange();
        }
      }
    } catch (_) {}
    return;
  }
  const ref = doc(db, NOTIFICATIONS_COL, notificationId);
  await updateDoc(ref, { read: true });
}

export async function markAllNotificationsReadInFirestore(userId: string): Promise<void> {
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (stored) {
        const notifs: Notification[] = JSON.parse(stored);
        notifs.forEach((n) => {
          if (n.userId === userId) n.read = true;
        });
        localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(notifs));
        notifyLocalChange();
      }
    } catch (_) {}
    return;
  }
  const q = query(
    collection(db, NOTIFICATIONS_COL),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  const batchPromises: Promise<void>[] = [];
  snap.forEach((docSnap) => {
    batchPromises.push(updateDoc(doc(db, NOTIFICATIONS_COL, docSnap.id), { read: true }));
  });
  await Promise.all(batchPromises);
}

export async function deleteNotificationInFirestore(notificationId: string): Promise<void> {
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (stored) {
        const notifs: Notification[] = JSON.parse(stored);
        const filtered = notifs.filter((n) => n.id !== notificationId);
        localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(filtered));
        notifyLocalChange();
      }
    } catch (_) {}
    return;
  }
  const ref = doc(db, NOTIFICATIONS_COL, notificationId);
  await deleteDoc(ref);
}

export async function clearAllNotificationsInFirestore(userId: string): Promise<void> {
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (stored) {
        const notifs: Notification[] = JSON.parse(stored);
        const filtered = notifs.filter((n) => n.userId !== userId);
        localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(filtered));
        notifyLocalChange();
      }
    } catch (_) {}
    return;
  }
  const q = query(collection(db, NOTIFICATIONS_COL), where('userId', '==', userId));
  const snap = await getDocs(q);
  const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);
}

/**
 * Scan for tasks assigned to the user that are due within 24 hours or overdue,
 * and create a 'task_due_soon' notification if not already notified today.
 */
export async function checkAndNotifyDueTasksInFirestore(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const tasksQ = query(
      collection(db, TASKS_COL),
      where('assigneeIds', 'array-contains', userId)
    );
    const snap = await getDocs(tasksQ);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let createdCount = 0;

    for (const docSnap of snap.docs) {
      const task = docSnap.data() as Task;
      if (!task.dueDate) continue;

      // Skip completed tasks
      const isDone = (task.columnId || '').includes('done') || (task.columnId || '').includes('complete');
      if (isDone) continue;

      const due = new Date(task.dueDate);
      const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check if due within next 24h or overdue up to 48h
      if (diffHours <= 24 && diffHours >= -48) {
        // Check if we already sent a due notification for this task today
        const existingNotifQ = query(
          collection(db, NOTIFICATIONS_COL),
          where('userId', '==', userId),
          where('taskId', '==', task.id),
          where('type', '==', 'task_due_soon')
        );
        const existingSnap = await getDocs(existingNotifQ);
        const alreadyNotifiedToday = existingSnap.docs.some((nDoc) => {
          const nData = nDoc.data() as Notification;
          return nData.createdAt && nData.createdAt.startsWith(todayStr);
        });

        if (!alreadyNotifiedToday) {
          const isOverdue = diffHours < 0;
          await createNotificationInFirestore({
            userId,
            actorId: 'system',
            type: 'task_due_soon',
            taskId: task.id,
            taskTitle: task.title,
            projectId: task.projectId,
            message: isOverdue
              ? `Task "${task.title}" is overdue (due ${task.dueDate.split('T')[0]})`
              : `Task "${task.title}" is due soon (${due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`,
          });
          createdCount++;
        }
      }
    }
    return createdCount;
  } catch (err) {
    console.warn('Check due tasks notice:', err);
    return 0;
  }
}

// ----------------------------------------------------
// INVITATIONS & TEAM MEMBERSHIP SYSTEM
// ----------------------------------------------------

/**
 * Subscribe to real-time invitations for a specific project
 */
export function subscribeProjectInvitations(
  projectId: string,
  onUpdate: (invitations: ProjectInvitation[]) => void,
  onError?: (err: Error) => void
) {
  if (!isCloudSyncActive()) {
    const fetchLocal = () => {
      try {
        const stored = localStorage.getItem(LOCAL_INVITES_KEY);
        const list: ProjectInvitation[] = stored ? JSON.parse(stored) : [];
        const filtered = list.filter((i) => i.projectId === projectId);
        filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        onUpdate(filtered);
      } catch (_) {
        onUpdate([]);
      }
    };
    fetchLocal();
    const handleUpdate = () => fetchLocal();
    window.addEventListener('pm_data_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('pm_data_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }

  if (!auth.currentUser) {
    onUpdate([]);
    return () => {};
  }
  const q = query(collection(db, INVITATIONS_COL), where('projectId', '==', projectId));
  return onSnapshot(
    q,
    (snap) => {
      const list: ProjectInvitation[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as ProjectInvitation);
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onUpdate(list);
    },
    (err) => {
      console.error('Firestore subscribeProjectInvitations error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to real-time invitations for a specific user (by email or userId)
 */
export function subscribeUserInvitations(
  userEmail: string,
  userId: string,
  onUpdate: (invitations: ProjectInvitation[]) => void,
  onError?: (err: Error) => void
) {
  if (!isCloudSyncActive()) {
    const fetchLocal = () => {
      try {
        const stored = localStorage.getItem(LOCAL_INVITES_KEY);
        const list: ProjectInvitation[] = stored ? JSON.parse(stored) : [];
        const emailLower = (userEmail || '').trim().toLowerCase();
        const filtered = list.filter((i) =>
          i.status === 'pending' && (
            (emailLower && i.inviteeEmail === emailLower) ||
            (userId && i.inviteeId === userId)
          )
        );
        filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        onUpdate(filtered);
      } catch (_) {
        onUpdate([]);
      }
    };
    fetchLocal();
    const handleUpdate = () => fetchLocal();
    window.addEventListener('pm_data_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('pm_data_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }

  if (!auth.currentUser) {
    onUpdate([]);
    return () => {};
  }
  const emailLower = (userEmail || '').trim().toLowerCase();
  
  const constraints = [];
  if (emailLower) {
    constraints.push(where('inviteeEmail', '==', emailLower));
  }
  if (userId) {
    constraints.push(where('inviteeId', '==', userId));
  }

  // Fallback if both are empty (shouldn't happen based on App.tsx, but just in case)
  if (constraints.length === 0) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, INVITATIONS_COL),
    constraints.length > 1 ? or(...constraints) : constraints[0]
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: ProjectInvitation[] = [];
      snap.forEach((docSnap) => {
        const inv = docSnap.data() as ProjectInvitation;
        if (inv.status === 'pending') {
          list.push(inv);
        }
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onUpdate(list);
    },
    (err) => {
      console.error('Firestore subscribeUserInvitations error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Create a new Project Invitation
 */
export async function createInvitationInFirestore(
  data: {
    projectId: string;
    projectName: string;
    projectColor?: string;
    inviteeEmail: string;
    inviteeId?: string;
    role: MemberRole;
    note?: string;
  },
  inviter: User
): Promise<{ invitation: ProjectInvitation; previewUrl?: string | null; emailError?: string | null; emailSent?: boolean }> {
  const id = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const token = Math.random().toString(36).substring(2, 10).toUpperCase();
  const now = new Date().toISOString();

  const invitation: ProjectInvitation = {
    id,
    projectId: data.projectId,
    projectName: data.projectName,
    projectColor: data.projectColor || '#6366F1',
    inviterId: inviter.id,
    inviterName: inviter.name,
    inviterEmail: inviter.email,
    inviteeEmail: data.inviteeEmail.trim().toLowerCase(),
    role: data.role,
    status: 'pending',
    token,
    createdAt: now,
    ...(data.inviteeId ? { inviteeId: data.inviteeId } : {}),
    ...(data.note?.trim() ? { note: data.note.trim() } : {}),
  };

  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_INVITES_KEY);
      const list: ProjectInvitation[] = stored ? JSON.parse(stored) : [];
      list.push(invitation);
      localStorage.setItem(LOCAL_INVITES_KEY, JSON.stringify(list));
      notifyLocalChange();
    } catch (_) {}
    return { invitation, previewUrl: null, emailError: null, emailSent: false };
  }

  await setDoc(doc(db, INVITATIONS_COL, id), cleanFirestoreData(invitation));

  // Log activity in the project
  await logActivityInFirestore({
    projectId: data.projectId,
    userId: inviter.id,
    action: 'Invited Member',
    details: `${inviter.name} invited ${data.inviteeEmail} as ${data.role.toUpperCase()}`,
  });

  // If we know the user exists or have their id, send them a direct in-app notification
  let targetUserId = data.inviteeId;
  if (!targetUserId) {
    try {
      const userQ = query(
        collection(db, USERS_COL),
        where('email', '==', data.inviteeEmail.trim().toLowerCase()),
        limit(1)
      );
      const userSnap = await getDocs(userQ);
      if (!userSnap.empty) {
        targetUserId = userSnap.docs[0].id;
      }
    } catch {}
  }

  if (targetUserId && targetUserId !== inviter.id) {
    await createNotificationInFirestore({
      userId: targetUserId,
      actorId: inviter.id,
      type: 'project_invite',
      projectId: data.projectId,
      projectName: data.projectName,
      message: `${inviter.name} invited you to join "${data.projectName}" as ${data.role}`,
    });
  }

  // Send real email via backend
  let previewUrl: string | null = null;
  let emailError: string | null = null;
  let emailSent: boolean = false;

  try {
    const res = await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: data.inviteeEmail.trim().toLowerCase(),
        projectName: data.projectName,
        inviterName: inviter.name,
        role: data.role,
        note: data.note,
        token: token,
      }),
    });
    const emailRes = await res.json();
    if (res.ok) {
      emailSent = true;
      if (emailRes?.previewUrl) {
        previewUrl = emailRes.previewUrl;
      }
    } else {
      emailError = emailRes?.details || emailRes?.error || 'Could not send email';
      console.warn('Invitation email notice:', emailError);
    }
  } catch (err: any) {
    console.warn('Failed to dispatch email request:', err);
    emailError = err?.message || 'Error connecting to email service';
  }

  return { invitation, previewUrl, emailError, emailSent };
}

/**
 * Accept an invitation and add user to project
 */
export async function getInvitationByTokenInFirestore(
  token: string
): Promise<ProjectInvitation | null> {
  const cleanToken = token.trim().toUpperCase();
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_INVITES_KEY);
      const list: ProjectInvitation[] = stored ? JSON.parse(stored) : [];
      return list.find((i) => i.token === cleanToken && i.status === 'pending') || null;
    } catch (_) {
      return null;
    }
  }
  const q = query(
    collection(db, INVITATIONS_COL),
    where('token', '==', cleanToken),
    where('status', '==', 'pending'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as ProjectInvitation;
}

export async function acceptInvitationInFirestore(
  invitation: ProjectInvitation,
  user: User
): Promise<void> {
  const now = new Date().toISOString();

  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_INVITES_KEY);
      if (stored) {
        const list: ProjectInvitation[] = JSON.parse(stored);
        const idx = list.findIndex((i) => i.id === invitation.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], status: 'accepted', inviteeId: user.id, respondedAt: now };
          localStorage.setItem(LOCAL_INVITES_KEY, JSON.stringify(list));
          notifyLocalChange();
        }
      }
      const projStored = localStorage.getItem(LOCAL_PROJECTS_KEY);
      if (projStored) {
        const projs: Project[] = JSON.parse(projStored);
        const pIdx = projs.findIndex((p) => p.id === invitation.projectId);
        if (pIdx >= 0) {
          const currentMemberIds = projs[pIdx].memberIds || [];
          const updatedMemberIds = Array.from(new Set([...currentMemberIds, user.id]));
          const currentMembersMap = projs[pIdx].members || {};
          projs[pIdx] = {
            ...projs[pIdx],
            memberIds: updatedMemberIds,
            members: { ...currentMembersMap, [user.id]: invitation.role },
            updatedAt: now,
          };
          localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projs));
          notifyLocalChange();
        }
      }
    } catch (_) {}
    return;
  }

  // 1. Update invitation document
  const invRef = doc(db, INVITATIONS_COL, invitation.id);
  await updateDoc(invRef, cleanFirestoreData({
    status: 'accepted',
    inviteeId: user.id,
    respondedAt: now,
  }));

  // 2. Fetch project & update memberIds and members role map
  const projRef = doc(db, PROJECTS_COL, invitation.projectId);
  const projSnap = await getDoc(projRef);

  if (projSnap.exists()) {
    const projData = projSnap.data() as Project;
    const currentMemberIds = projData.memberIds || [];
    const updatedMemberIds = Array.from(new Set([...currentMemberIds, user.id]));

    const currentMembersMap = projData.members || {};
    const updatedMembersMap = {
      ...currentMembersMap,
      [user.id]: invitation.role,
    };

    await updateDoc(projRef, cleanFirestoreData({
      memberIds: updatedMemberIds,
      members: updatedMembersMap,
      updatedAt: now,
    }));

    // 3. Log activity
    await logActivityInFirestore({
      projectId: invitation.projectId,
      userId: user.id,
      action: 'Joined Project',
      details: `${user.name} accepted invitation and joined the project as ${invitation.role.toUpperCase()}`,
    });

    // 4. Notify inviter
    if (invitation.inviterId !== user.id) {
      await createNotificationInFirestore({
        userId: invitation.inviterId,
        actorId: user.id,
        type: 'project_invite_accepted',
        projectId: invitation.projectId,
        projectName: invitation.projectName,
        message: `${user.name} accepted your invitation to join "${invitation.projectName}"`,
      });
    }
  }
}

/**
 * Decline an invitation
 */
export async function declineInvitationInFirestore(
  invitationId: string,
  invitation: ProjectInvitation,
  user: User
): Promise<void> {
  const now = new Date().toISOString();

  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_INVITES_KEY);
      if (stored) {
        const list: ProjectInvitation[] = JSON.parse(stored);
        const idx = list.findIndex((i) => i.id === invitationId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], status: 'declined', inviteeId: user.id, respondedAt: now };
          localStorage.setItem(LOCAL_INVITES_KEY, JSON.stringify(list));
          notifyLocalChange();
        }
      }
    } catch (_) {}
    return;
  }

  const invRef = doc(db, INVITATIONS_COL, invitationId);
  await updateDoc(invRef, cleanFirestoreData({
    status: 'declined',
    inviteeId: user.id,
    respondedAt: now,
  }));

  // Log activity
  await logActivityInFirestore({
    projectId: invitation.projectId,
    userId: user.id,
    action: 'Declined Invitation',
    details: `${user.name} declined the invitation to join "${invitation.projectName}"`,
  });
}

/**
 * Revoke or Cancel an invitation
 */
export async function revokeInvitationInFirestore(
  invitationId: string,
  projectId: string,
  actor: User
): Promise<void> {
  if (!isCloudSyncActive()) {
    try {
      const stored = localStorage.getItem(LOCAL_INVITES_KEY);
      if (stored) {
        const list: ProjectInvitation[] = JSON.parse(stored);
        const filtered = list.filter((i) => i.id !== invitationId);
        localStorage.setItem(LOCAL_INVITES_KEY, JSON.stringify(filtered));
        notifyLocalChange();
      }
    } catch (_) {}
    return;
  }
  const invRef = doc(db, INVITATIONS_COL, invitationId);
  await deleteDoc(invRef);

  await logActivityInFirestore({
    projectId,
    userId: actor.id,
    action: 'Revoked Invitation',
    details: `${actor.name} canceled a pending project invitation`,
  });
}

/**
 * Clear all invitations for a project or globally from Firestore
 */
export async function clearAllInvitationsInFirestore(
  projectId?: string,
  actor?: User
): Promise<number> {
  try {
    let q;
    if (projectId) {
      q = query(collection(db, INVITATIONS_COL), where('projectId', '==', projectId));
    } else {
      q = query(collection(db, INVITATIONS_COL));
    }

    const snap = await getDocs(q);
    let count = 0;
    const deletePromises = snap.docs.map((d) => {
      count++;
      return deleteDoc(d.ref);
    });

    await Promise.all(deletePromises);

    if (projectId && actor) {
      await logActivityInFirestore({
        projectId,
        userId: actor.id,
        action: 'Cleared All Invitations',
        details: `${actor.name} cleared all pending invitations`,
      });
    }

    return count;
  } catch (err) {
    console.error('Error clearing invitations from Firestore:', err);
    throw err;
  }
}

/**
 * Update member's role inside a project (e.g. Owner, Admin, Manager, Member, Viewer)
 */
export async function updateMemberRoleInFirestore(
  projectId: string,
  memberId: string,
  newRole: MemberRole,
  actor: User
): Promise<void> {
  const projRef = doc(db, PROJECTS_COL, projectId);
  const snap = await getDoc(projRef);
  if (!snap.exists()) return;

  const proj = snap.data() as Project;
  const currentMembers = proj.members || {};
  const updatedMembers = {
    ...currentMembers,
    [memberId]: newRole,
  };

  await updateDoc(projRef, cleanFirestoreData({
    members: updatedMembers,
    updatedAt: new Date().toISOString(),
  }));

  await logActivityInFirestore({
    projectId,
    userId: actor.id,
    action: 'Updated Member Role',
    details: `${actor.name} changed user role to ${newRole.toUpperCase()}`,
  });

  if (memberId !== actor.id) {
    await createNotificationInFirestore({
      userId: memberId,
      actorId: actor.id,
      type: 'role_changed',
      projectId,
      projectName: proj.name,
      message: `${actor.name} updated your role in "${proj.name}" to ${newRole.toUpperCase()}`,
    });
  }
}

/**
 * Remove a member from a project
 */
export async function removeMemberFromProjectInFirestore(
  projectId: string,
  memberId: string,
  actor: User
): Promise<void> {
  const projRef = doc(db, PROJECTS_COL, projectId);
  const snap = await getDoc(projRef);
  if (!snap.exists()) return;

  const proj = snap.data() as Project;
  const updatedMemberIds = (proj.memberIds || []).filter((id) => id !== memberId);
  const updatedMembers = { ...(proj.members || {}) };
  delete updatedMembers[memberId];

  await updateDoc(projRef, cleanFirestoreData({
    memberIds: updatedMemberIds,
    members: updatedMembers,
    updatedAt: new Date().toISOString(),
  }));

  await logActivityInFirestore({
    projectId,
    userId: actor.id,
    action: 'Removed Member',
    details: `${actor.name} removed a member from the project`,
  });

  if (memberId !== actor.id) {
    await createNotificationInFirestore({
      userId: memberId,
      actorId: actor.id,
      type: 'member_removed',
      projectId,
      projectName: proj.name,
      message: `${actor.name} removed you from project "${proj.name}"`,
    });
  }
}
