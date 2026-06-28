import type { CapacityExpiryWorkerResult, CapacityService } from '@pim/application'

export async function runCapacityReservationExpiryWorker(
  capacityService: CapacityService,
  input?: Parameters<CapacityService['releaseExpiredReservations']>[0],
): Promise<CapacityExpiryWorkerResult> {
  return capacityService.releaseExpiredReservations(input)
}
