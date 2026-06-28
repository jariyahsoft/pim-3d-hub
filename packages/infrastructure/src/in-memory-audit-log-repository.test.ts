import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryAuditLogRepository } from './in-memory-audit-log-repository.js';
import type { AuditLogRepository } from '@pim/domain';
import { parseUuidv7 } from '@pim/domain';

describe('In-Memory Audit Log Repository', () => {
  let repository: AuditLogRepository;
  let currentTime: Date;
  let idCounter: number;

  const mockUserId = parseUuidv7('01234567-89ab-7def-8000-000000000001');
  const mockResourceId = parseUuidv7('01234567-89ab-7def-8000-000000000002');

  beforeEach(() => {
    currentTime = new Date('2026-06-28T23:00:00.000Z');
    idCounter = 1;

    repository = createInMemoryAuditLogRepository({
      generateId: () =>
        parseUuidv7(
          `01234567-89ab-7def-8000-00000000${String(idCounter++).padStart(4, '0')}`,
        ),
      now: () => currentTime,
    });
  });

  describe('create', () => {
    it('should create an audit log entry with default values', async () => {
      const result = await repository.create({
        action: 'USER_CREATED',
        resourceType: 'User',
        resourceId: mockResourceId,
      });

      expect(result.id).toBeDefined();
      expect(result.action).toBe('USER_CREATED');
      expect(result.resourceType).toBe('User');
      expect(result.resourceId).toBe(mockResourceId);
      expect(result.actorType).toBe('USER');
      expect(result.outcome).toBe('SUCCESS');
      expect(result.actorUserId).toBeNull();
      expect(result.reason).toBeNull();
      expect(result.requestId).toBeNull();
      expect(result.traceId).toBeNull();
      expect(result.ipAddress).toBeNull();
      expect(result.userAgent).toBeNull();
      expect(result.changeDiff).toBeNull();
      expect(result.metadata).toEqual({});
      expect(result.createdAt).toBe(currentTime.toISOString());
      expect(result.version).toBe(1);
    });

    it('should create an audit log entry with all fields', async () => {
      const result = await repository.create({
        action: 'USER_SUSPENDED',
        actorType: 'ADMIN',
        actorUserId: mockUserId,
        resourceType: 'User',
        resourceId: mockResourceId,
        outcome: 'SUCCESS',
        reason: 'Test reason',
        changeDiff: { from: 'active', to: 'suspended' },
        metadata: { test: 'value' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestId: 'req-1',
        traceId: 'trace-1',
      });

      expect(result.action).toBe('USER_SUSPENDED');
      expect(result.actorType).toBe('ADMIN');
      expect(result.actorUserId).toBe(mockUserId);
      expect(result.reason).toBe('Test reason');
      expect(result.ipAddress).toBe('127.0.0.1');
      expect(result.userAgent).toBe('test-agent');
      expect(result.requestId).toBe('req-1');
      expect(result.traceId).toBe('trace-1');
    });

    it('should preserve explicit id when provided', async () => {
      const explicitId = parseUuidv7('01234567-89ab-7def-8000-000000000099');

      const result = await repository.create({
        id: explicitId,
        action: 'USER_CREATED',
        resourceType: 'User',
        resourceId: mockResourceId,
      });

      expect(result.id).toBe(explicitId);
    });
  });

  describe('findById', () => {
    it('should return null for non-existent id', async () => {
      const id = parseUuidv7('01234567-89ab-7def-8000-000000000999');
      const result = await repository.findById(id);
      expect(result).toBeNull();
    });

    it('should return the audit log when found', async () => {
      const created = await repository.create({
        action: 'USER_CREATED',
        resourceType: 'User',
        resourceId: mockResourceId,
      });

      const found = await repository.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.action).toBe('USER_CREATED');
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      // Create some test data
      await repository.create({
        action: 'USER_CREATED',
        resourceType: 'User',
        resourceId: mockResourceId,
      });

      await repository.create({
        action: 'USER_UPDATED',
        resourceType: 'User',
        resourceId: mockResourceId,
      });

      await repository.create({
        action: 'ORDER_CREATED',
        resourceType: 'Order',
        resourceId: mockResourceId,
      });
    });

    it('should list all audit logs', async () => {
      const result = await repository.list({
        limit: 10,
        sort: { direction: 'desc', field: 'createdAt' },
      });

      expect(result.items.length).toBe(3);
    });

    it('should filter by action', async () => {
      const result = await repository.list({
        filter: { action: 'USER_CREATED' },
        limit: 10,
        sort: { direction: 'desc', field: 'createdAt' },
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0]?.action).toBe('USER_CREATED');
    });

    it('should filter by resourceType', async () => {
      const result = await repository.list({
        filter: { resourceType: 'Order' },
        limit: 10,
        sort: { direction: 'desc', field: 'createdAt' },
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0]?.resourceType).toBe('Order');
    });

    it('should sort ascending when requested', async () => {
      const result = await repository.list({
        limit: 10,
        sort: { direction: 'asc', field: 'createdAt' },
      });

      expect(result.items.length).toBe(3);
      // First item should be the oldest (USER_CREATED)
      expect(result.items[0]?.action).toBe('USER_CREATED');
    });

    it('should sort descending when requested', async () => {
      const result = await repository.list({
        limit: 10,
        sort: { direction: 'desc', field: 'createdAt' },
      });

      expect(result.items.length).toBe(3);
    });

    it('should respect limit', async () => {
      const result = await repository.list({
        limit: 2,
        sort: { direction: 'desc', field: 'createdAt' },
      });

      expect(result.items.length).toBe(2);
    });
  });

  describe('immutability', () => {
    it('should not expose update method', () => {
      expect('update' in repository).toBe(false);
    });

    it('should not expose delete method', () => {
      expect('delete' in repository).toBe(false);
    });

    it('should not expose softDelete method', () => {
      expect('softDelete' in repository).toBe(false);
    });

    it('should only have create, findById, and list methods', () => {
      const methods = Object.keys(repository).sort();
      expect(methods).toEqual(['create', 'findById', 'list']);
    });
  });
});
