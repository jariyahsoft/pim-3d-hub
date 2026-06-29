# ADR-024: Mobile Framework Selection

**Status:** Accepted  
**Date:** 2026-06-29  
**Supersedes:** ADR-014 (open)

## Context

Phase 2 delivers a cross-platform mobile app (Android and iOS) sharing the same REST/OpenAPI contract as the Phase 1 Web/PWA. The SRS and ADR-014 deferred the framework choice until Task 59 so that spike evidence could inform the decision.

### Decision criteria (from ADR-014)

1. Background upload reliability
2. Camera/video capture quality
3. Push/deep-link support
4. Secure storage and offline draft ergonomics
5. Generated API client integration from the shared OpenAPI contract
6. Team skill and maintenance burden

### Additional constraints observed during Phase 1B/1C

- The monorepo is **100 % TypeScript** across 15+ workspace packages.
- Domain types, validation, and test infrastructure (`vitest`, `eslint`, `prettier`) are TypeScript-native.
- The OpenAPI client generation toolchain (`openapi-typescript` + `openapi-fetch`) is TypeScript-native.
- The team (human + AI agents) has demonstrable TypeScript expertise.

## Options evaluated

### Option A — React Native with TypeScript + Expo

**Background upload:** `expo-file-system` + `expo-network` provides resumable upload, progress tracking, and offline detection matching the Phase 1B upload UI exactly.  
**Camera/video:** `expo-camera` captures 3D reference photos and video with full permission control.  
**Push/deep links:** Expo Push API + `expo-linking` + Firebase Cloud Messaging.  
**Secure storage:** `expo-secure-store` with Keychain (iOS) / EncryptedSharedPreferences (Android).  
**Offline drafts:** `AsyncStorage` with the same draft/serialization pattern as the existing web `upload-demo.ts`.  
**Generated API client:** `openapi-typescript` generates fully typed fetch wrappers from the existing OpenAPI 3.1 contract, consuming the same `@pim/contracts` package.  
**Team skill:** Same TypeScript toolchain, same lint/typecheck/test runner, minimal new concept overhead.

### Option B — Flutter with Dart

**Background upload:** `dio` + `flutter_workmanager` — reliable but requires Dart-native implementation separate from the existing web upload logic.  
**Camera/video:** `camera` plugin — equivalent to Expo.  
**Push/deep links:** Firebase Messaging + `go_router` — separate setup from web.  
**Secure storage:** `flutter_secure_storage`.  
**Offline drafts:** `sqflite` or `shared_preferences`.  
**Generated API client:** Requires `openapi-generator` Dart output, which has different codegen conventions from the existing TypeScript client.  
**Team skill:** Requires Dart proficiency; existing TypeScript domain knowledge is not directly reusable.

## Decision

**React Native with TypeScript + Expo** is accepted for Phase 2 mobile.

### Rationale

1. **Shared contract toolchain** — `openapi-typescript` + `openapi-fetch` already generates the web client in `@pim/contracts`. The mobile app uses the **same generated client**, eliminating a parallel codegen pipeline and reducing contract drift risk.
2. **Shared domain knowledge** — Domain types from `@pim/domain` can be consumed directly without a language boundary. Validation rules (zod schemas, pricing bps arithmetic, eligibility logic) are already in TypeScript and reusable.
3. **Same test infrastructure** — `vitest` runs mobile unit tests alongside web tests in one command. No separate Dart test runner needed.
4. **Expo managed workflow** — Handles native build, push, and OTA updates without a separate native toolchain (Xcode/Android Studio) for development iteration.
5. **Offline draft reuse** — The serialization pattern from `apps/web/src/upload-demo.ts` can be replicated in `expo-secure-store` with identical structure.
6. **AI agent capability** — All agents working in this repository are TypeScript-based. Dart would require a separate agent profile.

### Decision criteria score

| Criterion                |  React Native + Expo   |   Flutter   |
| ------------------------ | :--------------------: | :---------: |
| Background upload        | ✅ (expo-file-system)  |  ✅ (dio)   |
| Camera/video             |    ✅ (expo-camera)    |     ✅      |
| Push/deep links          |     ✅ (Expo Push)     |  ✅ (FCM)   |
| Secure storage           | ✅ (expo-secure-store) |     ✅      |
| Generated client         | ✅ (shared toolchain)  | ⚠️ separate |
| Team skill / maintenance |    ✅ (TypeScript)     |   ⚠️ Dart   |

## Consequences

- **Positive:** Mobile development can reuse all existing `@pim/domain`, `@pim/contracts`, `@pim/config`, and `@pim/testkit` packages directly.
- **Positive:** CI can lint, typecheck, and test mobile code with the same `pnpm` / `turbo` pipeline — no Dart SDK required in the base CI image.
- **Positive:** The Expo managed workflow lets Phase 2 iterate on business features before committing to a native build pipeline.
- **Negative:** Native modules (custom camera filters, background file processing beyond Expo's API) may require an Expo dev client or a bare workflow eject. This is acceptable for Phase 2 scope.
- **Negative:** Flutter's widget-based rendering provides more consistent cross-platform pixel output. React Native requires more manual styling for platform-specific behavior. This is a tolerable trade-off given the existing Thai/frontend patterns.

## Acceptance criteria

- [x] Framework ADR is Accepted with spike evidence
- [x] `apps/mobile` compiles under `pnpm typecheck`
- [x] Generated client can be imported by the mobile package
- [x] No direct Firestore business collection code exists in mobile
