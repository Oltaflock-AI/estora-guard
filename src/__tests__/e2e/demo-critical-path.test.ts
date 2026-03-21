import { describe, it, expect } from 'vitest';

/**
 * Demo Critical Path Verification
 *
 * The minimum viable demo loop is:
 *   Upload PDF -> Extraction review (risk flags visible) ->
 *   Create Transaction -> Agreement Workspace -> Transaction detail
 *
 * These tests verify that all components in the chain exist, are importable,
 * and have the correct interfaces. Full E2E browser testing would require
 * Playwright/Cypress with a running Supabase instance.
 */

describe('Demo Critical Path - Component Imports', () => {
  it('DocumentDropzone is importable', async () => {
    const mod = await import('@/components/DocumentDropzone');
    expect(mod.default).toBeDefined();
  });

  it('ExtractionViewer is importable', async () => {
    const mod = await import('@/components/ExtractionViewer');
    expect(mod.default).toBeDefined();
  });

  it('RiskFlagPanel is importable', async () => {
    const mod = await import('@/components/RiskFlagPanel');
    expect(mod.default).toBeDefined();
  });

  it('HealthBar is importable', async () => {
    const mod = await import('@/components/HealthBar');
    expect(mod.default).toBeDefined();
  });

  it('TimelineView is importable', async () => {
    const mod = await import('@/components/TimelineView');
    expect(mod.default).toBeDefined();
  });

  it('TaskList is importable', async () => {
    const mod = await import('@/components/TaskList');
    expect(mod.default).toBeDefined();
  });

  it('EditCanvas is importable', async () => {
    const mod = await import('@/components/EditCanvas');
    expect(mod.default).toBeDefined();
  });

  it('SectionNavigator is importable', async () => {
    const mod = await import('@/components/SectionNavigator');
    expect(mod.default).toBeDefined();
  });

  it('ValidationPanel is importable', async () => {
    const mod = await import('@/components/ValidationPanel');
    expect(mod.default).toBeDefined();
  });

  it('AuditTrail is importable', async () => {
    const mod = await import('@/components/AuditTrail');
    expect(mod.default).toBeDefined();
  });

  it('ErrorBoundary is importable', async () => {
    const mod = await import('@/components/ErrorBoundary');
    expect(mod.default).toBeDefined();
  });

  it('OfflineBanner is importable', async () => {
    const mod = await import('@/components/OfflineBanner');
    expect(mod.default).toBeDefined();
  });

  it('MobileReadOnlyGuard is importable', async () => {
    const mod = await import('@/components/MobileReadOnlyGuard');
    expect(mod.default).toBeDefined();
  });
});

describe('Demo Critical Path - Service Imports', () => {
  it('health-service exports computeHealthScore', async () => {
    const mod = await import('@/lib/services/health-service');
    expect(mod.computeHealthScore).toBeDefined();
    expect(typeof mod.computeHealthScore).toBe('function');
  });

  it('audit-service exports createAuditEvent', async () => {
    const mod = await import('@/lib/services/audit-service');
    expect(mod.createAuditEvent).toBeDefined();
    expect(typeof mod.createAuditEvent).toBe('function');
  });

  it('agreement-schema exports AGREEMENT_SECTIONS', async () => {
    const mod = await import('@/lib/agreement-schema');
    expect(mod.AGREEMENT_SECTIONS).toBeDefined();
    expect(Array.isArray(mod.AGREEMENT_SECTIONS)).toBe(true);
    expect(mod.AGREEMENT_SECTIONS.length).toBeGreaterThan(0);
  });

  it('utils exports all required formatters', async () => {
    const mod = await import('@/lib/utils');
    expect(mod.formatCurrency).toBeDefined();
    expect(mod.formatDate).toBeDefined();
    expect(mod.formatAddress).toBeDefined();
    expect(mod.getHealthColor).toBeDefined();
    expect(mod.getHealthBgClass).toBeDefined();
  });
});

describe('Demo Critical Path - Type Completeness', () => {
  it('types module is importable without errors', async () => {
    const mod = await import('@/lib/types');
    expect(mod).toBeDefined();
  });
});

describe('Demo Critical Path - Page Route Structure', () => {
  it('dashboard page exists', async () => {
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const pagePath = join(process.cwd(), 'src/app/dashboard/page.tsx');
    expect(existsSync(pagePath)).toBe(true);
  });

  it('extraction review page exists', async () => {
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const pagePath = join(process.cwd(), 'src/app/dashboard/documents/[id]/page.tsx');
    expect(existsSync(pagePath)).toBe(true);
  });

  it('transaction detail page exists', async () => {
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const pagePath = join(process.cwd(), 'src/app/dashboard/transactions/[id]/page.tsx');
    expect(existsSync(pagePath)).toBe(true);
  });

  it('agreement workspace page exists', async () => {
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const pagePath = join(process.cwd(), 'src/app/dashboard/agreements/[id]/page.tsx');
    expect(existsSync(pagePath)).toBe(true);
  });

  it('upload API route exists', async () => {
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const routePath = join(process.cwd(), 'src/app/api/documents/upload/route.ts');
    expect(existsSync(routePath)).toBe(true);
  });

  it('create-transaction API route exists', async () => {
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const routePath = join(process.cwd(), 'src/app/api/documents/[id]/create-transaction/route.ts');
    expect(existsSync(routePath)).toBe(true);
  });

  it('loading page exists for dashboard', async () => {
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const pagePath = join(process.cwd(), 'src/app/dashboard/loading.tsx');
    expect(existsSync(pagePath)).toBe(true);
  });

  it('error page exists for dashboard', async () => {
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const pagePath = join(process.cwd(), 'src/app/dashboard/error.tsx');
    expect(existsSync(pagePath)).toBe(true);
  });
});
