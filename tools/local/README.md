# tools/local — local helper scripts (not committed)

macOS double-click `.command` wrappers for one person's local ops workflow.
They are **gitignored on purpose** (`*.command` in the root `.gitignore`):

- some embed machine-specific paths (`~/.ssh/crystolia-demo.pem`, `~/Downloads`)
- some embed the operator's home IP for the SSH firewall allowlist
- the repo is public; the committed, shareable equivalents live in `scripts/`
  and `docs/infrastructure/`

Secrets are never stored in these files — scripts that need a token/URI read
it from the clipboard or prompt interactively.

## Inventory

| Script | Purpose |
|---|---|
| `apply-cheap-prod.command` | Guarded `terraform apply` for Cheap Production (pre-flight checks first) |
| `audit-server-state.command` | Read-only SSH inspect of `/opt/crystolia` on the server |
| `build-mongo-uri.command` | Build Atlas `MONGO_URI` from clipboard password |
| `deploy-run.command` | Trigger the "Demo Deploy" GitHub Actions workflow and watch it |
| `deploy-rerun.command` | Re-run only the failed jobs of the last deploy run |
| `dns-audit.command` | Read-only Route53 zone/record inspection |
| `dns-apply.command` | UPSERT admin/api A records → Lightsail static IP |
| `firewall-open-22.command` | Temporarily open SSH to the world |
| `firewall-close-22.command` | Re-lock SSH to the home IP /32 |
| `launch-demo.command` | Start the local demo stack |
| `run-plan.command` | Read-only pre-apply checks + `terraform plan` |
| `set-ghcr-pat.command` | Set `GHCR_PAT` GitHub secret from clipboard |
| `set-github-secrets.command` | Set the 3 demo-deploy GitHub secrets |
| `set-mongo-uri.command` | Write Atlas URI from clipboard into `backend/.env.demo` |
| `smoke-test-prod.command` | Smoke test live HTTPS endpoints + TLS issuer |
| `test-mongo.command` | Test Mongo connectivity from the server (no deploy) |
| `upload-env-to-server.command` | Upload the 4 `.env.demo` files to the server |
| `verify-server.command` | Read-only SSH server verification |
