# Task Prompt Index

<!-- GENERATED_BY_01_CREATE_SUB_TASK -->

## Source

- `docs/design/11-tasks.md`
- `docs/design/00-project-overview.md` through `docs/design/10-glossary.md`
- Uploaded prompt `01_create_sub_task.md`

## Execution rules

- Work on exactly one task at a time.
- Follow prerequisites and dependency order.
- Read only the task-specific Context Files before implementation.
- Do not mark a task complete until its Verify and Definition of Done pass.
- Update `docs/design/11-tasks.md` status only when implementation evidence exists.
- Add an ADR when a task makes a new architecture or vendor decision.

## Model distribution

- Tier B: 30 tasks
- Tier A: 36 tasks
- Tier S: 0 tasks

Tier S is intentionally unused. Tier B is used for bounded setup, CRUD, UI and integration tasks with explicit verification. Tier A is retained for permission, finance, security, pricing consistency, concurrency and migration-risk tasks.

## Ordered tasks

| # | File | Task | Phase | Complexity | Tier |
|---:|---|---|---|---|---|
| 01 | [01_confirm_decisions_and_adrs.md](01_confirm_decisions_and_adrs.md) | Confirm Product and Architecture Decisions | Phase 0 — Foundation and decision closure | High | A |
| 02 | [02_repository_monorepo_scaffold.md](02_repository_monorepo_scaffold.md) | Create Repository and Monorepo Scaffold | Phase 0 — Foundation | Medium | B |
| 03 | [03_typescript_and_module_boundaries.md](03_typescript_and_module_boundaries.md) | Configure Strict TypeScript and Module Boundaries | Phase 0 — Foundation | High | B |
| 04 | [04_configuration_environment_and_scripts.md](04_configuration_environment_and_scripts.md) | Implement Typed Configuration, Environment Validation and Root Scripts | Phase 0 — Foundation | Medium | B |
| 05 | [05_ci_quality_and_security_pipeline.md](05_ci_quality_and_security_pipeline.md) | Create CI, Quality Hooks and Security Scanning | Phase 0 — Foundation | High | B |
| 06 | [06_canonical_types_and_api_envelopes.md](06_canonical_types_and_api_envelopes.md) | Create Canonical Types and API Envelopes | Phase 0 — Foundation | Medium | B |
| 07 | [07_openapi_contract_and_client_generation.md](07_openapi_contract_and_client_generation.md) | Establish OpenAPI Contract and Client Generation | Phase 0 — Foundation | Medium | B |
| 08 | [08_repository_testkit_and_fakes.md](08_repository_testkit_and_fakes.md) | Build Repository Contract Testkit and Deterministic Fakes | Phase 0 — Foundation | High | A |
| 09 | [09_structured_logging_and_request_context.md](09_structured_logging_and_request_context.md) | Implement Structured Logging, Request Context and Correlation | Phase 0 — Foundation | Medium | B |
| 10 | [10_firebase_environments_and_auth_configuration.md](10_firebase_environments_and_auth_configuration.md) | Configure Firebase Environments and Authentication Providers | Phase 0 — Foundation | Medium | B |
| 11 | [11_firestore_storage_rules_and_emulators.md](11_firestore_storage_rules_and_emulators.md) | Create Deny-by-Default Rules and Emulator Test Baseline | Phase 0 — Foundation | High | A |
| 12 | [12_indexes_secrets_preview_and_export_skeleton.md](12_indexes_secrets_preview_and_export_skeleton.md) | Add Indexes, Secret/IAM Baseline, Preview Deployment and Export Skeleton | Phase 0 — Foundation | High | A |
| 13 | [13_foundation_contract_and_portability_verification.md](13_foundation_contract_and_portability_verification.md) | Verify Foundation Contracts and Database Portability | Phase 0 — Foundation verification | Very High | A |
| 14 | [14_firebase_token_and_internal_user_mapping.md](14_firebase_token_and_internal_user_mapping.md) | Implement Firebase Token Adapter and Internal User Mapping | Phase 1A — Identity | High | A |
| 15 | [15_onboarding_profile_addresses_preferences.md](15_onboarding_profile_addresses_preferences.md) | Build Onboarding, Profile, Address and Preference Flows | Phase 1A — Identity | Medium | B |
| 16 | [16_roles_permissions_and_authz_negative_tests.md](16_roles_permissions_and_authz_negative_tests.md) | Implement Roles, Permissions and Authorization Policies | Phase 1A — Identity and Security | Very High | A |
| 17 | [17_kyc_and_organization_membership.md](17_kyc_and_organization_membership.md) | Implement KYC Baseline and Organization Membership | Phase 1A — Identity and Trust | Very High | A |
| 18 | [18_provider_profiles_and_services.md](18_provider_profiles_and_services.md) | Implement Provider Profiles and Service Types | Phase 1A — Provider Supply | Medium | B |
| 19 | [19_printers_capabilities_and_materials.md](19_printers_capabilities_and_materials.md) | Implement Printers, Capabilities and Material Catalog | Phase 1A — Provider Supply | Medium | B |
| 20 | [20_provider_capacity_management.md](20_provider_capacity_management.md) | Implement Provider Capacity Slots and Reservations | Phase 1A — Provider Supply | High | A |
| 21 | [21_provider_onboarding_public_profile_and_trust.md](21_provider_onboarding_public_profile_and_trust.md) | Build Provider Onboarding, Public Profile and Trust Projection | Phase 1A — Provider Supply | Medium | B |
| 22 | [22_service_request_draft_and_publish.md](22_service_request_draft_and_publish.md) | Implement Service Request Draft and Publish Flow | Phase 1A — Jobs | Medium | B |
| 23 | [23_private_asset_access_grants.md](23_private_asset_access_grants.md) | Implement Private Asset Access Grants for Requests and Orders | Phase 1A — Files/Security | High | A |
| 24 | [24_job_discovery_and_filters.md](24_job_discovery_and_filters.md) | Implement Job Discovery and Provider Eligibility Filters | Phase 1A — Jobs | Medium | B |
| 25 | [25_proposals_revisions_and_milestones.md](25_proposals_revisions_and_milestones.md) | Implement Proposals, Revisions and Proposal Milestones | Phase 1A — Jobs | High | B |
| 26 | [26_proposal_comparison_acceptance_and_events.md](26_proposal_comparison_acceptance_and_events.md) | Build Proposal Comparison and Idempotent Acceptance | Phase 1A — Jobs | High | A |
| 27 | [27_order_state_matrix_and_snapshots.md](27_order_state_matrix_and_snapshots.md) | Approve Order State Matrix and Implement Order Snapshots | Phase 1A — Orders | Very High | A |
| 28 | [28_order_transitions_and_status_events.md](28_order_transitions_and_status_events.md) | Implement Order Transition Commands and Status Events | Phase 1A — Orders | High | A |
| 29 | [29_order_milestones_changes_and_production.md](29_order_milestones_changes_and_production.md) | Implement Order Milestones, Change Requests and Production Updates | Phase 1A — Orders | High | A |
| 30 | [30_order_workspaces_and_state_tests.md](30_order_workspaces_and_state_tests.md) | Build Buyer/Provider Order Workspaces and Complete State Tests | Phase 1A — Orders | Medium | B |
| 31 | [31_payment_port_and_intents.md](31_payment_port_and_intents.md) | Implement Payment Port, Sandbox Adapter and Payment Intents | Phase 1A — Payments | High | A |
| 32 | [32_payment_webhooks_idempotency_and_reconciliation.md](32_payment_webhooks_idempotency_and_reconciliation.md) | Implement Signed Payment Webhooks, Idempotency and Reconciliation | Phase 1A — Payments | Very High | A |
| 33 | [33_refunds_payouts_and_finance_admin.md](33_refunds_payouts_and_finance_admin.md) | Implement Refunds, Payout Holds and Finance Operations | Phase 1A — Payments | Very High | A |
| 34 | [34_payment_security_review.md](34_payment_security_review.md) | Perform Payment and Financial Security Review | Phase 1A — Payments verification | Very High | A |
| 35 | [35_shipping_tracking_and_address_snapshots.md](35_shipping_tracking_and_address_snapshots.md) | Implement Shipping, Tracking, Proof and Address Snapshots | Phase 1A — Shipping | Medium | B |
| 36 | [36_conversations_chat_and_attachments.md](36_conversations_chat_and_attachments.md) | Implement Conversations, Chat UI and Attachment Access | Phase 1A — Messaging | High | B |
| 37 | [37_notifications_email_push_and_abuse_controls.md](37_notifications_email_push_and_abuse_controls.md) | Implement In-App Notifications, Email, PWA Push and Abuse Controls | Phase 1A — Messaging | High | B |
| 38 | [38_verified_reviews_and_review_ui.md](38_verified_reviews_and_review_ui.md) | Implement Verified Reviews and Review UI | Phase 1A — Trust | Medium | B |
| 39 | [39_reports_moderation_and_disputes.md](39_reports_moderation_and_disputes.md) | Implement Reports, Moderation Cases and Dispute Holds | Phase 1A — Trust/Admin | Very High | A |
| 40 | [40_admin_audit_and_staff_masking.md](40_admin_audit_and_staff_masking.md) | Build Admin Operations, Audit Log and Staff Data Masking | Phase 1A — Admin | Very High | A |
| 41 | [41_phase1a_e2e_security_accessibility_readiness.md](41_phase1a_e2e_security_accessibility_readiness.md) | Complete Phase 1A E2E, Security, Recovery and Readiness Review | Phase 1A — Verification | Very High | A |
| 42 | [42_file_assets_upload_sessions_and_resumable_upload.md](42_file_assets_upload_sessions_and_resumable_upload.md) | Implement File Assets, Upload Sessions and Resumable Upload | Phase 1B — Files | High | B |
| 43 | [43_file_completion_scan_access_and_retention.md](43_file_completion_scan_access_and_retention.md) | Implement Upload Completion, Checksum, Quarantine, Scan, Access and Retention | Phase 1B — Files | Very High | A |
| 44 | [44_upload_offline_retry_ui.md](44_upload_offline_retry_ui.md) | Complete Upload Offline, Retry and Recovery UI | Phase 1B — Files/UI | Medium | B |
| 45 | [45_parser_viewer_preview_and_dimensions.md](45_parser_viewer_preview_and_dimensions.md) | Select and Implement Safe 3D Parser, Viewer, Preview and Dimensions | Phase 1B — Viewer/Analysis | High | B |
| 46 | [46_sandbox_analyzer_and_versioned_analysis.md](46_sandbox_analyzer_and_versioned_analysis.md) | Implement Sandboxed Model Analyzer Worker and Versioned Analysis | Phase 1B — Viewer/Analysis | Very High | A |
| 47 | [47_analysis_ui_and_file_security_tests.md](47_analysis_ui_and_file_security_tests.md) | Build Analysis UI and Complete Corrupt/Oversize/Fuzz Security Tests | Phase 1B — Viewer/Analysis | High | B |
| 48 | [48_pricing_formula_profiles_and_calculator.md](48_pricing_formula_profiles_and_calculator.md) | Define Pricing Formula and Implement Versioned Pricing Profiles | Phase 1B — Pricing | Very High | A |
| 49 | [49_eligibility_and_pricing_engine.md](49_eligibility_and_pricing_engine.md) | Implement Instant Quote Eligibility and Pricing Engine | Phase 1B — Pricing | Very High | A |
| 50 | [50_quote_snapshot_expiry_and_capacity_reservation.md](50_quote_snapshot_expiry_and_capacity_reservation.md) | Implement Quote Snapshot, Expiry and Capacity Reservation | Phase 1B — Pricing | Very High | A |
| 51 | [51_quote_comparison_checkout_and_manual_fallback.md](51_quote_comparison_checkout_and_manual_fallback.md) | Build Quote Comparison, Checkout and Manual Fallback | Phase 1B — Pricing/UI | High | B |
| 52 | [52_phase1b_pricing_and_file_security_verification.md](52_phase1b_pricing_and_file_security_verification.md) | Complete Phase 1B Pricing, Concurrency, Queue and File Security Verification | Phase 1B — Verification | Very High | A |
| 53 | [53_content_posts_media_and_feed.md](53_content_posts_media_and_feed.md) | Implement Content Posts, Media and Feed Projection | Phase 1C — Content | Medium | B |
| 54 | [54_social_interactions_verified_content_and_consent.md](54_social_interactions_verified_content_and_consent.md) | Implement Social Interactions, Verified Content Links and Showcase Consent | Phase 1C — Content | High | B |
| 55 | [55_content_moderation_and_creator_profiles.md](55_content_moderation_and_creator_profiles.md) | Implement Content Moderation and Creator/Provider Profiles | Phase 1C — Content | High | B |
| 56 | [56_product_schemas_inventory_and_used_printer_evidence.md](56_product_schemas_inventory_and_used_printer_evidence.md) | Implement Product Schemas, Variants, Inventory and Used-Printer Evidence | Phase 1C — Commerce | High | B |
| 57 | [57_product_search_order_and_seller_store.md](57_product_search_order_and_seller_store.md) | Build Product Search, Detail/Compare, Product Order and Seller Store | Phase 1C — Commerce | High | A |
| 58 | [58_promotion_subscription_and_phase1c_verification.md](58_promotion_subscription_and_phase1c_verification.md) | Implement Promotion, Subscription and Complete Phase 1C Verification | Phase 1C — Monetization and Verification | Very High | A |
| 59 | [59_mobile_framework_and_api_client.md](59_mobile_framework_and_api_client.md) | Select Mobile Framework and Establish Mobile API Client | Phase 2A — Mobile Foundation | High | B |
| 60 | [60_mobile_auth_and_core_buyer_flows.md](60_mobile_auth_and_core_buyer_flows.md) | Implement Mobile Authentication and Core Buyer Flows | Phase 2A — Mobile | High | A |
| 61 | [61_mobile_push_camera_upload_and_offline.md](61_mobile_push_camera_upload_and_offline.md) | Implement Mobile Push, Deep Links, Camera, Background Upload and Offline Drafts | Phase 2A — Mobile | High | A |
| 62 | [62_mobile_seller_workspace_quality_and_store_deployment.md](62_mobile_seller_workspace_quality_and_store_deployment.md) | Implement Mobile Seller Workspace, Quality Review and Store Deployment | Phase 2A — Mobile Release | Very High | A |
| 63 | [63_cloud_slicer_service.md](63_cloud_slicer_service.md) | Implement Versioned Cloud Slicer Service | Phase 2B — Advanced Platform | Very High | A |
| 64 | [64_smart_matching_and_dynamic_pricing.md](64_smart_matching_and_dynamic_pricing.md) | Implement Explainable Smart Matching and Guarded Dynamic Pricing Experiments | Phase 2B — Advanced Platform | Very High | A |
| 65 | [65_print_farm_api_affiliate_official_store_and_analytics.md](65_print_farm_api_affiliate_official_store_and_analytics.md) | Implement Print Farm Partner API, Affiliate, Official Store and Advanced Analytics | Phase 2B — Advanced Platform | Very High | A |
| 66 | [66_migration_trigger_and_release_operations.md](66_migration_trigger_and_release_operations.md) | Evaluate Database Migration Triggers and Finalize Release Operations | Phase 2B — Portability and Operations | Very High | A |

## Assumptions

- The repository currently contains design documents but no application scaffold.
- Paths under `apps/`, `services/`, `packages/`, `firebase/` and `infra/` are created by the foundation tasks.
- `pnpm`, monorepo tooling, Web framework and Mobile framework remain governed by Task 01 decisions.
- Firebase is an infrastructure adapter; business clients do not directly access Firestore.
- External vendor choices and commercial/legal rates remain open until approved.

## Open questions carried forward

- Payment/payout provider and compliant fund flow
- KYC vendor and retention
- Search and shipping providers
- 3D parser/slicer licensing and profile scope
- Pricing formula rates, platform fees, tax and rounding
- Subscription, promotion and affiliate commercial rules
- Exact migration trigger thresholds
