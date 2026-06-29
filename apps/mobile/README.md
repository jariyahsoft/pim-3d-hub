# @pim/mobile — React Native (Expo) Mobile App

Framework: **React Native + TypeScript + Expo** (see [ADR-024](../../docs/design/adr-024-mobile-framework.md)).

## Structure

```
apps/mobile/
  src/
    index.ts           — Public exports
    env-config.ts      — Mobile environment configuration
    api-client.ts      — Typed API client over OpenAPI contract
    navigation.ts      — Route constants, tab bar, create menu
    mobile.test.ts     — Unit tests
```

## Key rules

- **No direct Firestore business collection access.** Mobile reads/writes data only through the REST/OpenAPI contract.
- **No duplicated business logic.** Domain rules (pricing, eligibility, state machines, permissions) are owned by `@pim/domain` and always enforced server-side.
- **`@pim/contracts`** provides the generated TypeScript client types from the OpenAPI 3.1 spec.
- **TypeScript toolchain** — same `vitest`/`eslint`/`prettier` as the rest of the monorepo.
