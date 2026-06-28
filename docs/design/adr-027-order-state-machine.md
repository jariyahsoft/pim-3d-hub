# ADR-027: Order State Machine and Transition Rules

**Status:** Accepted  
**Date:** 2026-06-28  
**Context:** Task 27 - Order State Matrix and Snapshots

## Decision

We define the complete order state machine for service orders with explicit transition rules, actor permissions, and terminal states.

## Order States

### Active States

1. **DRAFT** - Order created but not confirmed
2. **AWAITING_PROVIDER_CONFIRMATION** - Provider must accept within timeout
3. **AWAITING_PAYMENT** - Payment pending
4. **PAID** - Payment captured, work can begin
5. **PREPARING** - Provider preparing for production
6. **IN_PRODUCTION** - Active production work
7. **POST_PROCESSING** - Finishing, painting, assembly
8. **QUALITY_CHECK** - Final inspection
9. **READY_TO_SHIP** - Awaiting pickup/shipment
10. **SHIPPED** - In transit to buyer
11. **DELIVERED** - Buyer received shipment

### Terminal States

12. **COMPLETED** - Successfully fulfilled
13. **CANCELLED** - Cancelled before completion
14. **DISPUTED** - Under dispute resolution

## State Transition Matrix

### From DRAFT

- → **AWAITING_PROVIDER_CONFIRMATION** (buyer accepts proposal)
  - Actor: Buyer (order creator)
  - Preconditions: Valid proposal snapshot, buyer identity verified
  - Side effects: Provider notification sent

### From AWAITING_PROVIDER_CONFIRMATION

- → **AWAITING_PAYMENT** (provider confirms)
  - Actor: Provider
  - Preconditions: Provider active, within confirmation timeout
  - Side effects: Payment intent created, buyer notified
  
- → **CANCELLED** (provider rejects OR timeout)
  - Actor: Provider OR System
  - Preconditions: Provider declines OR 48h timeout exceeded
  - Side effects: Refund initiated if payment exists, both parties notified
  - **Terminal state**

### From AWAITING_PAYMENT

- → **PAID** (payment captured)
  - Actor: Payment system webhook
  - Preconditions: Payment provider confirmed capture
  - Side effects: Provider notified, funds held
  
- → **CANCELLED** (payment failed OR buyer cancels)
  - Actor: Payment system OR Buyer
  - Preconditions: Payment declined OR buyer cancels before payment
  - Side effects: Both parties notified
  - **Terminal state**

### From PAID

- → **PREPARING** (provider starts preparation)
  - Actor: Provider
  - Preconditions: Payment confirmed
  - Side effects: Buyer notified
  
- → **CANCELLED** (buyer cancels with refund)
  - Actor: Buyer
  - Preconditions: Work not started (manual review required)
  - Side effects: Refund initiated, cancellation fee may apply
  - **Terminal state**

### From PREPARING

- → **IN_PRODUCTION** (production started)
  - Actor: Provider
  - Preconditions: Preparation complete
  - Side effects: Buyer notified, production tracking begins

### From IN_PRODUCTION

- → **POST_PROCESSING** (printing complete)
  - Actor: Provider
  - Preconditions: Printing finished
  - Side effects: Buyer notified

- → **DISPUTED** (quality issue reported)
  - Actor: Provider OR Buyer
  - Preconditions: Issue documented with evidence
  - Side effects: Dispute case created, payments held
  - **Terminal state** (requires resolution)

### From POST_PROCESSING

- → **QUALITY_CHECK** (finishing complete)
  - Actor: Provider
  - Preconditions: Post-processing done
  - Side effects: Buyer notified

### From QUALITY_CHECK

- → **READY_TO_SHIP** (quality approved)
  - Actor: Provider
  - Preconditions: Quality check passed
  - Side effects: Buyer notified, shipping arranged

- → **PREPARING** (failed quality check, redo)
  - Actor: Provider
  - Preconditions: Quality issues found, provider restarts
  - Side effects: Buyer notified of delay

### From READY_TO_SHIP

- → **SHIPPED** (shipment dispatched)
  - Actor: Provider
  - Preconditions: Carrier tracking created
  - Side effects: Buyer notified with tracking

### From SHIPPED

- → **DELIVERED** (shipment confirmed)
  - Actor: Carrier system OR Buyer
  - Preconditions: Tracking shows delivered OR buyer confirms
  - Side effects: Auto-completion timer starts

- → **DISPUTED** (shipment issue)
  - Actor: Buyer
  - Preconditions: Non-delivery OR damage reported
  - Side effects: Dispute case created
  - **Terminal state** (requires resolution)

### From DELIVERED

- → **COMPLETED** (buyer accepts OR timeout)
  - Actor: Buyer OR System
  - Preconditions: Buyer confirms OR 7 days auto-complete
  - Side effects: Payment released to provider, review request sent
  - **Terminal state**

- → **DISPUTED** (buyer rejects quality)
  - Actor: Buyer
  - Preconditions: Quality issue within acceptance window
  - Side effects: Dispute case created, payment held
  - **Terminal state** (requires resolution)

## Cancellation Rules

### Before PAID
- Full refund, no fees
- Either party can cancel
- Immediate effect

### After PAID, Before IN_PRODUCTION
- Refund minus cancellation fee (10% or fixed amount)
- Buyer only, provider approval optional
- Manual review for edge cases

### After IN_PRODUCTION
- No automatic cancellation
- Must go through dispute process
- Provider compensation for work done

## Timeouts

- **Provider confirmation:** 48 hours → auto-cancel
- **Payment:** 24 hours → auto-cancel
- **Auto-completion:** 7 days after DELIVERED → auto-complete

## Dispute Resolution

- DISPUTED is a terminal state requiring manual resolution
- Resolution outcomes:
  - Return to previous state with conditions
  - Force completion with partial refund
  - Full cancellation with refund
  - Escalate to admin review

## Immutability Rules

1. **Order snapshots never change** after creation
2. **Financial totals frozen** at order creation
3. **Source proposal/quote** preserved but not updated
4. **Participant identity** captured at order time
5. **Address snapshot** immutable for shipping reference

## Status Event Audit

Every state transition creates an `OrderStatusEvent` record with:
- From/to states
- Actor user ID
- Timestamp
- Reason/notes
- Metadata (payment IDs, tracking, etc.)

## Consequences

### Positive
- Clear actor permissions at each state
- Predictable buyer/provider experience
- Comprehensive audit trail
- Automated timeout handling
- Dispute escalation path

### Negative
- Complex state machine requires thorough testing
- Manual intervention needed for edge cases
- Timeout values may need regional adjustment
- Cancellation policy may need legal review

## Related Decisions

- ADR-004: Modular Monolith Architecture
- ADR-006: Repository Interfaces
- Task 26: Proposal acceptance creates orders
- Task 28: Implements transition commands
- Task 29: Adds milestone tracking

## Open Questions

1. **Provider confirmation timeout:** 48h may be too short for small providers
2. **Auto-completion window:** 7 days may need country-specific adjustment
3. **Cancellation fees:** Percentage vs fixed amount needs business decision
4. **Dispute resolution SLA:** How fast must disputes be resolved?

## References

- `docs/design/03-database-design.md` - Order entity definitions
- `docs/design/06-backlog.md` - US-030, US-031
- Task 27 implementation
