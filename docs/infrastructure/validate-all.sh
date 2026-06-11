#!/usr/bin/env bash
# =============================================================================
# Crystolia — static validation (NO cloud calls, safe to run anytime)
# Run from the crystolia-app repo root. Requires: terraform, helm, docker, yamllint
# =============================================================================
set -uo pipefail
fail=0

echo "▶ docker compose config (local / demo)"
docker compose -f docker-compose.local.yml config -q && echo "  ✅ local" || { echo "  ❌ local"; fail=1; }
docker compose -f docker-compose.demo.yml  config -q && echo "  ✅ demo"  || { echo "  ❌ demo";  fail=1; }

echo "▶ helm lint (crystolia-chart)"
helm lint helm/crystolia-chart \
  -f ../crystolia-gitops/staging/values.yaml && echo "  ✅ chart" || fail=1

echo "▶ helm template (render smoke test)"
helm template crystolia helm/crystolia-chart \
  -f ../crystolia-gitops/staging/values.yaml >/dev/null && echo "  ✅ renders" || fail=1

echo "▶ terraform fmt + validate (cheap)"
( cd terraform-cheap && terraform fmt -check -recursive && terraform init -backend=false -input=false >/dev/null && terraform validate ) \
  && echo "  ✅ terraform-cheap" || fail=1

echo "▶ terraform fmt + validate (enterprise infra)"
( cd ../crystolia-infra/terraform && terraform fmt -check -recursive && terraform init -backend=false -input=false >/dev/null && terraform validate ) \
  && echo "  ✅ infra/terraform" || fail=1

echo "▶ yamllint (gitops argocd apps)"
yamllint -d relaxed ../crystolia-gitops/argocd && echo "  ✅ argocd yaml" || fail=1

[ "$fail" -eq 0 ] && echo "✅ ALL STATIC CHECKS PASSED" || echo "❌ Some checks failed (see above)"
exit $fail
