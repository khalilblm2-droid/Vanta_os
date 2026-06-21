# VANTA OS — API Documentation Plan

This directory will host:
- `openapi.yaml` — OpenAPI 3.0 spec for all `/api/*` REST endpoints (Section 85)
- `swagger-ui.html` — Swagger UI served at `/docs`, protected by `INTERNAL_DOCS_SECRET`

The full OpenAPI spec will be authored in Phase 3 alongside the API route implementations
so every endpoint is documented as it lands.

## Planned endpoints (Phase 3+)

| Method | Path                                | Purpose                                  | Spec Section |
| ------ | ----------------------------------- | ---------------------------------------- | ------------ |
| POST   | `/api/tasks`                        | Create a new agent task                  | 9, 10, 65    |
| GET    | `/api/tasks/:id`                    | Poll task status (frontend polls 2-3s)   | 7            |
| GET    | `/api/tasks`                        | List tasks (Task History)                | 9            |
| POST   | `/api/tasks/:id/approve`            | Approve a consequential action           | 8, 10        |
| POST   | `/api/tasks/:id/undo`               | Undo a modifying action                  | 22           |
| GET    | `/api/tasks/:id/diff`               | Get visual diff for a task               | 60           |
| GET    | `/api/tasks/:id/logs`               | Get full task logs                       | 7            |
| GET    | `/api/tasks/:id/report`             | Print-friendly PDF report                | 52           |
| GET    | `/api/command-history`              | Last 20 commands (↑ arrow recall)        | 50           |
| GET    | `/api/notifications`                | Notification center list                 | 78           |
| POST   | `/api/notifications/:id/read`       | Mark notification as read                | 78           |
| GET    | `/api/settings`                     | Get shop settings                        | 9.5          |
| PATCH  | `/api/settings`                     | Update shop settings                     | 9.5          |
| GET    | `/api/billing`                      | Current plan + credit usage              | 5.3, 9.7     |
| GET    | `/api/feature-flags`                | List feature flags for shop              | 70           |
| PATCH  | `/api/feature-flags/:key`           | Toggle a feature flag                    | 70           |
| POST   | `/api/recurring-missions`           | Create a recurring mission               | 33           |
| GET    | `/api/recurring-missions`           | List recurring missions                  | 33           |
| DELETE | `/api/recurring-missions/:id`       | Delete a recurring mission               | 33           |
| GET    | `/api/guardian-alerts`              | List guardian alerts                     | 34           |
| POST   | `/api/guardian-alerts/:id/fix`      | Trigger auto-fix                         | 34           |
| GET    | `/api/data-controls/export`         | Self-service data export                 | 9.10, 39     |
| DELETE | `/api/data-controls/delete`         | Self-service data deletion               | 9.10, 39     |
| POST   | `/api/feedback`                     | Submit feedback                          | 82           |
| GET    | `/api/audit-log`                    | Permission audit log                     | 62           |
| GET    | `/api/rate-limit`                   | Current rate limit status                | 53           |
| GET    | `/health`                           | Liveness probe                           | 40           |
| GET    | `/docs`                             | Swagger UI (auth-gated)                  | 85           |
| GET    | `/agency`                           | Agency dashboard (AGENCY_SECRET-gated)   | 72           |
