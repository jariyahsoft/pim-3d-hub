# Firestore Index Map

Each composite index in `firestore.indexes.json` maps to a documented query from `docs/design/03-database-design.md`.

| Collection group | Query / use case |
|---|---|
| `service_requests` | service-request discovery by status, service type, province and recent creation |
| `proposals` | proposals for one request filtered by status and newest revision |
| `orders` (`buyerId`) | buyer order list by status and recent updates |
| `orders` (`providerId`) | provider order list by status and recent updates |
| `provider_services` | provider search cards by service type, province and instant-order availability |
| `printers` | provider printer lookup by technology and status |
| `capacity_slots` | provider capacity lookup ordered by start time |
| `file_assets` | owner file list by status and newest upload |
| `posts` | public/community feed ordering |
| `products` | marketplace category listing by newest item |
| `messages` | ordered conversation timeline |
| `notifications` | per-user notification inbox ordering |

No speculative high-cardinality composites are allowed outside this list without a new ADR or task update.
