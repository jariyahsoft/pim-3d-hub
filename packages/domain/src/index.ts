const uuidV7Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const rfc3339UtcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export type Uuidv7 = string & { readonly __uuidv7: unique symbol };
export type CurrencyCode = string & { readonly __currencyCode: unique symbol };
export type Millimeter = number & { readonly __millimeter: unique symbol };
export type UtcTimestamp = string & { readonly __utcTimestamp: unique symbol };

export type MoneyMinor = Readonly<{
  minorUnits: number;
  currency: CurrencyCode;
}>;

export type DimensionsMm = Readonly<{
  widthMm: Millimeter;
  heightMm: Millimeter;
  depthMm: Millimeter;
}>;

export type UnknownEnumValue = Readonly<{
  unknown: true;
  value: string;
}>;

function ensureSafeInteger(name: string, value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new TypeError(`${name} must be a finite integer`);
  }

  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be within the safe integer range`);
  }

  return value;
}

export function parseUuidv7(value: string): Uuidv7 {
  const normalized = value.trim().toLowerCase();

  if (!uuidV7Pattern.test(normalized)) {
    throw new TypeError(`Invalid UUIDv7 value: ${value}`);
  }

  return normalized as Uuidv7;
}

export function parseCurrencyCode(value: string): CurrencyCode {
  const normalized = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new TypeError(`Invalid currency code: ${value}`);
  }

  return normalized as CurrencyCode;
}

export function createMoneyMinor(
  minorUnits: number,
  currency: string,
): MoneyMinor {
  const normalizedMinorUnits = ensureSafeInteger('minorUnits', minorUnits);

  if (normalizedMinorUnits < 0) {
    throw new RangeError('minorUnits must be zero or greater');
  }

  return Object.freeze({
    minorUnits: normalizedMinorUnits,
    currency: parseCurrencyCode(currency),
  });
}

export function parseMillimeter(value: number): Millimeter {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      'Dimension values must be finite and greater than zero',
    );
  }

  return value as Millimeter;
}

export function parseDimensionsMm(input: {
  depthMm: number;
  heightMm: number;
  widthMm: number;
}): DimensionsMm {
  return Object.freeze({
    widthMm: parseMillimeter(input.widthMm),
    heightMm: parseMillimeter(input.heightMm),
    depthMm: parseMillimeter(input.depthMm),
  });
}

export function toRfc3339Utc(date: Date): UtcTimestamp {
  return parseUtcTimestamp(date);
}

export function parseUtcTimestamp(value: string | Date): UtcTimestamp {
  const candidate = value instanceof Date ? value.toISOString() : value.trim();

  if (!rfc3339UtcPattern.test(candidate)) {
    throw new TypeError(`Invalid RFC3339 UTC timestamp: ${candidate}`);
  }

  if (Number.isNaN(Date.parse(candidate))) {
    throw new TypeError(`Invalid RFC3339 UTC timestamp: ${candidate}`);
  }

  return candidate as UtcTimestamp;
}

export function createUnknownEnumValue(value: string): UnknownEnumValue {
  return Object.freeze({
    unknown: true as const,
    value,
  });
}

export function parseUnknownEnumValue<
  const Allowed extends readonly [string, ...string[]],
>(allowedValues: Allowed, value: string): Allowed[number] | UnknownEnumValue {
  if ((allowedValues as readonly string[]).includes(value)) {
    return value as Allowed[number];
  }

  return createUnknownEnumValue(value);
}

export * from './audit.js';
export * from './capacity.js';
export * from './content-post.js';
export * from './creator-profile.js';
export * from './conversation.js';
export * from './file.js';
export * from './file-analysis.js';
export * from './file-upload.js';
export * from './instant-quote.js';
export * from './instant-quote-snapshot.js';
export * from './job-discovery.js';
export * from './moderation-dispute.js';
export * from './notification.js';
export * from './order.js';
export * from './payment.js';
export * from './product-order.js';
export * from './product-search.js';
export * from './product.js';
export * from './promotion.js';

export * from './pricing-profile.js';
export * from './printer.js';
export * from './proposal.js';
export * from './provider-public.js';
export * from './refund-payout.js';
export * from './repository.js';
export * from './review.js';
export * from './service-request.js';
export * from './slicer.js';
export * from './social-interactions.js';
export * from './verified-content.js';
export * from './shipping.js';
export * from './partner-analytics.js';
export * from './smart-matching.js';
export * from './release-operations.js';
