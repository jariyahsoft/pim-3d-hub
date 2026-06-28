import type { Request, Response, NextFunction } from 'express'
import {
  type ProposalService,
  InvalidProposalStateError,
  ProposalNotFoundError,
  type ProposalValidationError,
} from '@pim/application'
import {
  listProposalsQuerySchema,
  reviseProposalRequestSchema,
  submitProposalRequestSchema,
  withdrawProposalRequestSchema,
  type Proposal,
} from '@pim/contracts'
import { parseUuidv7, RepositoryConflictError, type Uuidv7 } from '@pim/domain'

type ProposalApiDeps = Readonly<{
  proposalService: ProposalService
}>

export function createProposalApi(deps: ProposalApiDeps) {
  const { proposalService } = deps

  async function submitProposal(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const actorUserId = req.user?.id
      if (!actorUserId) {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
            requestId: req.id ?? 'unknown',
            fields: [],
            details: {},
          },
        })
        return
      }

      const body = submitProposalRequestSchema.parse(req.body)

      const proposal = await proposalService.submitProposal({
        actorUserId: parseUuidv7(actorUserId),
        currency: body.currency,
        exclusions: body.exclusions ?? null,
        lineItems: body.lineItems as any,
        milestones: body.milestones as any,
        notes: body.notes ?? null,
        providerProfileId: parseUuidv7(body.providerProfileId),
        serviceRequestId: parseUuidv7(body.serviceRequestId),
        validUntil: (body.validUntil as any) ?? null,
      })

      const response: Proposal = {
        id: proposal.id,
        serviceRequestId: proposal.serviceRequestId,
        providerProfileId: proposal.providerProfileId,
        status: proposal.status,
        revisionNumber: proposal.revisionNumber,
        currency: proposal.currency,
        totalAmount: proposal.totalAmount as any,
        lineItems: proposal.lineItems as any,
        milestones: proposal.milestones as any,
        notes: proposal.notes,
        exclusions: proposal.exclusions,
        validUntil: proposal.validUntil,
        submittedAt: proposal.submittedAt,
        expiresAt: proposal.expiresAt,
        version: proposal.version,
      }

      res.status(201).json({
        data: response,
        meta: {
          requestId: req.id ?? 'unknown',
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async function reviseProposal(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const actorUserId = req.user?.id
      if (!actorUserId) {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
            requestId: req.id ?? 'unknown',
            fields: [],
            details: {},
          },
        })
        return
      }

      const proposalId = req.params.proposalId
      if (!proposalId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing proposalId parameter',
            requestId: req.id ?? 'unknown',
            fields: ['proposalId'],
            details: {},
          },
        })
        return
      }

      const body = reviseProposalRequestSchema.parse(req.body)

      const proposal = await proposalService.reviseProposal({
        actorUserId: parseUuidv7(actorUserId),
        proposalId: parseUuidv7(proposalId) as Uuidv7,
        currency: body.currency,
        exclusions: body.exclusions ?? null,
        expectedVersion: body.expectedVersion,
        lineItems: body.lineItems as any,
        milestones: body.milestones as any,
        notes: body.notes ?? null,
        validUntil: (body.validUntil as any) ?? null,
      })

      const response: Proposal = {
        id: proposal.id,
        serviceRequestId: proposal.serviceRequestId,
        providerProfileId: proposal.providerProfileId,
        status: proposal.status,
        revisionNumber: proposal.revisionNumber,
        currency: proposal.currency,
        totalAmount: proposal.totalAmount as any,
        lineItems: proposal.lineItems as any,
        milestones: proposal.milestones as any,
        notes: proposal.notes,
        exclusions: proposal.exclusions,
        validUntil: proposal.validUntil,
        submittedAt: proposal.submittedAt,
        expiresAt: proposal.expiresAt,
        version: proposal.version,
      }

      res.status(200).json({
        data: response,
        meta: {
          requestId: req.id ?? 'unknown',
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async function withdrawProposal(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const actorUserId = req.user?.id
      if (!actorUserId) {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
            requestId: req.id ?? 'unknown',
            fields: [],
            details: {},
          },
        })
        return
      }

      const proposalId = req.params.proposalId
      if (!proposalId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing proposalId parameter',
            requestId: req.id ?? 'unknown',
            fields: ['proposalId'],
            details: {},
          },
        })
        return
      }

      const body = withdrawProposalRequestSchema.parse(req.body)

      const proposal = await proposalService.withdrawProposal({
        actorUserId: parseUuidv7(actorUserId),
        proposalId: parseUuidv7(proposalId) as Uuidv7,
        expectedVersion: body.expectedVersion,
      })

      const response: Proposal = {
        id: proposal.id,
        serviceRequestId: proposal.serviceRequestId,
        providerProfileId: proposal.providerProfileId,
        status: proposal.status,
        revisionNumber: proposal.revisionNumber,
        currency: proposal.currency,
        totalAmount: proposal.totalAmount as any,
        lineItems: proposal.lineItems as any,
        milestones: proposal.milestones as any,
        notes: proposal.notes,
        exclusions: proposal.exclusions,
        validUntil: proposal.validUntil,
        submittedAt: proposal.submittedAt,
        expiresAt: proposal.expiresAt,
        version: proposal.version,
      }

      res.status(200).json({
        data: response,
        meta: {
          requestId: req.id ?? 'unknown',
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async function getProposal(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const actorUserId = req.user?.id
      if (!actorUserId) {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
            requestId: req.id ?? 'unknown',
            fields: [],
            details: {},
          },
        })
        return
      }

      const proposalId = req.params.proposalId
      if (!proposalId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing proposalId parameter',
            requestId: req.id ?? 'unknown',
            fields: ['proposalId'],
            details: {},
          },
        })
        return
      }

      const proposal = await proposalService.getProposal(
        parseUuidv7(actorUserId),
        parseUuidv7(proposalId) as Uuidv7,
      )

      const response: Proposal = {
        id: proposal.id,
        serviceRequestId: proposal.serviceRequestId,
        providerProfileId: proposal.providerProfileId,
        status: proposal.status,
        revisionNumber: proposal.revisionNumber,
        currency: proposal.currency,
        totalAmount: proposal.totalAmount as any,
        lineItems: proposal.lineItems as any,
        milestones: proposal.milestones as any,
        notes: proposal.notes,
        exclusions: proposal.exclusions,
        validUntil: proposal.validUntil,
        submittedAt: proposal.submittedAt,
        expiresAt: proposal.expiresAt,
        version: proposal.version,
      }

      res.status(200).json({
        data: response,
        meta: {
          requestId: req.id ?? 'unknown',
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async function listProposals(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const actorUserId = req.user?.id
      if (!actorUserId) {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
            requestId: req.id ?? 'unknown',
            fields: [],
            details: {},
          },
        })
        return
      }

      const query = listProposalsQuerySchema.parse(req.query)

      const filter = {
        ...(query.serviceRequestId && { serviceRequestId: parseUuidv7(query.serviceRequestId) }),
        ...(query.providerProfileId && { providerProfileId: parseUuidv7(query.providerProfileId) }),
        ...(query.status && { status: query.status }),
      }

      const page = await proposalService.listProposals(
        parseUuidv7(actorUserId),
        filter,
        query.limit,
        query.cursor,
        query.sortField,
        query.sortDirection,
      )

      const response = page.items.map(
        (proposal): Proposal => ({
          id: proposal.id,
          serviceRequestId: proposal.serviceRequestId,
          providerProfileId: proposal.providerProfileId,
          status: proposal.status,
          revisionNumber: proposal.revisionNumber,
          currency: proposal.currency,
          totalAmount: proposal.totalAmount as any,
          lineItems: proposal.lineItems as any,
          milestones: proposal.milestones as any,
          notes: proposal.notes,
          exclusions: proposal.exclusions,
          validUntil: proposal.validUntil,
          submittedAt: proposal.submittedAt,
          expiresAt: proposal.expiresAt,
          version: proposal.version,
        }),
      )

      res.status(200).json({
        data: response,
        meta: {
          requestId: req.id ?? 'unknown',
          nextCursor: page.nextCursor,
        },
      })
    } catch (error) {
      next(error)
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

export function handleProposalError(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof ProposalNotFoundError) {
    res.status(404).json({
      error: {
        code: error.code,
        message: error.message,
        requestId: req.id ?? 'unknown',
        fields: [],
        details: {},
      },
    })
    return
  }

  if (error instanceof InvalidProposalStateError) {
    res.status(409).json({
      error: {
        code: error.code,
        message: error.message,
        requestId: req.id ?? 'unknown',
        fields: error.fields,
        details: {},
      },
    })
    return
  }

  if (error instanceof RepositoryConflictError) {
    res.status(409).json({
      error: {
        code: 'VERSION_CONFLICT',
        message: error.message,
        requestId: req.id ?? 'unknown',
        fields: ['version'],
        details: {},
      },
    })
    return
  }

  const validationError = error as ProposalValidationError
  if (validationError.code === 'VALIDATION_ERROR') {
    res.status(400).json({
      error: {
        code: validationError.code,
        message: validationError.message,
        requestId: req.id ?? 'unknown',
        fields: validationError.fields,
        details: {},
      },
    })
    return
  }

  next(error)
}
