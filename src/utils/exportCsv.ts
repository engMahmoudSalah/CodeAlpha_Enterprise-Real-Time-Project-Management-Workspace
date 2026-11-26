import { Project, Task, User } from '../types';

const esc = (v: string) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // block spreadsheet formula injection
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export function tasksToCsv(project: Project, tasks: Task[], users: User[]): string {
  const col = new Map(project.columns.map((c) => [c.id, c.title]));
  const who = new Map(users.map((u) => [u.id, u.name]));
  const head = ['Title', 'Status', 'Priority', 'Due date', 'Assignees', 'Tags', 'Subtasks done', 'Description'];
  const rows = tasks.map((t) => [
    t.title,
    col.get(t.columnId) || '',
    t.priority,
    t.dueDate || '',
    t.assigneeIds.map((i) => who.get(i) || i).join('; '),
    (t.tags || []).join('; '),
    t.subtasks ? t.subtasks.filter((s) => (s as { completed?: boolean; done?: boolean }).completed || (s as { done?: boolean }).done).length + '/' + t.subtasks.length : '0/0',
    t.description || '',
  ]);
  return '\ufeff' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}

export function downloadCsv(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-tasks.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
