# Firebase

Firebase adapters, rules and emulator assets live here.

## Environment references

Use separate Firebase projects and aliases for each environment.

| Environment | Deployment alias | Project ID | Ownership |
|---|---|---|---|
| Local | `local` | `demo-pim-3d-hub-local` | Platform engineering |
| Development | `development` | `pim-3d-hub-development` | Platform engineering |
| Staging | `staging` | `pim-3d-hub-staging` | Release engineering |
| Production | `production` | `pim-3d-hub-production` | Platform owner |

## Authentication baseline

- Supported providers: email/password, Google, Apple, phone
- Local emulator test flow: email/password and phone
- Authorized domains and redirect URLs must be documented in the root `.env.example`
- Production credentials must never use the local emulator alias or placeholder secret values
- Firestore and Storage emulator hosts must remain unset outside `APP_ENV=local`

## Emulator guardrail

The committed emulator config is safe for local use only. Default scripts and local docs must always target the `local` alias, not staging or production.

## Rules baseline

- Firestore client access is deny-by-default for business collections
- Storage allows read-only access only under `public-content/*`
- Private source files under `private/*` remain unreadable to direct clients
- Validate the baseline with `corepack pnpm test:rules`

## Index source

- `firestore.indexes.json` is the source-controlled composite index set
- `firestore.indexes.md` maps every composite index back to a documented query
- Validate the committed list with `corepack pnpm firestore:indexes:check`
