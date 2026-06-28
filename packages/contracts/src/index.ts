import { z } from 'zod'
export { createApiClient } from './client.js'
export {
  capacityClosureResponseSchema,
  capacityClosureSchema,
  capacityClosureStatusSchema,
  capacityReservationManualReleaseReasonSchema,
  capacityReservationReleaseReasonSchema,
  capacityReservationResponseSchema,
  capacityReservationSchema,
  capacityReservationStatusSchema,
  capacitySlotChangeResponseSchema,
  capacitySlotResponseSchema,
  capacitySlotSchema,
  capacitySlotStatusSchema,
  capacityWorkspaceResponseSchema,
  capacityWorkspaceSchema,
  closeCapacitySlotRequestSchema,
  createCapacitySlotRequestSchema,
  releaseCapacityReservationRequestSchema,
  reopenCapacitySlotRequestSchema,
  reserveCapacityRequestSchema,
  updateCapacitySlotRequestSchema,
} from './capacity.js'
export {
  conversationContextTypeSchema,
  conversationResponseSchema,
  conversationStatusSchema,
  createConversationRequestSchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  markAsReadRequestSchema,
  messageResponseSchema,
  messageStatusSchema,
  moderateMessageRequestSchema,
  sendMessageRequestSchema,
} from './conversation.js'
export type {
  ConversationResponse,
  CreateConversationRequest,
  ListConversationsQuery,
  ListMessagesQuery,
  MarkAsReadRequest,
  MessageResponse,
  ModerateMessageRequest,
  SendMessageRequest,
} from './conversation.js'
export {
  endpointStatusSchema,
  listEndpointsQuerySchema,
  listNotificationsQuerySchema,
  listPreferencesQuerySchema,
  notificationCategorySchema,
  notificationChannelSchema,
  notificationEndpointResponseSchema,
  notificationPreferenceResponseSchema,
  notificationPrioritySchema,
  notificationResponseSchema,
  notificationStatusSchema,
  registerEndpointRequestSchema,
  revokeEndpointRequestSchema,
  updatePreferencesRequestSchema,
} from './notification.js'
export type {
  ListEndpointsQuery,
  ListNotificationsQuery,
  ListPreferencesQuery,
  NotificationEndpointResponse,
  NotificationPreferenceResponse,
  NotificationResponse,
  RegisterEndpointRequest,
  RevokeEndpointRequest,
  UpdatePreferencesRequest,
} from './notification.js'
export {
  createFileAssetAccessGrantRequestSchema,
  fileAssetAccessGrantResponseSchema,
  fileAssetAccessGrantSchema,
  fileAssetDownloadAccessResponseSchema,
  fileAssetDownloadAccessSchema,
  fileAssetGrantContextTypeSchema,
  fileAssetGrantPermissionCodeSchema,
  fileAssetStatusSchema,
  fileAssetVisibilitySchema,
} from './file-access.js'
export {
  discoverJobsQuerySchema,
  jobDiscoveryDetailResponseSchema,
  jobDiscoveryItemSchema,
  jobDiscoveryListResponseSchema,
} from './job-discovery.js'
export {
  createProviderProfileRequestSchema,
  createProviderServiceRequestSchema,
  providerOnboardingOverviewResponseSchema,
  providerOnboardingOverviewSchema,
  providerOnboardingStepCodeSchema,
  providerOnboardingStepSchema,
  providerOnboardingStepStatusSchema,
  providerProfileStatusSchema,
  providerServiceResponseSchema,
  providerServiceSchema,
  providerServiceStatusSchema,
  providerServiceTypeSchema,
  providerTrustProjectionSchema,
  publicProviderCardResponseSchema,
  publicProviderCardSchema,
  providerWorkspaceResponseSchema,
  providerWorkspaceSchema,
  publicProviderProfileResponseSchema,
  publicProviderProfileSchema,
  updateProviderProfileRequestSchema,
  updateProviderServiceRequestSchema,
} from './provider.js'
export {
  closeServiceRequestRequestSchema,
  createServiceRequestDraftRequestSchema,
  moneyMinorSchema,
  publishServiceRequestRequestSchema,
  serviceRequestAttachmentSchema,
  serviceRequestResponseSchema,
  serviceRequestSchema,
  serviceRequestStatusHistorySchema,
  serviceRequestStatusSchema,
  serviceRequestTypeSchema,
  serviceRequestVisibilitySchema,
  updateServiceRequestDraftRequestSchema,
} from './service-request.js'
export {
  buildVolumeMmSchema,
  createPrinterCapabilityRequestSchema,
  createPrinterRequestSchema,
  createProviderMaterialRequestSchema,
  printerCapabilityResponseSchema,
  printerCapabilitySchema,
  printerCapabilityStatusSchema,
  printerColorCodeSchema,
  printerMaterialCodeSchema,
  printerQualityCodeSchema,
  printerResponseSchema,
  printerSchema,
  printerStatusSchema,
  printerTechnologyCodeSchema,
  printerWorkspaceResponseSchema,
  printerWorkspaceSchema,
  providerMaterialResponseSchema,
  providerMaterialSchema,
  providerMaterialStockStatusSchema,
  updatePrinterRequestSchema,
} from './printer.js'
export {
  listProposalsQuerySchema,
  proposalDetailEnvelopeSchema,
  proposalLineItemSchema,
  proposalListEnvelopeSchema,
  proposalMilestoneSchema,
  proposalResponseSchema,
  proposalStatusSchema,
  reviseProposalRequestSchema,
  submitProposalRequestSchema,
  withdrawProposalRequestSchema,
} from './proposal.js'
export type {
  Proposal,
  ProposalDetailEnvelope,
  ProposalLineItem,
  ProposalListEnvelope,
  ProposalMilestone,
  ListProposalsQuery,
  ReviseProposalRequest,
  SubmitProposalRequest,
  WithdrawProposalRequest,
} from './proposal.js'
export {
  countryCodeSchema,
  createUserAddressRequestSchema,
  currentUserProfileResponseSchema,
  currentUserProfileSchema,
  expectedVersionSchema,
  localeCodeSchema,
  notificationPreferencesSchema,
  onboardingRequestSchema,
  onboardingResponseSchema,
  optionalUuidv7Schema,
  phoneE164Schema,
  privacyPreferencesSchema,
  publicUserProfileSchema,
  privateUserProfileSchema,
  updateCurrentUserProfileRequestSchema,
  updateNotificationPreferencesRequestSchema,
  updatePrivacyPreferencesRequestSchema,
  updateUserAddressRequestSchema,
  userAddressListDataSchema,
  userAddressListResponseSchema,
  userAddressResponseSchema,
  userAddressSchema,
  uuidv7Schema,
} from './profile.js'
export {
  acceptOrganizationInvitationRequestSchema,
  createOrganizationRequestSchema,
  inviteOrganizationMemberRequestSchema,
  organizationMemberRoleCodeSchema,
  organizationMembershipResponseSchema,
  organizationMembershipSchema,
  organizationResponseSchema,
  organizationSchema,
  organizationStatusSchema,
  organizationTypeSchema,
  requestRoleActivationRequestSchema,
  reviewVerificationCaseRequestSchema,
  roleAssignmentResponseSchema,
  roleAssignmentSchema,
  roleAssignmentStatusSchema,
  roleCodeSchema,
  roleScopeTypeSchema,
  submitVerificationCaseRequestSchema,
  trustOverviewResponseSchema,
  trustOverviewSchema,
  updateOrganizationMembershipRequestSchema,
  verificationCaseResponseSchema,
  verificationCaseReviewDecisionSchema,
  verificationCaseSchema,
  verificationCaseStatusSchema,
  verificationCaseTypeSchema,
  verificationDocumentInputSchema,
  verificationDocumentSchema,
  verificationDocumentSourceTypeSchema,
  verificationSubjectTypeSchema,
} from './trust.js'
export type { OpenApiClient, OpenApiPaths } from './client.js'

