import {
  AuthorizationDeniedError,
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js'
import {
  RepositoryConflictError,
  createMoneyMinor,
  type MoneyMinor,
  type ProposalFilter,
  type ProposalLineItem,
  type ProposalMilestoneRecord,
  type ProposalMilestoneRepository,
  type ProposalRecord,
  type ProposalRepository,
  type ProposalSortField,
  type ProposalStatus,
  type ProviderProfileRecord,
  type ProviderProfileRepository,
  type RepositoryListPage,
  type ServiceRequestRecord,
  type ServiceRequestRepository,
  type SortDirection,
  type UserRepository,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

export type ProposalLineItemDto = Readonly<{
  amount: MoneyMinor
  description: string
  itemType: 'SERVICE' | 'MATERIAL' | 'SHIPPING' | 'OTHER'
  quantity: number
}>

export type ProposalMilestoneDto = Readonly<{
  amount: MoneyMinor
  deliverableDescription: string | null
  dueOffsetDays: number | null
  id: Uuidv7
  sequence: number
  title: string
}>

export type ProposalDto = Readonly<{
  currency: string
  exclusions: string | null
  expiresAt: UtcTimestamp | null
  id: Uuidv7
  lineItems: readonly ProposalLineItemDto[]
  milestones: readonly ProposalMilestoneDto[]
  notes: string | null
  providerProfileId: Uuidv7
  revisionNumber: number
  serviceRequestId: Uuidv7
  status: ProposalStatus
  submittedAt: UtcTimestamp | null
  totalAmount: MoneyMinor
  validUntil: UtcTimestamp | null
  version: number
}>

export type ProposalValidationError = Error &
  Readonly<{
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }>

export class ProposalNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND'
  readonly status = 404

  constructor(message: string) {
    super(message)
    this.name = 'ProposalNotFoundError'
  }
}

export class InvalidProposalStateError extends Error {
  readonly code = 'INVALID_STATE_TRANSITION'
  readonly fields: readonly string[]
  readonly status = 409

  constructor(message: string, fields: readonly string[] = ['status']) {
    super(message)
    this.name = 'InvalidProposalStateError'
    this.fields = fields
  }
}

export type SubmitProposalCommand = Readonly<{
  actorUserId: Uuidv7
  currency: string
  exclusions?: string | null | undefined
  lineItems: readonly ProposalLineItemDto[]
  milestones?: readonly Omit<ProposalMilestoneDto, 'id'>[] | undefined
  notes?: string | null | undefined
  providerProfileId: Uuidv7
  serviceRequestId: Uuidv7
  validUntil?: UtcTimestamp | null | undefined
}>

export type ReviseProposalCommand = Readonly<{
  actorUserId: Uuidv7
  currency: string
  exclusions?: string | null | undefined
  expectedVersion: number
  lineItems: readonly ProposalLineItemDto[]
  milestones?: readonly Omit<ProposalMilestoneDto, 'id'>[] | undefined
  notes?: string | null | undefined
  proposalId: Uuidv7
  validUntil?: UtcTimestamp | null | undefined
}>

export type WithdrawProposalCommand = Readonly<{
  actorUserId: Uuidv7
  expectedVersion: number
  proposalId: Uuidv7
}>

export type ProposalServicePorts = Readonly<{
  clock: ClockPort
  milestoneRepository: ProposalMilestoneRepository
  proposalRepository: ProposalRepository
  providerProfileRepository: ProviderProfileRepository
  serviceRequestRepository: ServiceRequestRepository
  userRepository: UserRepository
  uuidGenerator: UuidGeneratorPort
}>

export function assertProposalVersionConflict(
  error: unknown,
): asserts error is RepositoryConflictError {
  if (!(error instanceof RepositoryConflictError)) {
    throw error
  }
}

export function createProposalService(ports: ProposalServicePorts) {
  const {
    clock,
    milestoneRepository,
    proposalRepository,
    providerProfileRepository,
    serviceRequestRepository,
    userRepository,
    uuidGenerator,
  } = ports

  function validateLineItems(lineItems: readonly ProposalLineItemDto[]): void {
    if (lineItems.length === 0) {
      const error: ProposalValidationError = Object.assign(
        new Error('At least one line item is required'),
        {
          code: 'VALIDATION_ERROR' as const,
          fields: ['lineItems'],
          status: 400 as const,
        },
      )
      throw error
    }

    for (const item of lineItems) {
      if (item.amount.minorUnits <= 0) {
        const error: ProposalValidationError = Object.assign(
          new Error('Line item amount must be positive'),
          {
            code: 'VALIDATION_ERROR' as const,
            fields: ['lineItems'],
            status: 400 as const,
          },
        )
        throw error
      }

      if (item.quantity <= 0) {
        const error: ProposalValidationError = Object.assign(
          new Error('Line item quantity must be positive'),
          {
            code: 'VALIDATION_ERROR' as const,
            fields: ['lineItems'],
            status: 400 as const,
          },
        )
        throw error
      }
    }
  }

  function calculateTotal(lineItems: readonly ProposalLineItemDto[]): number {
    return lineItems.reduce((sum, item) => sum + item.amount.minorUnits, 0)
  }

  function validateMilestoneTotals(
    milestones: readonly Omit<ProposalMilestoneDto, 'id'>[],
    totalAmount: MoneyMinor,
  ): void {
    const milestoneTotal = milestones.reduce(
      (sum, milestone) => sum + milestone.amount.minorUnits,
      0,
    )

    if (milestoneTotal !== totalAmount.minorUnits) {
      const error: ProposalValidationError = Object.assign(
        new Error(
          `Milestone total ${milestoneTotal} does not match proposal total ${totalAmount.minorUnits}`,
        ),
        {
          code: 'VALIDATION_ERROR' as const,
          fields: ['milestones', 'totalAmount'],
          status: 400 as const,
        },
      )
      throw error
    }
  }

  async function submitProposal(command: SubmitProposalCommand): Promise<ProposalDto> {
    const {
      actorUserId,
      currency,
      exclusions,
      lineItems,
      milestones,
      notes,
      providerProfileId,
      serviceRequestId,
      validUntil,
    } = command

    // Verify provider ownership
    const provider = await providerProfileRepository.findById(providerProfileId)
    if (!provider || provider.ownerUserId !== actorUserId) {
      throw new AuthorizationDeniedError(
        'Only the provider owner can submit proposals',
      )
    }

    // Verify service request exists and is published
    const serviceRequest = await serviceRequestRepository.findById(serviceRequestId)
    if (!serviceRequest) {
      throw new ProposalNotFoundError(`Service request ${serviceRequestId} not found`)
    }

    if (serviceRequest.status !== 'PUBLISHED') {
      throw new InvalidProposalStateError(
        'Cannot submit proposal for non-published request',
        ['serviceRequestId'],
      )
    }

    // Validate line items
    validateLineItems(lineItems)

    const totalMinorUnits = calculateTotal(lineItems)
    const totalAmount = createMoneyMinor(totalMinorUnits, currency)

    // Validate milestone totals if provided
    if (milestones && milestones.length > 0) {
      validateMilestoneTotals(milestones, totalAmount)
    }

    // Check for existing proposal
    const existing = await proposalRepository.findLatestByRequestAndProvider(
      serviceRequestId,
      providerProfileId,
    )

    const revisionNumber = existing ? existing.revisionNumber + 1 : 1
    const now = clock.now()

    const proposalId = uuidGenerator.next()

    const proposal = await proposalRepository.create({
      id: proposalId,
      currency,
      exclusions: exclusions ?? null,
      expiresAt: null,
      lineItems,
      notes: notes ?? null,
      providerProfileId,
      revisionNumber,
      serviceRequestId,
      status: 'SUBMITTED',
      submittedAt: now,
      totalAmount,
      validUntil: validUntil ?? null,
      createdBy: actorUserId,
    })

    // Create milestones if provided
    const createdMilestones: ProposalMilestoneRecord[] = []
    if (milestones && milestones.length > 0) {
      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i]!
        const created = await milestoneRepository.create({
          proposalId,
          sequence: milestone.sequence,
          title: milestone.title,
          amount: milestone.amount,
          deliverableDescription: milestone.deliverableDescription ?? null,
          dueOffsetDays: milestone.dueOffsetDays ?? null,
          createdBy: actorUserId,
        })
        createdMilestones.push(created)
      }
    }

    return {
      currency: proposal.currency,
      exclusions: proposal.exclusions,
      expiresAt: proposal.expiresAt,
      id: proposal.id,
      lineItems: proposal.lineItems,
      milestones: createdMilestones.map((m) => ({
        amount: m.amount,
        deliverableDescription: m.deliverableDescription,
        dueOffsetDays: m.dueOffsetDays,
        id: m.id,
        sequence: m.sequence,
        title: m.title,
      })),
      notes: proposal.notes,
      providerProfileId: proposal.providerProfileId,
      revisionNumber: proposal.revisionNumber,
      serviceRequestId: proposal.serviceRequestId,
      status: proposal.status,
      submittedAt: proposal.submittedAt,
      totalAmount: proposal.totalAmount,
      validUntil: proposal.validUntil,
      version: proposal.version,
    }
  }

  async function reviseProposal(command: ReviseProposalCommand): Promise<ProposalDto> {
    const {
      actorUserId,
      currency,
      exclusions,
      expectedVersion,
      lineItems,
      milestones,
      notes,
      proposalId,
      validUntil,
    } = command

    const existing = await proposalRepository.findById(proposalId)
    if (!existing) {
      throw new ProposalNotFoundError(`Proposal ${proposalId} not found`)
    }

    // Verify provider ownership
    const provider = await providerProfileRepository.findById(existing.providerProfileId)
    if (!provider || provider.ownerUserId !== actorUserId) {
      throw new AuthorizationDeniedError('Only the provider owner can revise proposals')
    }

    // Cannot revise accepted proposals
    if (existing.status === 'ACCEPTED') {
      throw new InvalidProposalStateError('Cannot revise accepted proposal')
    }

    // Validate line items
    validateLineItems(lineItems)

    const totalMinorUnits = calculateTotal(lineItems)
    const totalAmount = createMoneyMinor(totalMinorUnits, currency)

    // Validate milestone totals if provided
    if (milestones && milestones.length > 0) {
      validateMilestoneTotals(milestones, totalAmount)
    }

    const now = clock.now()
    const newRevisionNumber = existing.revisionNumber + 1

    // Create new proposal revision
    const newProposalId = uuidGenerator.next()
    const proposal = await proposalRepository.create({
      id: newProposalId,
      currency,
      exclusions: exclusions ?? null,
      expiresAt: null,
      lineItems,
      notes: notes ?? null,
      providerProfileId: existing.providerProfileId,
      revisionNumber: newRevisionNumber,
      serviceRequestId: existing.serviceRequestId,
      status: 'REVISED',
      submittedAt: now,
      totalAmount,
      validUntil: validUntil ?? null,
      createdBy: actorUserId,
    })

    // Create milestones for new revision
    const createdMilestones: ProposalMilestoneRecord[] = []
    if (milestones && milestones.length > 0) {
      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i]!
        const created = await milestoneRepository.create({
          proposalId: newProposalId,
          sequence: milestone.sequence,
          title: milestone.title,
          amount: milestone.amount,
          deliverableDescription: milestone.deliverableDescription ?? null,
          dueOffsetDays: milestone.dueOffsetDays ?? null,
          createdBy: actorUserId,
        })
        createdMilestones.push(created)
      }
    }

    return {
      currency: proposal.currency,
      exclusions: proposal.exclusions,
      expiresAt: proposal.expiresAt,
      id: proposal.id,
      lineItems: proposal.lineItems,
      milestones: createdMilestones.map((m) => ({
        amount: m.amount,
        deliverableDescription: m.deliverableDescription,
        dueOffsetDays: m.dueOffsetDays,
        id: m.id,
        sequence: m.sequence,
        title: m.title,
      })),
      notes: proposal.notes,
      providerProfileId: proposal.providerProfileId,
      revisionNumber: proposal.revisionNumber,
      serviceRequestId: proposal.serviceRequestId,
      status: proposal.status,
      submittedAt: proposal.submittedAt,
      totalAmount: proposal.totalAmount,
      validUntil: proposal.validUntil,
      version: proposal.version,
    }
  }

  async function withdrawProposal(command: WithdrawProposalCommand): Promise<ProposalDto> {
    const { actorUserId, expectedVersion, proposalId } = command

    const proposal = await proposalRepository.findById(proposalId)
    if (!proposal) {
      throw new ProposalNotFoundError(`Proposal ${proposalId} not found`)
    }

    // Verify provider ownership
    const provider = await providerProfileRepository.findById(proposal.providerProfileId)
    if (!provider || provider.ownerUserId !== actorUserId) {
      throw new AuthorizationDeniedError('Only the provider owner can withdraw proposals')
    }

    // Cannot withdraw accepted proposals
    if (proposal.status === 'ACCEPTED') {
      throw new InvalidProposalStateError('Cannot withdraw accepted proposal')
    }

    if (proposal.status === 'WITHDRAWN') {
      throw new InvalidProposalStateError('Proposal is already withdrawn')
    }

    const updated = await proposalRepository.update(
      {
        ...proposal,
        status: 'WITHDRAWN',
        updatedBy: actorUserId,
      },
      expectedVersion,
    )

    const milestones = await milestoneRepository.listByProposalId(updated.id)

    return {
      currency: updated.currency,
      exclusions: updated.exclusions,
      expiresAt: updated.expiresAt,
      id: updated.id,
      lineItems: updated.lineItems,
      milestones: milestones.map((m) => ({
        amount: m.amount,
        deliverableDescription: m.deliverableDescription,
        dueOffsetDays: m.dueOffsetDays,
        id: m.id,
        sequence: m.sequence,
        title: m.title,
      })),
      notes: updated.notes,
      providerProfileId: updated.providerProfileId,
      revisionNumber: updated.revisionNumber,
      serviceRequestId: updated.serviceRequestId,
      status: updated.status,
      submittedAt: updated.submittedAt,
      totalAmount: updated.totalAmount,
      validUntil: updated.validUntil,
      version: updated.version,
    }
  }

  async function getProposal(
    actorUserId: Uuidv7,
    proposalId: Uuidv7,
  ): Promise<ProposalDto> {
    const proposal = await proposalRepository.findById(proposalId)
    if (!proposal) {
      throw new ProposalNotFoundError(`Proposal ${proposalId} not found`)
    }

    // Verify access: provider owner or service request buyer
    const provider = await providerProfileRepository.findById(proposal.providerProfileId)
    const serviceRequest = await serviceRequestRepository.findById(
      proposal.serviceRequestId,
    )

    if (
      provider?.ownerUserId !== actorUserId &&
      serviceRequest?.buyerUserId !== actorUserId
    ) {
      throw new AuthorizationDeniedError(
        'Only the provider or buyer can view this proposal',
      )
    }

    const milestones = await milestoneRepository.listByProposalId(proposal.id)

    return {
      currency: proposal.currency,
      exclusions: proposal.exclusions,
      expiresAt: proposal.expiresAt,
      id: proposal.id,
      lineItems: proposal.lineItems,
      milestones: milestones.map((m) => ({
        amount: m.amount,
        deliverableDescription: m.deliverableDescription,
        dueOffsetDays: m.dueOffsetDays,
        id: m.id,
        sequence: m.sequence,
        title: m.title,
      })),
      notes: proposal.notes,
      providerProfileId: proposal.providerProfileId,
      revisionNumber: proposal.revisionNumber,
      serviceRequestId: proposal.serviceRequestId,
      status: proposal.status,
      submittedAt: proposal.submittedAt,
      totalAmount: proposal.totalAmount,
      validUntil: proposal.validUntil,
      version: proposal.version,
    }
  }

  async function listProposals(
    actorUserId: Uuidv7,
    filter: ProposalFilter,
    limit: number,
    cursor: string | undefined,
    sortField: ProposalSortField,
    sortDirection: SortDirection,
  ): Promise<RepositoryListPage<ProposalDto>> {
    const page = await proposalRepository.list({
      ...(cursor && { cursor }),
      filter,
      limit,
      sort: {
        direction: sortDirection,
        field: sortField,
      },
    })

    // Filter by authorization: only show proposals where user is provider owner or buyer
    const authorizedProposals: ProposalDto[] = []

    for (const proposal of page.items) {
      const provider = await providerProfileRepository.findById(proposal.providerProfileId)
      const serviceRequest = await serviceRequestRepository.findById(
        proposal.serviceRequestId,
      )

      if (
        provider?.ownerUserId === actorUserId ||
        serviceRequest?.buyerUserId === actorUserId
      ) {
        const milestones = await milestoneRepository.listByProposalId(proposal.id)

        authorizedProposals.push({
          currency: proposal.currency,
          exclusions: proposal.exclusions,
          expiresAt: proposal.expiresAt,
          id: proposal.id,
          lineItems: proposal.lineItems,
          milestones: milestones.map((m) => ({
            amount: m.amount,
            deliverableDescription: m.deliverableDescription,
            dueOffsetDays: m.dueOffsetDays,
            id: m.id,
            sequence: m.sequence,
            title: m.title,
          })),
          notes: proposal.notes,
          providerProfileId: proposal.providerProfileId,
          revisionNumber: proposal.revisionNumber,
          serviceRequestId: proposal.serviceRequestId,
          status: proposal.status,
          submittedAt: proposal.submittedAt,
          totalAmount: proposal.totalAmount,
          validUntil: proposal.validUntil,
          version: proposal.version,
        })
      }
    }

    return {
      items: authorizedProposals,
      nextCursor: page.nextCursor,
    }
  }

  return Object.freeze({
    getProposal,
    listProposals,
    reviseProposal,
    submitProposal,
    withdrawProposal,
  })
}

export type ProposalService = ReturnType<typeof createProposalService>
