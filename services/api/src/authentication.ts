import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  createRequestContext,
  type ExternalIdentity,
  type RequestContext,
  type ResolveAuthenticatedUserUseCase,
  type SafeErrorEnvelope,
  type StructuredLogger,
} from '@pim/application'
import type { UserRecord } from '@pim/domain'

export type AuthenticatedApiActor = Readonly<{
  externalIdentity: ExternalIdentity
  user: UserRecord
}>

export type ProtectedRequestAuthenticationResult =
  | Readonly<{
      actor: AuthenticatedApiActor
      context: RequestContext
      ok: true
    }>
  | Readonly<{
      context: RequestContext
      ok: false
      response: SafeErrorEnvelope
      status: 401 | 403
    }>

type RequestHeaders = Readonly<Record<string, string | undefined>>

type AuthenticationMiddlewareOptions = Readonly<{
  logger: StructuredLogger
  resolver: ResolveAuthenticatedUserUseCase
}>

type ProtectedRequestInput = Readonly<{
  action?: string
  headers: RequestHeaders
  module?: string
}>

function createErrorResponse(
  code: 'AUTHENTICATION_REQUIRED' | 'AUTHORIZATION_DENIED',
  context: RequestContext,
): SafeErrorEnvelope {
  return {
    error: {
      code,
      details: {},
      fields: [],
      message:
        code === 'AUTHENTICATION_REQUIRED'
          ? 'กรุณาเข้าสู่ระบบก่อนดำเนินการ'
          : 'คุณไม่มีสิทธิ์เข้าถึงทรัพยากรนี้',
      requestId: context.requestId,
    },
  }
}

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  const value = authorizationHeader?.trim()

  if (!value) {
    return null
  }

  const match = /^Bearer\s+(.+)$/i.exec(value)
  return match?.[1]?.trim() || null
}

export function createAuthenticationMiddleware(
  input: AuthenticationMiddlewareOptions,
) {
  return Object.freeze({
    async authenticate(
      request: ProtectedRequestInput,
    ): Promise<ProtectedRequestAuthenticationResult> {
      const initialContextInput: {
        action: string
        module: string
        provider: string
        requestId?: string
      } = {
        action: request.action ?? 'auth.protected',
        module: request.module ?? 'api',
        provider: 'firebase',
      }
      const requestId = request.headers['x-request-id']

      if (requestId) {
        initialContextInput.requestId = requestId
      }

      const initialContext = createRequestContext(initialContextInput)
      const token = extractBearerToken(request.headers['authorization'])

      if (!token) {
        input.logger.child(initialContext).warn('api.auth.rejected', {
          code: 'AUTHENTICATION_REQUIRED',
          reason: 'MISSING_BEARER_TOKEN',
        })

        return {
          context: initialContext,
          ok: false,
          response: createErrorResponse('AUTHENTICATION_REQUIRED', initialContext),
          status: 401,
        }
      }

      try {
        const resolved = await input.resolver.execute({ idToken: token })
        const authenticatedContextInput: {
          requestId: string
          traceId: string
          userId: string
          action?: string
          module?: string
          provider?: string
        } = {
          requestId: initialContext.requestId,
          traceId: initialContext.traceId,
          userId: resolved.user.id,
        }

        if (initialContext.action) {
          authenticatedContextInput.action = initialContext.action
        }
        if (initialContext.module) {
          authenticatedContextInput.module = initialContext.module
        }
        if (initialContext.provider) {
          authenticatedContextInput.provider = initialContext.provider
        }

        const authenticatedContext = createRequestContext(authenticatedContextInput)

        input.logger.child(authenticatedContext).info('api.authenticated', {
          provider: resolved.externalIdentity.provider,
          userId: resolved.user.id,
        })

        return {
          actor: {
            externalIdentity: resolved.externalIdentity,
            user: resolved.user,
          },
          context: authenticatedContext,
          ok: true,
        }
      } catch (error) {
        if (
          error instanceof AuthenticationRequiredError ||
          error instanceof AuthorizationDeniedError
        ) {
          const code =
            error instanceof AuthenticationRequiredError
              ? 'AUTHENTICATION_REQUIRED'
              : 'AUTHORIZATION_DENIED'
          const status = error instanceof AuthenticationRequiredError ? 401 : 403

          input.logger.child(initialContext).warn('api.auth.rejected', {
            code,
            reason: error.name,
          })

          return {
            context: initialContext,
            ok: false,
            response: createErrorResponse(code, initialContext),
            status,
          }
        }

        throw error
      }
    },
  })
}
