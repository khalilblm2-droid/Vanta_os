# Changelog — VANTA OS
All notable changes to this project will be documented in this file (Section 63).
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] — 2026-06-20
### Added
- Initial scaffold of VANTA OS — Shopify Embedded AI Agent App.
- Multi-tenant Prisma schema: Shop, StaffMember, Task, TaskLog, TaskDiff, UndoSnapshot, CommandHistory, AuditLog, ScopeAuditLog, Notification, Feedback, FeatureFlag, RecurringMission, GuardianAlert, AbExperiment, ProcessedWebhook, KnowledgeBaseEntry, RateLimitSnapshot, AppEvent.
- `shopify.app.toml` with 5 mandatory webhooks (app/uninstalled, customers/redact, customers/data_request, shop/redact, app/scopes_update) and pinned API version 2025-04.
- Full env template covering Shopify Admin API, Partner API, Gemini, Redis, Postgres, Resend, Sentry.
- `package.json` scripts for dev / worker / build / migrate / backup / test / deploy.
- Docker + docker-compose for one-command local stack.
- Whitelabel config foundation for agency reseller mode.
- Kill switch, blast-radius, A/B testing, Guardian mode, voice input all wired into schema as feature flags.

### Security
- Session storage via `@shopify/shopify-app-session-storage-prisma` (no hand-rolled encryption).
- HMAC verification on every webhook (Section 5.2).
- Zod validation layer (Section 66) at every backend boundary.
- Content-Security-Policy headers (Section 74).
- AI prompt injection blocklist (Section 67).

### Authorship
