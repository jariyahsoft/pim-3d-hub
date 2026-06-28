import { describe, it, expect, beforeEach } from 'vitest';
import { createAdminAuditService } from './admin-audit.js';
// eslint-disable-next-line no-restricted-imports
import { createInMemoryAuditLogRepository } from '@pim/infrastructure';
import type { AuditLogRepository } from '@pim/domain';
import { parseUuidv7 } from '@pim/domain';

describe('Admin Audit Service', () => {
  let auditLogRepository: AuditLogRepository;
  let adminAuditService: ReturnType<typeof createAdminAuditService>;
  let currentTime: Date;
  let idCounter: number;

  const mockUserId = parseUuidv7('01234567-89ab-7def-8000-000000000001');
  const mockResourceId = parseUuidv7('01234567-89ab-7def-8000-000000000002');

  beforeEach(() => {
    currentTime = new Date('2026-06-28T23:00:00.000Z');
    idCounter = 1;

    auditLogRepository = createInMemoryAuditLogRepository({
      generateId: () =>
        parseUuidv7(
          `01234567-89ab-7def-8000-00000000${String(idCounter++).padStart(4, '0')}`,
        ),
      now: () => currentTime,
    });

    adminAuditService = createAdminAuditService({
      auditLogRepository,
      now: () => currentTime,
    });
  });

  describe('createAuditLog', () => {
    it('should create an audit log entry with minimal fields', async () => {
      const result = await adminAuditService.createAuditLog(mockUserId, {
        action: 'USER_CREATED',
        resourceType: 'User',
        resourceId: mockResourceId,
      });

      expect(result.id).toBeDefined();
      expect(result.action).toBe('USER_CREATED');
      expect(result.actorUserId).toBe(mockUserId);
      expect(result.actorType).toBe('USER');
      expect(result.resourceType).toBe('User');
      expect(result.resourceId).toBe(mockResourceId);
      expect(result.outcome).toBe('SUCCESS');
      expect(result.reason).toBeNull();
      expect(result.changeDiff).toBeNull();
    });

    it('should create an audit log entry with all fields', async () => {
      const changeDiff = { status: { from: 'active', to: 'suspended' } };
      const metadata = { reviewedBy: 'admin-team', severity: 'high' };

      const result = await adminAuditService.createAuditLog(mockUserId, {
        action: 'USER_SUSPENDED',
        actorType: 'ADMIN',
        resourceType: 'User',
        resourceId: mockResourceId,
        outcome: 'SUCCESS',
        reason: 'Violation of terms of service',
        changeDiff,
        metadata,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        requestId: 'req-123',
        traceId: 'trace-456',
      });

      expect(result.action).toBe('USER_SUSPENDED');
      expect(result.actorType).toBe('ADMIN');
      expect(result.outcome).toBe('SUCCESS');
      expect(result.reason).toBe('Violation of terms of service');
      expect(result.changeDiff).toEqual(changeDiff);
      expect(result.metadata).toEqual(metadata);
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(result.requestId).toBe('req-123');
      expect(result.traceId).toBe('trace-456');
    });

    it('should create system actor audit log', async () => {
      const result = await adminAuditService.createAuditLog(null, {
        action: 'ORDER_TRANSITIONED',
        actorType: 'SYSTEM',
        resourceType: 'Order',
        resourceId: mockResourceId,
      });

      expect(result.actorUserId).toBeNull();
      expect(result.actorType).toBe('SYSTEM');
    });
  });

  describe('listAuditLogs', () => {
    it('should allow ADMIN to access audit logs', async () => {
      // Create some audit entries
      await adminAuditService.createAuditLog(mockUserId, {
        action: 'USER_CREATED',
        resourceType: 'User',
        resourceId: mockResourceId,
      });

      const result = await adminAuditService.listAuditLogs(mockUserId, 'ADMIN');

      expect(result.length).toBe(1);
      expect(result[0]?.action).toBe('USER_CREATED');
    });

    it('should allow SUPERADMIN to access audit logs', async () => {
      await adminAuditService.createAuditLog(mockUserId, {
        action: 'PERMISSION_GRANTED',
        resourceType: 'Permission',
        resourceId: mockResourceId,
      });

      const result = await adminAuditService.listAuditLogs(
        mockUserId,
        'SUPERADMIN',
      );

      expect(result.length).toBe(1);
      expect(result[0]?.action).toBe('PERMISSION_GRANTED');
    });

    it('should deny SUPPORT access to audit logs', async () => {
      await expect(
        adminAuditService.listAuditLogs(mockUserId, 'SUPPORT'),
      ).rejects.toThrow('Insufficient permissions to access audit logs');
    });

    it('should deny MODERATOR access to audit logs', async () => {
      await expect(
        adminAuditService.listAuditLogs(mockUserId, 'MODERATOR'),
      ).rejects.toThrow('Insufficient permissions to access audit logs');
    });

    it('should deny FINANCE access to audit logs', async () => {
      await expect(
        adminAuditService.listAuditLogs(mockUserId, 'FINANCE'),
      ).rejects.toThrow('Insufficient permissions to access audit logs');
    });

    it('should filter audit logs by action', async () => {
      await adminAuditService.createAuditLog(mockUserId, {
        action: 'USER_CREATED',
        resourceType: 'User',
        resourceId: mockResourceId,
      });

      await adminAuditService.createAuditLog(mockUserId, {
        action: 'ORDER_CREATED',
        resourceType: 'Order',
        resourceId: mockResourceId,
      });

      const result = await adminAuditService.listAuditLogs(
        mockUserId,
        'ADMIN',
        {
          action: 'USER_CREATED',
        },
      );

      expect(result.length).toBe(1);
      expect(result[0]?.action).toBe('USER_CREATED');
    });

    it('should filter audit logs by resource', async () => {
      const resource1 = parseUuidv7('01234567-89ab-7def-8000-000000000010');
      const resource2 = parseUuidv7('01234567-89ab-7def-8000-000000000020');

      await adminAuditService.createAuditLog(mockUserId, {
        action: 'USER_UPDATED',
        resourceType: 'User',
        resourceId: resource1,
      });

      await adminAuditService.createAuditLog(mockUserId, {
        action: 'USER_UPDATED',
        resourceType: 'User',
        resourceId: resource2,
      });

      const result = await adminAuditService.listAuditLogs(
        mockUserId,
        'ADMIN',
        {
          resourceId: resource1,
        },
      );

      expect(result.length).toBe(1);
      expect(result[0]?.resourceId).toBe(resource1);
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask KYC data for SUPPORT role', async () => {
      const kycData: Record<string, unknown> = {
        nationalId: '1234567890123',
        taxId: 'TAX-123456',
        dateOfBirth: '1990-01-01',
        address: '123 Main St, City',
        name: 'John Doe',
      };

      const masked = await adminAuditService.maskSensitiveData(
        kycData,
        'SUPPORT',
        'kyc',
      );

      expect(masked['nationalId']).toBe('***MASKED***');
      expect(masked['taxId']).toBe('***MASKED***');
      expect(masked['dateOfBirth']).toBe('***MASKED***');
      expect(masked['address']).toBe('***MASKED***');
      expect(masked['name']).toBe('John Doe');
    });

    it('should NOT mask KYC data for FINANCE role', async () => {
      const kycData: Record<string, unknown> = {
        nationalId: '1234567890123',
        taxId: 'TAX-123456',
        dateOfBirth: '1990-01-01',
        address: '123 Main St, City',
      };

      const masked = await adminAuditService.maskSensitiveData(
        kycData,
        'FINANCE',
        'kyc',
      );

      expect(masked['nationalId']).toBe('1234567890123');
      expect(masked['taxId']).toBe('TAX-123456');
      expect(masked['dateOfBirth']).toBe('1990-01-01');
      expect(masked['address']).toBe('123 Main St, City');
    });

    it('should NOT mask KYC data for ADMIN role', async () => {
      const kycData: Record<string, unknown> = {
        nationalId: '1234567890123',
        taxId: 'TAX-123456',
      };

      const masked = await adminAuditService.maskSensitiveData(
        kycData,
        'ADMIN',
        'kyc',
      );

      expect(masked['nationalId']).toBe('1234567890123');
      expect(masked['taxId']).toBe('TAX-123456');
    });

    it('should mask payment data for non-FINANCE roles', async () => {
      const paymentData: Record<string, unknown> = {
        bankAccount: '1234567890',
        paymentMethod: 'BANK_TRANSFER',
        amount: 50000,
      };

      const masked = await adminAuditService.maskSensitiveData(
        paymentData,
        'SUPPORT',
        'payment',
      );

      expect(masked['bankAccount']).toBe('***MASKED***');
      expect(masked['paymentMethod']).toBe('***MASKED***');
      expect(masked['amount']).toBe('***MASKED***');
    });

    it('should NOT mask payment data for FINANCE role', async () => {
      const paymentData: Record<string, unknown> = {
        bankAccount: '1234567890',
        paymentMethod: 'BANK_TRANSFER',
        amount: 50000,
      };

      const masked = await adminAuditService.maskSensitiveData(
        paymentData,
        'FINANCE',
        'payment',
      );

      expect(masked['bankAccount']).toBe('1234567890');
      expect(masked['paymentMethod']).toBe('BANK_TRANSFER');
      expect(masked['amount']).toBe(50000);
    });

    it('should mask user email for SUPPORT role', async () => {
      const userData: Record<string, unknown> = {
        email: 'john.doe@example.com',
        phone: '+66812345678',
        name: 'John Doe',
      };

      const masked = await adminAuditService.maskSensitiveData(
        userData,
        'SUPPORT',
        'user',
      );

      expect(masked['email']).toBe('jo***@example.com');
      expect(masked['phone']).toBe('***5678');
      expect(masked['name']).toBe('John Doe');
    });

    it('should mask user email for MODERATOR role', async () => {
      const userData: Record<string, unknown> = {
        email: 'jane@test.com',
        phone: '+1234567890',
      };

      const masked = await adminAuditService.maskSensitiveData(
        userData,
        'MODERATOR',
        'user',
      );

      expect(masked['email']).toBe('ja***@test.com');
      expect(masked['phone']).toBe('***7890');
    });

    it('should NOT mask user data for ADMIN role', async () => {
      const userData: Record<string, unknown> = {
        email: 'admin@example.com',
        phone: '+66812345678',
      };

      const masked = await adminAuditService.maskSensitiveData(
        userData,
        'ADMIN',
        'user',
      );

      expect(masked['email']).toBe('admin@example.com');
      expect(masked['phone']).toBe('+66812345678');
    });
  });

  describe('executeHighRiskAction', () => {
    it('should execute high-risk action with valid reason', async () => {
      const result = await adminAuditService.executeHighRiskAction(
        mockUserId,
        'ADMIN',
        {
          actionType: 'USER_SUSPENDED',
          reason:
            'User violated community guidelines by posting spam content repeatedly',
          resourceType: 'User',
          resourceId: mockResourceId,
        },
      );

      expect(result.action).toBe('USER_SUSPENDED');
      expect(result.outcome).toBe('SUCCESS');
      expect(result.reason).toBe(
        'User violated community guidelines by posting spam content repeatedly',
      );
      expect(result.actorType).toBe('ADMIN');
      expect(result.metadata).toEqual({
        staffRole: 'ADMIN',
        highRisk: true,
      });
    });

    it('should reject high-risk action with short reason', async () => {
      await expect(
        adminAuditService.executeHighRiskAction(mockUserId, 'ADMIN', {
          actionType: 'USER_SUSPENDED',
          reason: 'spam',
          resourceType: 'User',
          resourceId: mockResourceId,
        }),
      ).rejects.toThrow(
        'High-risk actions require a detailed reason (minimum 10 characters)',
      );
    });

    it('should reject high-risk action with empty reason', async () => {
      await expect(
        adminAuditService.executeHighRiskAction(mockUserId, 'ADMIN', {
          actionType: 'USER_SUSPENDED',
          reason: '',
          resourceType: 'User',
          resourceId: mockResourceId,
        }),
      ).rejects.toThrow(
        'High-risk actions require a detailed reason (minimum 10 characters)',
      );
    });

    it('should reject high-risk action with overly long reason', async () => {
      const longReason = 'a'.repeat(1001);

      await expect(
        adminAuditService.executeHighRiskAction(mockUserId, 'ADMIN', {
          actionType: 'USER_SUSPENDED',
          reason: longReason,
          resourceType: 'User',
          resourceId: mockResourceId,
        }),
      ).rejects.toThrow('Reason must not exceed 1000 characters');
    });

    it('should reject USER_SUSPENDED for SUPPORT role', async () => {
      await expect(
        adminAuditService.executeHighRiskAction(mockUserId, 'SUPPORT', {
          actionType: 'USER_SUSPENDED',
          reason: 'Valid reason with sufficient length',
          resourceType: 'User',
          resourceId: mockResourceId,
        }),
      ).rejects.toThrow('Insufficient permissions to suspend users');
    });

    it('should reject USER_SUSPENDED for MODERATOR role', async () => {
      await expect(
        adminAuditService.executeHighRiskAction(mockUserId, 'MODERATOR', {
          actionType: 'USER_SUSPENDED',
          reason: 'Valid reason with sufficient length',
          resourceType: 'User',
          resourceId: mockResourceId,
        }),
      ).rejects.toThrow('Insufficient permissions to suspend users');
    });

    it('should reject ORDER_CANCELLED for non-privileged roles', async () => {
      await expect(
        adminAuditService.executeHighRiskAction(mockUserId, 'MODERATOR', {
          actionType: 'ORDER_CANCELLED',
          reason: 'Valid cancellation reason',
          resourceType: 'Order',
          resourceId: mockResourceId,
        }),
      ).rejects.toThrow('Insufficient permissions to cancel orders');
    });

    it('should allow ADMIN to cancel orders', async () => {
      const result = await adminAuditService.executeHighRiskAction(
        mockUserId,
        'ADMIN',
        {
          actionType: 'ORDER_CANCELLED',
          reason: 'Customer requested cancellation before production started',
          resourceType: 'Order',
          resourceId: mockResourceId,
        },
      );

      expect(result.action).toBe('ORDER_CANCELLED');
      expect(result.outcome).toBe('SUCCESS');
    });

    it('should reject DISPUTE_RESOLVED for SUPPORT role', async () => {
      await expect(
        adminAuditService.executeHighRiskAction(mockUserId, 'SUPPORT', {
          actionType: 'DISPUTE_RESOLVED',
          reason: 'Valid dispute resolution reason',
          resourceType: 'Dispute',
          resourceId: mockResourceId,
        }),
      ).rejects.toThrow('Insufficient permissions to resolve disputes');
    });

    it('should allow FINANCE to resolve disputes', async () => {
      const result = await adminAuditService.executeHighRiskAction(
        mockUserId,
        'FINANCE',
        {
          actionType: 'DISPUTE_RESOLVED',
          reason:
            'Evidence shows provider delivered as agreed. Dispute rejected.',
          resourceType: 'Dispute',
          resourceId: mockResourceId,
        },
      );

      expect(result.action).toBe('DISPUTE_RESOLVED');
      expect(result.outcome).toBe('SUCCESS');
    });

    it('should reject PERMISSION_GRANTED for non-SUPERADMIN roles', async () => {
      await expect(
        adminAuditService.executeHighRiskAction(mockUserId, 'ADMIN', {
          actionType: 'PERMISSION_GRANTED',
          reason: 'User promoted to moderator role',
          resourceType: 'Permission',
          resourceId: mockResourceId,
        }),
      ).rejects.toThrow('Insufficient permissions to grant permissions');
    });

    it('should allow SUPERADMIN to grant permissions', async () => {
      const result = await adminAuditService.executeHighRiskAction(
        mockUserId,
        'SUPERADMIN',
        {
          actionType: 'PERMISSION_GRANTED',
          reason: 'User promoted to moderator role after 6-month probation',
          resourceType: 'Permission',
          resourceId: mockResourceId,
        },
      );

      expect(result.action).toBe('PERMISSION_GRANTED');
      expect(result.outcome).toBe('SUCCESS');
    });
  });

  describe('audit log immutability', () => {
    it('should not expose update or delete methods on repository', async () => {
      const log = await adminAuditService.createAuditLog(mockUserId, {
        action: 'USER_CREATED',
        resourceType: 'User',
        resourceId: mockResourceId,
      });

      // Verify repository doesn't have update/delete methods
      expect('update' in auditLogRepository).toBe(false);
      expect('delete' in auditLogRepository).toBe(false);

      // Verify audit log exists
      const retrieved = await auditLogRepository.findById(log.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.action).toBe('USER_CREATED');
    });

    it('should create multiple audit logs without mutation', async () => {
      const log1 = await adminAuditService.createAuditLog(mockUserId, {
        action: 'USER_CREATED',
        resourceType: 'User',
        resourceId: mockResourceId,
      });

      const log2 = await adminAuditService.createAuditLog(mockUserId, {
        action: 'USER_UPDATED',
        resourceType: 'User',
        resourceId: mockResourceId,
      });

      // Both logs should exist unchanged
      const retrieved1 = await auditLogRepository.findById(log1.id);
      const retrieved2 = await auditLogRepository.findById(log2.id);

      expect(retrieved1!.action).toBe('USER_CREATED');
      expect(retrieved2!.action).toBe('USER_UPDATED');
    });
  });

  describe('staff permission matrix', () => {
    it('should enforce SUPPORT permissions', async () => {
      // SUPPORT can manage orders
      const result = await adminAuditService.executeHighRiskAction(
        mockUserId,
        'SUPPORT',
        {
          actionType: 'ORDER_TRANSITIONED',
          reason: 'Customer service escalation - order marked as shipped',
          resourceType: 'Order',
          resourceId: mockResourceId,
        },
      );
      expect(result.action).toBe('ORDER_TRANSITIONED');

      // SUPPORT cannot access audit log
      await expect(
        adminAuditService.listAuditLogs(mockUserId, 'SUPPORT'),
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should enforce MODERATOR permissions', async () => {
      // MODERATOR can take moderation actions
      const result = await adminAuditService.executeHighRiskAction(
        mockUserId,
        'MODERATOR',
        {
          actionType: 'MODERATION_ACTION_TAKEN',
          reason: 'Content removed for violating community guidelines',
          resourceType: 'Content',
          resourceId: mockResourceId,
        },
      );
      expect(result.action).toBe('MODERATION_ACTION_TAKEN');

      // MODERATOR cannot manage users
      await expect(
        adminAuditService.executeHighRiskAction(mockUserId, 'MODERATOR', {
          actionType: 'USER_SUSPENDED',
          reason: 'Valid reason with sufficient length',
          resourceType: 'User',
          resourceId: mockResourceId,
        }),
      ).rejects.toThrow('Insufficient permissions to suspend users');
    });

    it('should enforce FINANCE permissions', async () => {
      // FINANCE can view full KYC
      const kycData: Record<string, unknown> = { nationalId: '1234567890123' };
      const masked = await adminAuditService.maskSensitiveData(
        kycData,
        'FINANCE',
        'kyc',
      );
      expect(masked['nationalId']).toBe('1234567890123');

      // FINANCE can view finance data
      const paymentData: Record<string, unknown> = { amount: 50000 };
      const maskedPayment = await adminAuditService.maskSensitiveData(
        paymentData,
        'FINANCE',
        'payment',
      );
      expect(maskedPayment['amount']).toBe(50000);

      // FINANCE cannot access audit log
      await expect(
        adminAuditService.listAuditLogs(mockUserId, 'FINANCE'),
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should enforce ADMIN permissions', async () => {
      // ADMIN can access audit log
      const logs = await adminAuditService.listAuditLogs(mockUserId, 'ADMIN');
      expect(Array.isArray(logs)).toBe(true);

      // ADMIN can manage users
      const result = await adminAuditService.executeHighRiskAction(
        mockUserId,
        'ADMIN',
        {
          actionType: 'USER_SUSPENDED',
          reason: 'Valid reason with sufficient length',
          resourceType: 'User',
          resourceId: mockResourceId,
        },
      );
      expect(result.action).toBe('USER_SUSPENDED');

      // ADMIN cannot grant permissions
      await expect(
        adminAuditService.executeHighRiskAction(mockUserId, 'ADMIN', {
          actionType: 'PERMISSION_GRANTED',
          reason: 'Valid reason with sufficient length',
          resourceType: 'Permission',
          resourceId: mockResourceId,
        }),
      ).rejects.toThrow('Insufficient permissions to grant permissions');
    });

    it('should enforce SUPERADMIN permissions', async () => {
      // SUPERADMIN can grant permissions
      const result = await adminAuditService.executeHighRiskAction(
        mockUserId,
        'SUPERADMIN',
        {
          actionType: 'PERMISSION_GRANTED',
          reason: 'Promoted user to admin role after review',
          resourceType: 'Permission',
          resourceId: mockResourceId,
        },
      );
      expect(result.action).toBe('PERMISSION_GRANTED');

      // SUPERADMIN can access audit log
      const logs = await adminAuditService.listAuditLogs(
        mockUserId,
        'SUPERADMIN',
      );
      expect(Array.isArray(logs)).toBe(true);
    });
  });
});
