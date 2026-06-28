import { describe, it, expect, beforeEach } from 'vitest'
import {
  createOrderService,
  type OrderServicePorts,
  OrderNotFoundError,
  InvalidOrderStateError,
} from './order.js'
import {
  createInMemoryOrderRepository,
  createInMemoryOrderItemRepository,
  createInMemoryOrderStatusEventRepository,
  createInMemoryProposalRepository,
  createInMemoryProposalMilestoneRepository,
} from '@pim/testkit'
import {
  createMoneyMinor,
  parseUuidv7,
  parseUtcTimestamp,
  type ProviderProfileRepository,
  type ServiceRequestRepository,
  type UserRepository,
} from '@pim/domain'

describe('OrderService', () => {
  let service: ReturnType<typeof createOrderService>
  let ports: OrderServicePorts

  const clock = {
    now: () => parseUtcTimestamp('2026-06-28T14:20:00.000Z'),
  }

  const uuidGenerator = {
    next: (() => {
      let counter = 1
      return () =>
        parseUuidv7(`01234567-89ab-7000-8000-${String(counter++).padStart(12, '0')}`)
    })(),
  }

  const buyerUserId = parseUuidv7('01234567-89ab-7000-8000-000000000001')
  const providerUserId = parseUuidv7('01234567-89ab-7000-8000-000000000002')
  const providerProfileId = parseUuidv7('01234567-89ab-7000-8000-000000000010')
  const serviceRequestId = parseUuidv7('01234567-89ab-7000-8000-000000000020')

  const mockProviderProfileRepository: ProviderProfileRepository = {
    findById: async (id: any) => ({
      id,
      ownerUserId: providerUserId,
      status: 'ACTIVE',
      businessName: 'Test Provider',
      createdAt: clock.now(),
      createdBy: null,
      deletedAt: null,
      updatedAt: clock.now(),
      updatedBy: null,
      version: 1,
      schemaVersion: 1,
    } as any),
  } as any

  const mockServiceRequestRepository: ServiceRequestRepository = {
    findById: async (id: any) => ({
      id,
      buyerUserId,
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      createdAt: clock.now(),
      createdBy: null,
      deletedAt: null,
      updatedAt: clock.now(),
      updatedBy: null,
      version: 1,
      schemaVersion: 1,
    } as any),
  } as any

  const mockUserRepository: UserRepository = {
    findById: async (id: any) => ({
      id,
      displayName: id === buyerUserId ? 'Test Buyer' : 'Test Provider',
      email: id === buyerUserId ? 'buyer@test.com' : 'provider@test.com',
      phone: '+66812345678',
      createdAt: clock.now(),
      createdBy: null,
      deletedAt: null,
      updatedAt: clock.now(),
      updatedBy: null,
      version: 1,
      schemaVersion: 1,
    } as any),
  } as any

  beforeEach(() => {
    const proposalRepository = createInMemoryProposalRepository(clock, uuidGenerator)

    ports = {
      clock,
      uuidGenerator,
      orderRepository: createInMemoryOrderRepository(clock, uuidGenerator),
      orderItemRepository: createInMemoryOrderItemRepository(clock, uuidGenerator),
      orderStatusEventRepository: createInMemoryOrderStatusEventRepository(
        clock,
        uuidGenerator,
      ),
      proposalRepository,
      providerProfileRepository: mockProviderProfileRepository,
      serviceRequestRepository: mockServiceRequestRepository,
      userRepository: mockUserRepository,
    }
    service = createOrderService(ports)
  })

  describe('createOrderFromProposal', () => {
    it('should create order from accepted proposal', async () => {
      // Create an accepted proposal first
      const proposal = await ports.proposalRepository.create({
        id: parseUuidv7('01234567-89ab-7000-8000-000000000030'),
        serviceRequestId,
        providerProfileId,
        status: 'ACCEPTED',
        revisionNumber: 1,
        currency: 'THB',
        totalAmount: createMoneyMinor(100000, 'THB'),
        lineItems: [
          {
            amount: createMoneyMinor(100000, 'THB'),
            description: '3D printing service',
            itemType: 'SERVICE',
            quantity: 1,
          },
        ],
        notes: 'Test proposal',
        createdBy: providerUserId,
      })

      const result = await service.createOrderFromProposal({
        actorUserId: buyerUserId,
        proposalId: proposal.id,
        idempotencyKey: 'test-key-001',
        expectedProposalVersion: proposal.version,
      })

      expect(result.id).toBeDefined()
      expect(result.orderNumber).toMatch(/^ORD-\d{8}-\d{5}$/)
      expect(result.status).toBe('AWAITING_PROVIDER_CONFIRMATION')
      expect(result.buyerUserId).toBe(buyerUserId)
      expect(result.providerProfileId).toBe(providerProfileId)
      expect(result.totalAmount.minorUnits).toBe(100000)
      expect(result.sourceSnapshot.sourceType).toBe('PROPOSAL')
      expect(result.sourceSnapshot.sourceId).toBe(proposal.id)
      expect(result.buyerSnapshot.displayName).toBe('Test Buyer')
      expect(result.providerSnapshot.displayName).toBe('Test Provider')
    })

    it('should throw error if proposal not accepted', async () => {
      const proposal = await ports.proposalRepository.create({
        serviceRequestId,
        providerProfileId,
        status: 'SUBMITTED',
        revisionNumber: 1,
        currency: 'THB',
        totalAmount: createMoneyMinor(100000, 'THB'),
        lineItems: [
          {
            amount: createMoneyMinor(100000, 'THB'),
            description: '3D printing service',
            itemType: 'SERVICE',
            quantity: 1,
          },
        ],
        createdBy: providerUserId,
      })

      await expect(
        service.createOrderFromProposal({
          actorUserId: buyerUserId,
          proposalId: proposal.id,
          idempotencyKey: 'test-key-002',
          expectedProposalVersion: proposal.version,
        }),
      ).rejects.toThrow(InvalidOrderStateError)
    })

    it('should throw error if wrong actor', async () => {
      const proposal = await ports.proposalRepository.create({
        serviceRequestId,
        providerProfileId,
        status: 'ACCEPTED',
        revisionNumber: 1,
        currency: 'THB',
        totalAmount: createMoneyMinor(100000, 'THB'),
        lineItems: [
          {
            amount: createMoneyMinor(100000, 'THB'),
            description: '3D printing service',
            itemType: 'SERVICE',
            quantity: 1,
          },
        ],
        createdBy: providerUserId,
      })

      await expect(
        service.createOrderFromProposal({
          actorUserId: providerUserId, // Provider trying to create order
          proposalId: proposal.id,
          idempotencyKey: 'test-key-003',
          expectedProposalVersion: proposal.version,
        }),
      ).rejects.toThrow('Only buyer can create order')
    })
  })
})
