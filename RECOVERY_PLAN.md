# 🚑 Multi-Repo Recovery Plan

## Phase 1: Audit Report

| File/Folder | Repository | Status | Remediation |
| :--- | :--- | :--- | :--- |
| `backend-legacy/` | `crystolia-app` | ❌ Duplicate | DELETE (Redundant, `backend/` exists) |
| `backend/` | `crystolia-app` | ✅ Correct | KEEP |
| `Jenkinsfile*` | `crystolia-app` | ❌ Legacy | DELETE |
| `split_repos*.sh` | `crystolia-app` | ❌ Legacy | DELETE |
| `.terraform/` | `crystolia-infra` | ❌ Forbidden | DELETE (Gitignored artifact) |
| `*.tfstate` | `crystolia-infra` | ❌ Forbidden | DELETE (Secrets risk) |
| `argocd/` | `crystolia-gitops` | ✅ Correct | KEEP |
| `staging/values.yaml` | `crystolia-gitops` | ✅ Correct | KEEP |

## Phase 2: Repair Structure Strategy

We will use a `repair_restructure.sh` script to enforce this state.

### 1. Crystolia App Cleanup
- Remove `backend-legacy` to avoid confusion.
- Remove CI legacy scripts.
- Ensure `docker-compose.yml` points to `backend`.

### 2. Crystolia Infra Cleanup
- Remove `.terraform` folders (re-init required later).
- Remove `*.tfstate` files (state should be remote or explicitly managed, not loose).
- Remove `create_www.json` (legacy).

### 3. Crystolia GitOps Verification
- Ensure folder structure is valid.

## Phase 3: Execution Safety
The repair script will:
- Use `rsync` for safe file operations.
- Explicitly `rm` known bad artifacts.
- NOT touch your AWS credentials or running clusters.
