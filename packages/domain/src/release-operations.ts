// ── Deployment checklist item ─────────────────────────────────────────────

export type ChecklistItemStatus =
  | 'PASS'
  | 'NEEDS_SETUP'
  | 'NEEDS_REVIEW'
  | 'PENDING'
  | 'BLOCKED';

export type DeploymentChecklistItem = Readonly<{
  assignee: string;
  evidence: string;
  itemId: string;
  label: string;
  status: ChecklistItemStatus;
}>;

export type DeploymentRelease = Readonly<{
  checklist: readonly DeploymentChecklistItem[];
  createdAt: string;
  releaseVersion: string;
  summaryStatus: 'READY' | 'BLOCKED' | 'IN_PROGRESS';
}>;

// ── Migration readiness gate ──────────────────────────────────────────────

export type MigrationDecision = 'REMAIN' | 'PREPARE' | 'EXECUTE';

export type MigrationReadinessGate = Readonly<{
  adrVersion: number;
  decision: MigrationDecision;
  decisionDate: string;
  evidenceLinks: readonly string[];
  thresholdsMet: boolean;
}>;

// ── Dual-write configuration ──────────────────────────────────────────────

export type DualWriteConfig = Readonly<{
  enabled: boolean;
  reconciliationJobCron: string;
  shadowReadPercentage: number; // 0–100
  targetDatabase: 'POSTGRESQL' | 'MONGODB';
}>;

// ── Validation ────────────────────────────────────────────────────────────

export class ReleaseOperationBlockedError extends Error {
  readonly code = 'RELEASE_BLOCKED';
  readonly blockedItems: readonly string[];
  readonly status = 412;

  constructor(blockedItems: readonly string[]) {
    super(`Release blocked by: ${blockedItems.join(', ')}`);
    this.name = 'ReleaseOperationBlockedError';
    this.blockedItems = blockedItems;
  }
}

export function validateReleaseReadiness(release: DeploymentRelease): void {
  if (release.summaryStatus === 'BLOCKED') {
    const blocked = release.checklist
      .filter((i) => i.status === 'BLOCKED')
      .map((i) => i.itemId);
    throw new ReleaseOperationBlockedError(blocked);
  }
  const pending = release.checklist.filter(
    (i) =>
      i.status === 'PENDING' ||
      i.status === 'NEEDS_SETUP' ||
      i.status === 'NEEDS_REVIEW',
  );
  if (pending.length > 0) {
    throw new ReleaseOperationBlockedError(
      pending.map((i) => `${i.itemId} (${i.status})`),
    );
  }
}

// ── Migration decision validation ─────────────────────────────────────────

export class MigrationNotReadyError extends Error {
  readonly code = 'MIGRATION_NOT_READY';
  readonly status = 412;
  constructor(msg: string) {
    super(msg);
    this.name = 'MigrationNotReadyError';
  }
}

export function validateMigrationDecision(gate: MigrationReadinessGate): void {
  if (gate.decision === 'EXECUTE' && !gate.thresholdsMet) {
    throw new MigrationNotReadyError('Thresholds not met for execution');
  }
  if (!gate.evidenceLinks.length) {
    throw new MigrationNotReadyError(
      'Evidence links required for any decision',
    );
  }
}
