import { describe, it, expect, beforeEach } from 'vitest'
import {
  createProposalService,
  type ProposalServicePorts,
  ProposalNotFoundError,
  InvalidProposalStateError,
} from './proposal.js'
import {
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

describe('ProposalService', () => {
  let service: ReturnType<typeof createProposalService>
  let ports: ProposalServicePorts

  const clock = {
    now: () => parseUtcTimestamp('2026-06-28T14:00:00.000Z'),
  }

  const uuidGenerator = {
    next: (() => {
      let counter = 1
      return () => parseUuidv7(`01234567-89ab-7000-8000-${String(counter++).padStart(12, '0')}`)
    })(),
  }

  const mockProviderProfileRepository: ProviderProfileRepository = {
    findById: async (id: any) => ({
      id,
      ownerUserId: parseUuidv7('01234567-89ab-7000-8000-000000000001'),
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
      buyerUserId: parseUuidv7('01234567-89ab-7000-8000-000000000002'),
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

  const mockUserRepository: UserRepository = {} as any

  beforeEach(() => {
    ports = {
      clock,
      uuidGenerator,
      proposalRepository: createInMemoryProposalRepository(clock, uuidGenerator),
      milestoneRepository: createInMemoryProposalMilestoneRepository(clock, uuidGenerator),
      providerProfileRepository: mockProviderProfileRepository,
      serviceRequestRepository: mockServiceRequestRepository,
      userRepository: mockUserRepository,
    }
    service = createProposalService(ports)
  })

  describe('submitProposal', () => {
    it('should submit a proposal with line items', async () => {
      const actorUserId = parseUuidv7('01234567-89ab-7000-8000-000000000001')
      const providerProfileId = parseUuidv7('01234567-89ab-7000-8000-000000000010')
      const serviceRequestId = parseUuidv7('01234567-89ab-7000-8000-000000000020')

      const result = await service.submitProposal({
        actorUserId,
        providerProfileId,
        serviceRequestId,
        currency: 'USD',
        lineItems: [
          {
            amount: createMoneyMinor(10000, 'USD'),
            description: '3D printing service',
            itemType: 'SERVICE',
            quantity: 1,
          },
        ],
        notes: 'Test proposal',
      })

      expect(result.id).toBeDefined()
      expect(result.status).toBe('SUBMITTED')
      expect(result.revisionNumber).toBe(1)
      expect(result.totalAmount.minorUnits).toBe(10000)
      expect(result.lineItems).toHaveLength(1)
    })

    it('should submit a proposal with milestones', async () => {
      const actorUserId = parseUuidv7('01234567-89ab-7000-8000-000000000001')
      const providerProfileId = parseUuidv7('01234567-89ab-7000-8000-000000000010')
      const serviceRequestId = parseUuidv7('01234567-89ab-7000-8000-000000000020')

      const result = await service.submitProposal({
        actorUserId,
        providerProfileId,
        serviceRequestId,
        currency: 'USD',
        lineItems: [
          {
            amount: createMoneyMinor(10000, 'USD'),
            description: '3D printing service',
            itemType: 'SERVICE',
            quantity: 1,
          },
        ],
        milestones: [
          {
            sequence: 1,
            title: 'Initial payment',
            amount: createMoneyMinor(5000, 'USD'),
            deliverableDescription: 'Project start',
            dueOffsetDays: 0,
          },
          {
            sequence: 2,
            title: 'Final payment',
            amount: createMoneyMinor(5000, 'USD'),
            deliverableDescription: 'Project completion',
            dueOffsetDays: 7,
          },
        ],
      })

      expect(result.milestones).toHaveLength(2)
      expect(result.milestones[0]?.title).toBe('Initial payment')
      expect(result.milestones[1]?.title).toBe('Final payment')
    })

    it('should throw error if milestone totals do not match', async () => {
      const actorUserId = parseUuidv7('01234567-89ab-7000-8000-000000000001')
      const providerProfileId = parseUuidv7('01234567-89ab-7000-8000-000000000010')
      const serviceRequestId = parseUuidv7('01234567-89ab-7000-8000-000000000020')

      await expect(
        service.submitProposal({
          actorUserId,
          providerProfileId,
          serviceRequestId,
          currency: 'USD',
          lineItems: [
            {
              amount: createMoneyMinor(10000, 'USD'),
              description: '3D printing service',
              itemType: 'SERVICE',
              quantity: 1,
            },
          ],
          milestones: [
            {
              sequence: 1,
              title: 'Payment',
              amount: createMoneyMinor(5000, 'USD'),
              deliverableDescription: null,
              dueOffsetDays: null,
            },
          ],
        }),
      ).rejects.toThrow('Milestone total')
    })
  })

  describe('withdrawProposal', () => {
    it('should withdraw a submitted proposal', async () => {
      const actorUserId = parseUuidv7('01234567-89ab-7000-8000-000000000001')
      const providerProfileId = parseUuidv7('01234567-89ab-7000-8000-000000000010')
      const serviceRequestId = parseUuidv7('01234567-89ab-7000-8000-000000000020')

      const submitted = await service.submitProposal({
        actorUserId,
        providerProfileId,
        serviceRequestId,
        currency: 'USD',
        lineItems: [
          {
            amount: createMoneyMinor(10000, 'USD'),
            description: '3D printing service',
            itemType: 'SERVICE',
            quantity: 1,
          },
        ],
      })

      const result = await service.withdrawProposal({
        actorUserId,
        proposalId: submitted.id,
        expectedVersion: submitted.version,
      })

      expect(result.status).toBe('WITHDRAWN')
    })

    it('should throw error when withdrawing accepted proposal', async () => {
      const actorUserId = parseUuidv7('01234567-89ab-7000-8000-000000000001')
      const providerProfileId = parseUuidv7('01234567-89ab-7000-8000-000000000010')
      const serviceRequestId = parseUuidv7('01234567-89ab-7000-8000-000000000020')

      const submitted = await service.submitProposal({
        actorUserId,
        providerProfileId,
        serviceRequestId,
        currency: 'USD',
        lineItems: [
          {
            amount: createMoneyMinor(10000, 'USD'),
            description: '3D printing service',
            itemType: 'SERVICE',
            quantity: 1,
          },
        ],
      })

      // Manually set status to ACCEPTED
      const proposal = await ports.proposalRepository.findById(submitted.id)
      if (proposal) {
        await ports.proposalRepository.update(
          { ...proposal, status: 'ACCEPTED' },
          proposal.version,
        )
      }

      await expect(
        service.withdrawProposal({
          actorUserId,
          proposalId: submitted.id,
          expectedVersion: submitted.version + 1,
        }),
      ).rejects.toThrow(InvalidProposalStateError)
    })
  })
})
