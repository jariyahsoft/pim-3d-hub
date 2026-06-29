import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type {
  CurrencyCode,
  PrinterMaterialCode,
  UtcTimestamp,
  Uuidv7,
} from './index.js';

// ── Statuses ──────────────────────────────────────────────────────────────

export const pricingProfileStatuses = ['DRAFT', 'ACTIVE', 'RETIRED'] as const;
export type PricingProfileStatus = (typeof pricingProfileStatuses)[number];

export const pricingProfileSortFields = [
  'createdAt',
  'updatedAt',
  'effectiveFrom',
] as const;
export type PricingProfileSortField = (typeof pricingProfileSortFields)[number];

// ── Scope ─────────────────────────────────────────────────────────────────

export type PricingProfileScope = Readonly<{
  materialCode: PrinterMaterialCode;
  printerId: Uuidv7;
  serviceId: Uuidv7;
}>;

// ── Formula configuration ─────────────────────────────────────────────────

/**
 * All multiplier values are expressed in **basis points (bps)**.
 * 1 bps = 0.01 %; 10 000 bps = 100 %; 500 bps = 5 %.
 *
 * ## Precedence
 *
 * 1. Base costs: MATERIAL + MACHINE + SETUP + LABOR + SUPPORT
 * 2. Risk buffer applied to base subtotal
 * 3. Rush multiplier applied after risk
 * 4. Quantity discount applied after rush
 * 5. Shipping added (provisional – behind port)
 * 6. Platform fee applied on subtotal + shipping
 * 7. Tax applied after fee
 * 8. Minimum-order check after tax
 *
 * ## Rounding
 *
 * Each line-item amount is rounded independently using round-half-up
 * (Math.round on the integer minor-unit value).  Cross-line-item rounding
 * errors are NOT re-absorbed; the total is the plain sum of rounded items.
 */
export type PricingFormulaConfiguration = Readonly<{
  /** Minimum total after all charges (minor units).  If the computed total
   *  is below this value the buyer is charged the minimum. */
  minimumOrderMinor: number;

  /** Per-gram material cost in minor units. */
  materialRateMinorPerGram: number;

  /** Per-minute machine time cost in minor units. */
  machineRateMinorPerMinute: number;

  /** Flat setup fee in minor units. */
  setupFeeMinor: number;

  /** Support-structure multiplier in bps.  Applied when the model analysis
   *  indicates support is needed.  Zero means no support charge. */
  supportMultiplierBps: number;

  /** Risk / contingency buffer in bps.  Applied to the base subtotal. */
  riskBufferBps: number;

  /** Rush-order multiplier in bps.  Applied to the post-risk subtotal when
   *  the buyer marks the order as rush. */
  rushMultiplierBps: number;

  /** Quantity-discount rate in bps.  Applied to the pre-discount subtotal;
   *  produces a negative line item. */
  quantityDiscountBps: number;

  /** Platform / service fee in bps.  Applied to (subtotal + shipping). */
  platformFeeBps: number;

  /** Labour / handling charge in bps (applied to MATERIAL amount). */
  laborMultiplierBps: number;

  /** Placeholder shipping charge in minor units (provisional). */
  shippingMinor: number;

  /** Tax rate in bps.  Applied to the post-fee subtotal. */
  taxRateBps: number;
}>;

// ── Standard line-item codes ──────────────────────────────────────────────

export const pricingLineItemCodes = [
  'MATERIAL',
  'MACHINE',
  'SETUP',
  'SUPPORT',
  'LABOR',
  'RISK',
  'RUSH',
  'QUANTITY_DISCOUNT',
  'SHIPPING',
  'PLATFORM_FEE',
  'TAX',
] as const;

export type PricingLineItemCode = (typeof pricingLineItemCodes)[number];

// ── Record types ──────────────────────────────────────────────────────────

export type PricingProfileRecord = Readonly<
  CanonicalRecord & {
    currency: CurrencyCode;
    effectiveFrom: UtcTimestamp;
    formula: PricingFormulaConfiguration;
    name: string;
    providerProfileId: Uuidv7;
    scope: PricingProfileScope;
    status: PricingProfileStatus;
    versionNo: number;
  }
>;

export type CreatePricingProfileInput = Readonly<{
  createdBy?: Uuidv7 | null;
  currency?: CurrencyCode;
  effectiveFrom: UtcTimestamp;
  formula: PricingFormulaConfiguration;
  id?: Uuidv7;
  name: string;
  providerProfileId: Uuidv7;
  scope: PricingProfileScope;
  status?: PricingProfileStatus;
  updatedBy?: Uuidv7 | null;
}>;

export type PricingProfileFilter = Readonly<{
  materialCode?: PrinterMaterialCode;
  printerId?: Uuidv7;
  providerProfileId?: Uuidv7;
  serviceId?: Uuidv7;
  status?: PricingProfileStatus;
}>;

// ── Calculator types ──────────────────────────────────────────────────────

export type CalculatorInput = Readonly<{
  estimatedMinutes: number;
  hasSupport: boolean;
  isRush: boolean;
  materialCode: PrinterMaterialCode;
  qualityCode: string;
  quantity: number;
  volumeGrams: number;
}>;

export type CalculatorLineItem = Readonly<{
  amountMinor: number;
  code: PricingLineItemCode;
}>;