const rfc3339UtcPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/

export type UnknownEnumValue = Readonly<{
  unknown: true
  value: string
}>

export const requestIdSchema = z.string().trim().min(1)
export const cursorSchema = z.string().trim().min(1)
export const optionalNextCursorSchema = cursorSchema.nullable().optional()
export const stableErrorCodeSchema = z.string().trim().min(1)
export const safeErrorFieldSchema = z.string().trim().min(1)
export const safeErrorFieldsSchema = z.array(safeErrorFieldSchema).default([])
export const safeErrorDetailsSchema = z.record(z.string(), z.unknown()).default({})
export const rfc3339UtcSchema = z.string().trim().regex(rfc3339UtcPattern)

export type ApiMeta = Readonly<{
  nextCursor?: string | null
  requestId: string
}>

export type ApiPageMeta = Readonly<
  ApiMeta & {
    limit: number
    total?: number
  }
>

export type ApiError = Readonly<{
  code: string
  details: Record<string, unknown>
  fields: string[]
  message: string
  requestId: string
}>

export type ApiSuccessEnvelope<T> = Readonly<{
  data: T
  meta: ApiMeta
}>

export type ApiErrorEnvelope = Readonly<{
  error: ApiError
}>

export function createUnknownEnumValue(value: string): UnknownEnumValue {
  return Object.freeze({
    unknown: true as const,
    value,
  })
}

export function parseUnknownEnumValue<const Allowed extends readonly [string, ...string[]]>(
  allowedValues: Allowed,
  value: string,
): Allowed[number] | UnknownEnumValue {
  if ((allowedValues as readonly string[]).includes(value)) {
    return value as Allowed[number]
  }

  return createUnknownEnumValue(value)
}

export function serializeRfc3339Utc(date: Date): string {
  return date.toISOString()
}

export function createApiMetaSchema() {
  return z.object({
    nextCursor: optionalNextCursorSchema,
    requestId: requestIdSchema,
  })
}

export function createApiPageMetaSchema() {
  return createApiMetaSchema().extend({
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative().optional(),
  })
}

export function createApiSuccessEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: createApiMetaSchema(),
  })
}

export function createApiErrorSchema() {
  return z.object({
    code: stableErrorCodeSchema,
    details: safeErrorDetailsSchema,
    fields: safeErrorFieldsSchema,
    message: z.string().trim().min(1),
    requestId: requestIdSchema,
  })
}

export function createApiErrorEnvelopeSchema() {
  return z.object({
    error: createApiErrorSchema(),
  })
}
