# Rollback

Deployment is GitOps — the cluster state is whatever the GitOps repo says.
**Rolling back means reverting the image tag in the GitOps values file.**

## Fast rollback (image tag)

1. Open `crystolia-gitops`.
2. In `staging/values.yaml` (or `production/values.yaml`), set the failing
   component's `image.tag` back to the last known-good SHA / version.
   Tags are full commit SHAs (staging) or `v*` versions (production).
3. Commit & push.
4. ArgoCD syncs the cluster back to the previous image.
5. Verify health endpoints + Admin → System.

To find the last good tag: `git log` on the GitOps values file — every
CI tag bump is a commit (`ci: update staging images to <sha>`).

## ArgoCD rollback (UI / CLI)

If a sync is mid-flight or you want an immediate revert without a git commit:

```bash
argocd app history crystolia
argocd app rollback crystolia <REVISION>
```

Note: with `selfHeal: true` ArgoCD will re-sync to whatever GitOps says — a
UI rollback is temporary unless you also revert the GitOps commit.

## Kubernetes-level rollback (emergency only)

```bash
kubectl rollout undo deployment/crystolia-backend -n crystolia
kubectl rollout status deployment/crystolia-backend -n crystolia
```

`revisionHistoryLimit: 5` keeps the last 5 ReplicaSets for this. This is a
**stop-gap** — ArgoCD self-heal will revert it; follow up with a GitOps commit.

## Database considerations

- No destructive schema migrations exist — all phases were additive. A code
  rollback is safe against a newer database.
- New fields written by a newer version are simply ignored by an older version.
- **Exception:** if a future phase adds a destructive migration, document a
  paired down-migration here before shipping it.

## Post-rollback checklist

- [ ] `/api/health` returns `ok` on the affected env.
- [ ] Admin → System health score is back to healthy.
- [ ] Failed-jobs count is not climbing.
- [ ] Run `npm run smoke` against the env.
- [ ] Record the incident: what failed, the bad tag, the restored tag.

## Rollback decision guide

| Symptom                          | Action |
|----------------------------------|--------|
| Backend crash-looping            | Revert backend tag immediately |
| Admin UI broken, API healthy     | Revert frontend-admin tag only |
| Bad data from a job              | Disable the job (Admin → System), then revert |
| Reconciliation drift after deploy| Run reconciliation autofix; revert if it persists |