export type CalculatorResult = Readonly<{
  lineItems: readonly CalculatorLineItem[];
  minimumOrderMinor: number;
  platformFeeMinor: number;
  shippingMinor: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
}>;

// ── Repository interface ──────────────────────────────────────────────────

export type PricingProfileRepository = Readonly<{
  create(input: CreatePricingProfileInput): Promise<PricingProfileRecord>;
  findActiveAtTimestamp(
    providerProfileId: Uuidv7,
    scope: PricingProfileScope,
    at: UtcTimestamp,
  ): Promise<PricingProfileRecord | null>;
  findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<PricingProfileRecord | null>;
  findLatestByProviderAndScope(
    providerProfileId: Uuidv7,
    scope: PricingProfileScope,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<PricingProfileRecord | null>;
  list(
    request: RepositoryListRequest<
      PricingProfileFilter,
      PricingProfileSortField
    >,
  ): Promise<RepositoryListPage<PricingProfileRecord>>;
  softDelete(
    id: Uuidv7,
    expectedVersion: number,
    deletedBy?: Uuidv7 | null,
  ): Promise<PricingProfileRecord>;
  update(
    profile: PricingProfileRecord,
    expectedVersion: number,
  ): Promise<PricingProfileRecord>;
}>;

// ── Calculator ────────────────────────────────────────────────────────────

/**
 * Apply a basis-point multiplier to a minor-unit amount using round-half-up.
 *
 * result = Math.round(value × bps / 10 000)
 */
export function applyBps(value: number, bps: number): number {
  return Math.round((value * bps) / 10000);
}

/**
 * Compute the full pricing breakdown for the given profile and input.
 *
 * Implements the formula precedence documented on
 * {@link PricingFormulaConfiguration}.
 */
export function calculatePrice(
  profile: PricingProfileRecord,
  input: CalculatorInput,
): CalculatorResult {
  const f = profile.formula;
  const qty = Math.max(1, input.quantity);

  // 1. Base costs (per-unit, scaled by quantity)
  const materialAmount =
    f.materialRateMinorPerGram * Math.round(input.volumeGrams) * qty;
  const machineAmount =
    f.machineRateMinorPerMinute * Math.round(input.estimatedMinutes) * qty;
  const setupAmount = f.setupFeeMinor * qty;
  const supportAmount = input.hasSupport
    ? applyBps(materialAmount, f.supportMultiplierBps)
    : 0;
  const laborAmount = applyBps(materialAmount, f.laborMultiplierBps) * qty;

  // 2. Base subtotal before risk / discounts
  const baseSubtotal =
    materialAmount + machineAmount + setupAmount + supportAmount + laborAmount;

  // 3. Risk buffer
  const riskAmount = applyBps(baseSubtotal, f.riskBufferBps);

  // 4. Post-risk subtotal
  let afterRisk = baseSubtotal + riskAmount;

  // 5. Rush multiplier
  const rushAmount = input.isRush
    ? applyBps(afterRisk, f.rushMultiplierBps)
    : 0;
  afterRisk += rushAmount;

  // 6. Quantity discount (negative line item)
  const discountAmount =
    qty > 1 ? -applyBps(afterRisk, f.quantityDiscountBps) : 0;
  afterRisk += discountAmount;

  // 7. Shipping (provisional)
  const shippingAmount = f.shippingMinor;
  afterRisk += shippingAmount;

  // 8. Platform fee on (subtotal + shipping)
  const platformFeeAmount = applyBps(afterRisk, f.platformFeeBps);
  afterRisk += platformFeeAmount;

  // 9. Tax on post-fee subtotal
  const taxAmount = applyBps(afterRisk, f.taxRateBps);
  afterRisk += taxAmount;

  // 10. Minimum-order check
  const finalTotal = Math.max(afterRisk, f.minimumOrderMinor);

  // Build line items
  const lineItems: CalculatorLineItem[] = [
    { code: 'MATERIAL', amountMinor: materialAmount },
    { code: 'MACHINE', amountMinor: machineAmount },
    { code: 'SETUP', amountMinor: setupAmount },
  ];
  if (supportAmount > 0) {
    lineItems.push({ code: 'SUPPORT', amountMinor: supportAmount });
  }
  if (laborAmount > 0) {
    lineItems.push({ code: 'LABOR', amountMinor: laborAmount });
  }
  if (riskAmount > 0) {
    lineItems.push({ code: 'RISK', amountMinor: riskAmount });
  }
  if (rushAmount > 0) {
    lineItems.push({ code: 'RUSH', amountMinor: rushAmount });
  }
  if (discountAmount < 0) {
    lineItems.push({ code: 'QUANTITY_DISCOUNT', amountMinor: discountAmount });
  }
  if (shippingAmount > 0) {
    lineItems.push({ code: 'SHIPPING', amountMinor: shippingAmount });
  }
  if (platformFeeAmount > 0) {
    lineItems.push({ code: 'PLATFORM_FEE', amountMinor: platformFeeAmount });
  }
  if (taxAmount > 0) {
    lineItems.push({ code: 'TAX', amountMinor: taxAmount });
  }

  return {
    lineItems,
    minimumOrderMinor: f.minimumOrderMinor,
    platformFeeMinor: platformFeeAmount,
    shippingMinor: shippingAmount,
    subtotalMinor: finalTotal,
    taxMinor: taxAmount,
    totalMinor: finalTotal,
  };
}
