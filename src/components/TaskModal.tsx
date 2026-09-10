import React, { useState, useEffect, useRef } from 'react';
import { Task, User, Column, Comment, ActivityLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { ConfirmModal } from './ConfirmModal';
import {
  subscribeComments,
  addCommentInFirestore,
  deleteCommentInFirestore,
  subscribeActivityLogs,
} from '../services/firestoreService';
import {
  X,
  Calendar,
  UserCheck,
  Tag,
  CheckSquare,
  MessageSquare,
  Clock,
  Trash2,
  Send,
  Plus,
  ArrowRight,
  History,
  AlertCircle,
} from 'lucide-react';

interface TaskModalProps {
  task: Task | null;
  columns: Column[];
  users: User[];
  onClose: () => void;
  onUpdateTask: (updated: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  columns,
  users,
  onClose,
  onUpdateTask,
  onDeleteTask,
}) => {
  const { currentUser } = useAuth();
  const { subscribe, sendTyping, currentTypingUsers } = useWebSocket();

  const [activeTab, setActiveTab] = useState<'details' | 'discussion' | 'history'>('discussion');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [subtasks, setSubtasks] = useState<Task['subtasks']>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  // Discussion / Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const taskId = task?.id;
  const taskProjectId = task?.projectId;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setColumnId(task.columnId);
      setPriority(task.priority);
      setDueDate(task.dueDate || '');
      setAssigneeIds(task.assigneeIds || []);
      setTags(task.tags || []);
      setSubtasks(task.subtasks || []);
    }
  }, [task]);

  useEffect(() => {
    if (!taskId || !taskProjectId) return;

    // Real-time Firestore subscription for comments
    const unsubscribeComments = subscribeComments(
      taskProjectId,
      taskId,
      (liveComments) => {
        setComments(liveComments);
      },
      (err) => {
        console.warn('Firestore comments subscription notice:', err.message);
        fetchComments(taskId);
      }
    );

    return () => unsubscribeComments();
  }, [taskId]);

  useEffect(() => {
    if (!taskProjectId) return;

    // Real-time Firestore subscription for task project activities
    const unsubscribeActivities = subscribeActivityLogs(
      taskProjectId,
      (liveActivities) => {
        setActivities(liveActivities);
      },
      (err) => {
        console.warn('Firestore activities subscription notice:', err.message);
      }
    );

    return () => unsubscribeActivities();
  }, [taskProjectId]);

  // Subscribe to real-time comments and updates
  useEffect(() => {
    if (!task) return;

    const unsubComment = subscribe('comment:created', (payload: { comment: Comment }) => {
      if (payload?.comment?.taskId === task.id) {
        setComments((prev) => {
          if (prev.some((c) => c.id === payload.comment.id)) return prev;
          return [...prev, payload.comment];
        });
      }
    });

    const unsubCommentDel = subscribe('comment:deleted', (payload: { commentId: string; taskId: string }) => {
      if (payload?.taskId === task.id) {
        setComments((prev) => prev.filter((c) => c.id !== payload.commentId));
      }
    });

    const unsubTaskUpdate = subscribe('task:updated', (updated: Task) => {
      if (updated?.id === task.id) {
        setTitle(updated.title);
        setDescription(updated.description || '');
        setColumnId(updated.columnId);
        setPriority(updated.priority);
        setDueDate(updated.dueDate || '');
        setAssigneeIds(updated.assigneeIds || []);
        setTags(updated.tags || []);
        setSubtasks(updated.subtasks || []);
      }
    });

    return () => {
      unsubComment();
      unsubCommentDel();
      unsubTaskUpdate();
    };
  }, [task, subscribe]);

  useEffect(() => {
    if (activeTab === 'discussion') {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, activeTab]);

  if (!task) return null;

  const fetchComments = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (e) {
      console.error('Failed to load comments:', e);
    }
  };

  const fetchActivities = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (e) {
      console.error('Failed to load activities:', e);
    }
  };

  const handleSaveField = async (changes: Partial<Task>) => {
    await onUpdateTask(changes);
  };

  const handleToggleAssignee = async (userId: string) => {
    const updated = assigneeIds.includes(userId)
      ? assigneeIds.filter((id) => id !== userId)
      : [...assigneeIds, userId];
    setAssigneeIds(updated);
    await handleSaveField({ assigneeIds: updated });
  };

  const handleAddTag = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      const val = newTagInput.trim();
      if (!tags.includes(val)) {
        const updated = [...tags, val];
        setTags(updated);
        setNewTagInput('');
        await handleSaveField({ tags: updated });
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    await handleSaveField({ tags: updated });
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;
    const newItem = {
      id: `chk-${Date.now()}`,
      text: newSubtaskText.trim(),
      completed: false,
    };
    const updated = [...subtasks, newItem];
    setSubtasks(updated);
    setNewSubtaskText('');
    await handleSaveField({ subtasks: updated });
  };

  const handleToggleSubtask = async (chkId: string) => {
    const updated = subtasks.map((c) => (c.id === chkId ? { ...c, completed: !c.completed } : c));
    setSubtasks(updated);
    await handleSaveField({ subtasks: updated });
  };

  const handleDeleteSubtask = async (chkId: string) => {
    const updated = subtasks.filter((c) => c.id !== chkId);
    setSubtasks(updated);
    await handleSaveField({ subtasks: updated });
  };

  // Comment input typing indicator
  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCommentText(e.target.value);
    sendTyping(task.id, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(task.id, false);
    }, 1800);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentUser) return;

    const commentText = newCommentText.trim();
    try {
      setIsSubmittingComment(true);
      sendTyping(task.id, false);
      setNewCommentText('');

      // Write directly to Firestore real-time database
      await addCommentInFirestore(
        {
          taskId: task.id,
          projectId: task.projectId,
          text: commentText,
          taskTitle: task.title,
        },
        currentUser
      );

      // Also trigger backend REST endpoint for broadcast
      fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: commentText,
          userId: currentUser.id,
        }),
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to post comment to Firestore:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser || !task) return;
    try {
      await deleteCommentInFirestore(
        commentId,
        task.projectId,
        task.id,
        task.title,
        currentUser
      );
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      console.error('Failed to delete comment from Firestore:', e);
      try {
        await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } catch (err) {
        console.error('Failed to delete comment via REST:', err);
      }
    }
  };

  const taskActivities = activities.filter((a) => a.taskId === task.id);
  const typingInThisTask = currentTypingUsers.filter((u) => u.taskId === task.id && u.userId !== currentUser?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-0 sm:p-6 overflow-y-auto">
      <div
        id="task-detail-modal"
        className="bg-white rounded-sm border border-zinc-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex-1 min-w-0 pr-4">
            <input
              id="task-modal-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() !== task.title && handleSaveField({ title: title.trim() })}
              placeholder="Task title..."
              className="text-lg font-bold text-zinc-900 w-full bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-blue-500 focus:outline-hidden px-1 py-0.5 rounded transition-colors"
            />
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
              <span>Column:</span>
              <select
                id="task-column-select"
                value={columnId}
                onChange={(e) => {
                  setColumnId(e.target.value);
                  handleSaveField({ columnId: e.target.value });
                }}
                className="font-medium text-zinc-700 bg-white border border-zinc-200 rounded px-2 py-0.5 focus:ring-1 focus:ring-blue-500"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              <span className="text-zinc-300">•</span>

              <span>Priority:</span>
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => {
                  const p = e.target.value as Task['priority'];
                  setPriority(p);
                  handleSaveField({ priority: p });
                }}
                className="font-semibold capitalize text-zinc-700 bg-white border border-zinc-200 rounded px-2 py-0.5 focus:ring-1 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <button
            id="close-task-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 px-5 bg-white text-xs font-semibold gap-6">
          <button
            id="task-tab-discussion"
            onClick={() => setActiveTab('discussion')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'discussion'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Discussion & Comments</span>
            <span className="ml-0.5 bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded-full text-[10px]">
              {comments.length}
            </span>
          </button>

          <button
            id="task-tab-details"
            onClick={() => setActiveTab('details')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Subtasks & Metadata</span>
            {subtasks.length > 0 && (
              <span className="ml-0.5 bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded-full text-[10px]">
                {subtasks.filter((c) => c.completed).length}/{subtasks.length}
              </span>
            )}
          </button>

          <button
            id="task-tab-history"
            onClick={() => setActiveTab('history')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 sleek-scrollbar">
          {activeTab === 'discussion' && (
            <div className="space-y-4">
              {/* Task Summary Banner */}
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-sm p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Assigned to:</span>
                  <div className="flex items-center -space-x-1">
                    {assigneeIds.length > 0 ? (
                      users
                        .filter((u) => assigneeIds.includes(u.id))
                        .map((u) => (
                          <img
                            key={u.id}
                            src={u.avatar}
                            alt={u.name}
                            title={u.name}
                            className="w-6 h-6 rounded-full border-2 border-white object-cover"
                          />
                        ))
                    ) : (
                      <span className="text-zinc-400 italic">None</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-500">Due:</span>
                  <span className="font-semibold text-zinc-700">
                    {dueDate ? new Date(dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date'}
                  </span>
                </div>
              </div>

              {/* Comments Feed */}
              <div className="space-y-3 min-h-[220px]">
                {comments.length === 0 ? (
                  <div className="text-center py-10 text-zinc-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                    <p className="text-sm font-medium text-zinc-600">No comments yet</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Start a discussion with your team on this task.
                    </p>
                  </div>
                ) : (
                  comments.map((comment) => {
                    const author = users.find((u) => u.id === comment.userId);
                    const isMe = comment.userId === currentUser?.id;
                    return (
                      <div
                        key={comment.id}
                        id={`task-comment-${comment.id}`}
                        className="flex items-start gap-3 group"
                      >
                        <img
                          src={author?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                          alt={author?.name || 'User'}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-200 mt-0.5 shrink-0"
                        />
                        <div className="flex-1 bg-zinc-50 hover:bg-zinc-100/70 rounded-sm p-3 border border-zinc-200/70 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-zinc-900">
                                {author?.name || 'Teammate'}
                              </span>
                              {author?.role === 'admin' && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                                  Admin
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-400">
                                {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                                {new Date(comment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>

                            {isMe && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                title="Delete comment"
                                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-600 rounded transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Typing indicator */}
              {typingInThisTask.length > 0 && (
                <div className="text-xs text-zinc-500 italic flex items-center gap-1.5 animate-pulse pl-11">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  <span>{typingInThisTask.map((t) => t.userName).join(', ')} is typing...</span>
                </div>
              )}

              {/* Add Comment Input */}
              <form onSubmit={handlePostComment} className="flex items-center gap-2 pt-2 border-t border-zinc-200">
                <img
                  src={currentUser?.avatar}
                  alt={currentUser?.name}
                  className="w-8 h-8 rounded-full object-cover border border-zinc-200 shrink-0"
                />
                <input
                  id="task-new-comment-input"
                  type="text"
                  value={newCommentText}
                  onChange={handleCommentChange}
                  placeholder={`Comment as ${currentUser?.name || 'User'}...`}
                  className="flex-1 px-3.5 py-2 text-xs border border-zinc-300 rounded-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  id="task-send-comment-btn"
                  disabled={!newCommentText.trim() || isSubmittingComment}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 text-white rounded-sm text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-100 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Description</label>
                <textarea
                  id="task-description-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => description !== task.description && handleSaveField({ description })}
                  rows={4}
                  placeholder="Add a detailed description, acceptance criteria, or context..."
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Assignees selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Assigned Team Members
                </label>
                <div className="flex flex-wrap gap-2">
                  {users.map((u) => {
                    const isAssigned = assigneeIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        id={`assignee-toggle-${u.id}`}
                        onClick={() => handleToggleAssignee(u.id)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm border text-xs font-medium transition-all ${
                          isAssigned
                            ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        <img src={u.avatar} alt={u.name} className="w-4 h-4 rounded-full object-cover" />
                        <span>{u.name}</span>
                        {isAssigned && <span className="text-[10px] text-blue-600 font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Due Date & Tags row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Due Date</label>
                  <input
                    id="task-due-date-input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      handleSaveField({ dueDate: e.target.value });
                    }}
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Tags</label>
                  <div className="flex flex-wrap gap-1.5 items-center mb-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 text-xs font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-zinc-400 hover:text-zinc-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    id="task-add-tag-input"
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Type tag and press Enter..."
                    className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                    <span>Subtasks</span>
                  </label>
                  {subtasks.length > 0 && (
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {subtasks.filter((c) => c.completed).length} of {subtasks.length} done
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  {subtasks.map((chk) => (
                    <div
                      key={chk.id}
                      className="flex items-center justify-between p-2 rounded-sm bg-zinc-50 border border-zinc-200/80 group"
                    >
                      <label className="flex items-center gap-2 text-xs cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={chk.completed}
                          onChange={() => handleToggleSubtask(chk.id)}
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span
                          className={`truncate ${
                            chk.completed ? 'line-through text-zinc-400' : 'text-zinc-800'
                          }`}
                        >
                          {chk.text}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubtask(chk.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <input
                    id="task-new-subtask-input"
                    type="text"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    placeholder="Add a new subtask..."
                    className="flex-1 px-3 py-1.5 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    id="task-add-subtask-btn"
                    disabled={!newSubtaskText.trim()}
                    className="px-3 py-1.5 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-sm disabled:opacity-50"
                  >
                    Add Subtask
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-zinc-700">Activity Log for this Task</h4>
              {taskActivities.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-6 text-center">
                  No activity logged yet for this task.
                </p>
              ) : (
                <div className="space-y-2 divide-y divide-slate-100">
                  {taskActivities.map((act) => {
                    const user = users.find((u) => u.id === act.userId);
                    return (
                      <div key={act.id} className="pt-2 flex items-start gap-2.5 text-xs">
                        <img
                          src={user?.avatar}
                          alt={user?.name}
                          className="w-5 h-5 rounded-full object-cover mt-0.5"
                        />
                        <div className="flex-1">
                          <p className="text-zinc-800">
                            <span className="font-semibold text-zinc-900">{user?.name}</span>{' '}
                            {act.details}
                          </p>
                          <span className="text-[10px] text-zinc-400">
                            {new Date(act.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-200 bg-zinc-50">
          <button
            type="button"
            id="delete-task-btn"
            onClick={() => setIsConfirmingDelete(true)}
            className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3.5 py-2 rounded-sm text-xs font-bold transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Task</span>
          </button>

          <button
            type="button"
            id="close-task-btn"
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmingDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This task and all its subtasks and discussion history will be permanently deleted.`}
        confirmLabel="Delete Task"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await onDeleteTask(task.id);
            setIsConfirmingDelete(false);
            onClose();
          } finally {
            setIsDeleting(false);
          }
        }}
        onClose={() => setIsConfirmingDelete(false)}
      />
    </div>
  );
};
