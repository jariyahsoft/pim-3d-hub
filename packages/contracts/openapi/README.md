# OpenAPI Contract

Edit `openapi.v1.json` for `/api/v1` changes. Keep provider SDK payloads, Firestore cursors, Firestore types, and Firebase UIDs out of the public contract.

Generate the typed client and response types with:

```bash
corepack pnpm openapi:generate
```

Validate the contract with:

```bash
corepack pnpm openapi:lint
corepack pnpm openapi:check
```

When adding a new endpoint:

1. Update `openapi.v1.json` with the new path, operation, request validation, and response envelope.
2. Regenerate the client types.
3. Run the lint and breaking-change checks.
4. Update `reference/openapi.v1.json` only after reviewing any breaking change.
