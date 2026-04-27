'use client';

import { useState, useMemo, useCallback } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { SeverityBadge } from '@/components/ui/Badge';
import { formatDateShort } from '@/lib/utils';
import type { Task } from '@/lib/types';

interface TaskListProps {
  tasks: Task[];
  contractId: string;
  perspective?: 'buyer' | 'seller';
  onHealthUpdate?: (health: {
    score: number;
    status: string;
    overdue: number;
    dueSoon: number;
    onTrack: number;
  }) => void;
}

type TaskGroup = 'overdue' | 'upcoming' | 'complete';

function groupLabel(group: TaskGroup, count: number): string {
  switch (group) {
    case 'overdue':
      return `${count} OVERDUE`;
    case 'upcoming':
      return `${count} UPCOMING`;
    case 'complete':
      return `${count} COMPLETE`;
  }
}

function groupLabelColor(group: TaskGroup): string {
  switch (group) {
    case 'overdue':
      return 'text-error';
    case 'upcoming':
      return 'text-navy';
    case 'complete':
      return 'text-success';
  }
}

function getTaskGroup(task: Task): TaskGroup {
  if (task.status === 'done') return 'complete';
  if (task.status === 'overdue') return 'overdue';
  if (task.due_at && new Date(task.due_at) < new Date()) {
    return 'overdue';
  }
  return 'upcoming';
}

function TaskCheckbox({
  status,
  group,
  onClick,
  disabled,
}: {
  status: string;
  group: TaskGroup;
  onClick: () => void;
  disabled: boolean;
}) {
  if (status === 'done') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center transition-colors"
        style={{ backgroundColor: 'var(--color-gold)' }}
        aria-label="Mark incomplete"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className="text-white"
        >
          <path
            d="M2 5.5L4 7.5L8 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  const borderColor =
    group === 'overdue' ? 'var(--color-error)' : 'var(--color-border)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 hover:border-gold transition-colors"
      style={{ borderColor }}
      aria-label="Mark complete"
    />
  );
}

export default function TaskList({
  tasks,
  contractId,
  perspective,
  onHealthUpdate,
}: TaskListProps) {
  const [optimisticTasks, setOptimisticTasks] = useState<Map<string, string>>(
    new Map()
  );
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const effectiveTasks = useMemo(
    () =>
      tasks
        .filter((t) => {
          if (!perspective) return true;
          return t.audience === perspective || t.audience === 'both';
        })
        .map((t) => ({
          ...t,
          status: (optimisticTasks.get(t.id) ?? t.status) as Task['status'],
        })),
    [tasks, optimisticTasks, perspective]
  );

  const grouped = useMemo(() => {
    const groups: Record<TaskGroup, Task[]> = {
      overdue: [],
      upcoming: [],
      complete: [],
    };

    for (const task of effectiveTasks) {
      groups[getTaskGroup(task)].push(task);
    }

    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const bySeverity = (a: Task, b: Task) =>
      (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);

    groups.overdue.sort(bySeverity);
    groups.upcoming.sort((a, b) => {
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    });
    groups.complete.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return groups;
  }, [effectiveTasks]);

  const handleToggle = useCallback(
    async (task: Task) => {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      const taskId = task.id;

      setOptimisticTasks((prev) => new Map(prev).set(taskId, newStatus));
      setPendingIds((prev) => new Set(prev).add(taskId));

      try {
        const res = await fetch(
          `/api/transactions/${contractId}/tasks/${taskId}/status`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          }
        );

        if (!res.ok) throw new Error('Failed to update task');

        const data = await res.json();
        if (data.health && onHealthUpdate) {
          onHealthUpdate(data.health);
        }
      } catch {
        setOptimisticTasks((prev) => {
          const next = new Map(prev);
          next.delete(taskId);
          return next;
        });
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    },
    [contractId, onHealthUpdate]
  );

  if (effectiveTasks.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-secondary italic">
          {perspective ? `No ${perspective}-side tasks` : 'No tasks yet'}
        </p>
      </div>
    );
  }

  const groupOrder: TaskGroup[] = ['overdue', 'upcoming', 'complete'];

  return (
    <div className="space-y-4">
      {groupOrder.map((group) => {
        const items = grouped[group];
        if (items.length === 0) return null;

        return (
          <div key={group}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[10px] font-mono font-medium tracking-wider ${groupLabelColor(group)}`}
              >
                {groupLabel(group, items.length)}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-1">
              {items.map((task, i) => {
                const taskGroup = getTaskGroup(task);
                const isPending = pendingIds.has(task.id);

                return (
                  <div
                    key={task.id}
                    className={`
                      flex items-start gap-3 px-3 py-2.5 rounded-md
                      transition-all duration-150
                      ${task.status === 'done' ? 'opacity-60' : 'hover:bg-surface-sunken/50'}
                      ${isPending ? 'opacity-50' : ''}
                      stagger-in
                    `}
                    style={{ '--i': i } as React.CSSProperties}
                  >
                    <div className="pt-0.5">
                      <TaskCheckbox
                        status={task.status}
                        group={taskGroup}
                        onClick={() => handleToggle(task)}
                        disabled={isPending}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-tight ${
                          task.status === 'done'
                            ? 'line-through text-secondary'
                            : taskGroup === 'overdue'
                              ? 'text-primary font-medium'
                              : 'text-primary'
                        }`}
                      >
                        {task.title}
                      </p>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {task.due_at && (
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-[11px] tabular-nums ${
                              taskGroup === 'overdue'
                                ? 'text-error'
                                : 'text-secondary'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {formatDateShort(task.due_at)}
                          </span>
                        )}

                        {task.severity &&
                          task.severity !== 'medium' &&
                          task.status !== 'done' && (
                            <SeverityBadge severity={task.severity} />
                          )}

                        {taskGroup === 'overdue' && task.status !== 'done' && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-error font-medium">
                            <AlertCircle className="w-3 h-3" />
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
