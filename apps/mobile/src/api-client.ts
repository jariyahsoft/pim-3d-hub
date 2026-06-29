import type { MobileConfig } from './env-config.js';

/**
 * Typed API client for the mobile app.
 *
 * Uses the OpenAPI-generated types from `@pim/contracts` and wraps the
 * native `fetch` API (or a React Native polyfill) behind a thin client.
 *
 * The client NEVER reads Firestore business collections directly — every
 * data access goes through the REST/OpenAPI contract.
 *
 * Design:
 * - `createApiClient(config)` returns an object with method stubs matching
 *   the OpenAPI path groups.
 * - Each stub wraps `fetch`, passes the Authorization header, and returns
 *   typed response objects.
 * - Error responses are mapped to typed error envelopes.
 */

// ── Type helpers (placeholder until OpenAPI generation is wired) ──────────

export type ApiErrorBody = Readonly<{
  error: Readonly<{
    code: string;
    message: string;
    fields?: readonly string[];
    status: number;
  }>;
}>;

export type ApiMeta = Readonly<{
  nextCursor?: string | null;
  requestId: string;
}>;

export type ApiEnvelope<T> = Readonly<{
  data: T;
  meta: ApiMeta;
}>;

export type HealthResponse = Readonly<{
  status: string;
  timestamp: string;
}>;

export type ApiRequestInit = Readonly<{
  body?: unknown;
  expectedVersion?: number;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | undefined>;
}>;

// ── Client ────────────────────────────────────────────────────────────────

export type ApiClient = Readonly<{
  /** Health-check endpoint — contract-only smoke gate. */
  health(): Promise<
    ApiEnvelope<HealthResponse> | { error: ApiErrorBody['error'] }
  >;
  /** Generic typed request helper. */
  request<T>(
    init: ApiRequestInit,
  ): Promise<ApiEnvelope<T> | { error: ApiErrorBody['error'] }>;
}>;

/**
 * Create the mobile API client bound to the running API URL.
 *
 * `getAccessToken` is supplied by the auth layer (Task 60) and called once
 * per request to attach the Authorization header.
 */
export function createApiClient(
  config: MobileConfig,
  getAccessToken: () => Promise<string | null>,
): ApiClient {
  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');

  async function request<T>(
    init: ApiRequestInit,
  ): Promise<ApiEnvelope<T> | { error: ApiErrorBody['error'] }> {
    const token = await getAccessToken();
    const url = new URL(`${baseUrl}${init.path}`);

    if (init.query) {
      for (const [key, value] of Object.entries(init.query)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...init.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (init.expectedVersion !== undefined) {
      headers['If-Match'] = String(init.expectedVersion);
    }
    if (init.idempotencyKey) {
      headers['Idempotency-Key'] = init.idempotencyKey;
    }

    try {
      const response = await fetch(url.toString(), {
        body: init.body ? JSON.stringify(init.body) : undefined,

        headers,
        method: init.method,
      });

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorBody | null;
        if (body?.error) {
          return { error: body.error };
        }
        return {
          error: {
            code: 'HTTP_ERROR',
            message: response.statusText,
            status: response.status,
          },
        };
      }

      const body = (await response.json()) as ApiEnvelope<T>;
      return body;
    } catch (err) {
      return {
        error: {
          code: 'NETWORK_ERROR',
          message:
            err instanceof Error ? err.message : 'Unexpected network error',
          status: 0,
        },
      };
    }
  }

  async function health(): Promise<
    ApiEnvelope<HealthResponse> | { error: ApiErrorBody['error'] }
  > {
    return request<HealthResponse>({
      method: 'GET',
      path: '/health',
    });
  }

  return { health, request };
}
