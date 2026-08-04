---
applyTo: '**'
description: "Security standards — input validation, secrets, auth"
---

> ⚠️ **Customize for your team.** This is a template. Adapt these practices based on your regulatory requirements, threat model, and compliance obligations. Delete this file if your team doesn't need it.

# Security Standards
## Input Validation
- Validate all user input at entry points.
- Sanitize data before use in queries, commands, or rendering.
- Use allowlists over denylists.
- Enforce type safety and constraints.
## Secrets Management
- Never hardcode credentials, API keys, or secrets.
- Use environment variables or secure vaults (Azure Key Vault, AWS Secrets Manager).
- Zero hard-coded configuration values. Maintain `.env.example`.
## Authentication & Authorization
- Implement authentication for all protected resources.
- Use role-based or claims-based authorization.
- Validate tokens on every request.
