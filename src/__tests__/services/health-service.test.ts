import { describe, it, expect, vi } from 'vitest';

function computeHealthLocal(tasks: Array<{
  status: string;
  severity: string;
  due_at: string | null;
}>) {
  const SEVERITY_WEIGHTS: Record<string, number> = {
    critical: 3.0,
    high: 2.0,
    medium: 1.0,
    low: 0.5,
  };

  const now = new Date();
  const dueSoonThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  let overdueCount = 0;
  let dueSoonCount = 0;
  let onTrackCount = 0;
  let overdueWeighted = 0;
  let dueSoonWeighted = 0;
  let hasCriticalOverdue = false;

  for (const task of tasks) {
    const weight = SEVERITY_WEIGHTS[task.severity] ?? 1.0;

    if (task.status === 'done') {
      onTrackCount++;
      continue;
    }

    const dueAt = task.due_at ? new Date(task.due_at) : null;
    const isOverdue =
      task.status === 'overdue' ||
      (dueAt !== null && dueAt <= now && (task.status === 'todo' || task.status === 'in_progress'));

    if (isOverdue) {
      overdueCount++;
      overdueWeighted += weight;
      if (task.severity === 'critical') hasCriticalOverdue = true;
      continue;
    }

    if (dueAt && dueAt > now && dueAt <= dueSoonThreshold) {
      dueSoonCount++;
      dueSoonWeighted += weight;
      continue;
    }

    onTrackCount++;
  }

  let status: string;
  if (hasCriticalOverdue || overdueWeighted >= 3.0) {
    status = 'red';
  } else if (overdueWeighted >= 1.0 || dueSoonCount > 0) {
    status = 'yellow';
  } else {
    status = 'green';
  }

  const score = Math.max(0, Math.min(100, Math.round(100 - overdueWeighted * 15 - dueSoonWeighted * 5)));

  return { score, status, overdueCount, dueSoonCount, onTrackCount };
}

describe('Health Score Computation', () => {
  it('returns green/100 when all tasks are done', () => {
    const result = computeHealthLocal([
      { status: 'done', severity: 'critical', due_at: '2026-01-01T00:00:00Z' },
      { status: 'done', severity: 'high', due_at: '2026-01-05T00:00:00Z' },
    ]);
    expect(result.status).toBe('green');
    expect(result.score).toBe(100);
    expect(result.onTrackCount).toBe(2);
  });

  it('returns red when critical task is overdue', () => {
    const result = computeHealthLocal([
      { status: 'overdue', severity: 'critical', due_at: '2025-01-01T00:00:00Z' },
      { status: 'done', severity: 'medium', due_at: '2026-01-05T00:00:00Z' },
    ]);
    expect(result.status).toBe('red');
    expect(result.overdueCount).toBe(1);
  });

  it('returns red when overdue weighted score >= 3', () => {
    const result = computeHealthLocal([
      { status: 'overdue', severity: 'high', due_at: '2025-01-01T00:00:00Z' },
      { status: 'overdue', severity: 'medium', due_at: '2025-01-01T00:00:00Z' },
    ]);
    expect(result.status).toBe('red');
    expect(result.overdueCount).toBe(2);
  });

  it('returns yellow when tasks are due soon', () => {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    const result = computeHealthLocal([
      { status: 'todo', severity: 'medium', due_at: tomorrow.toISOString() },
      { status: 'done', severity: 'high', due_at: '2026-01-05T00:00:00Z' },
    ]);
    expect(result.status).toBe('yellow');
    expect(result.dueSoonCount).toBe(1);
  });

  it('deducts 15 per weighted overdue and 5 per weighted due-soon', () => {
    const result = computeHealthLocal([
      { status: 'overdue', severity: 'medium', due_at: '2025-01-01T00:00:00Z' },
    ]);
    expect(result.score).toBe(85);
  });

  it('score never goes below 0', () => {
    const result = computeHealthLocal([
      { status: 'overdue', severity: 'critical', due_at: '2025-01-01T00:00:00Z' },
      { status: 'overdue', severity: 'critical', due_at: '2025-01-01T00:00:00Z' },
      { status: 'overdue', severity: 'critical', due_at: '2025-01-01T00:00:00Z' },
    ]);
    expect(result.score).toBe(0);
  });
});
