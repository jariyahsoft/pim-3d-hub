# Infra

Infrastructure and deployment automation live here.

## Service identity baseline

| Identity | Purpose | Minimum access |
|---|---|---|
| `pim-api-runtime` | API runtime for business requests | Firestore/Storage runtime access, outbound provider calls, read-only secret access to API credentials |
| `pim-workers-runtime` | background workers and export jobs | Firestore/Storage runtime access, queue execution, export destination write, read-only secret access |
| `pim-preview-deployer` | preview/staging workflow deployer | rules/index deploy for preview or staging only, no production target |
| `pim-ci-readonly` | CI validation | no wildcard admin role, no production secret access |

## Secret baseline

- Store runtime secrets in Secret Manager or an equivalent managed secret system
- Reference secret names only; never commit secret material
- Grant runtime identities read access only to the secrets they consume
- Use overlap rotation for webhook/provider keys before revocation

## Deployment guardrails

- Pull requests may target `preview` only and must remain dry-run
- `staging` deployment is allowed only through workflow dispatch or an equivalent controlled trigger
- Production is excluded from this baseline workflow and still requires a later explicit release task
