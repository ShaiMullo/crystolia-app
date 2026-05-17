# Rollback — Demo Deployment

The demo runs versioned images in GHCR tagged with the **commit short SHA**
(plus a moving `demo-latest`). Rolling back = running an older SHA tag.

## Find a good tag

GHCR keeps every pushed tag. List recent ones:

```bash
# locally, or on the box
docker image ls 'ghcr.io/<owner>/crystolia-backend'
```

Or read the **Demo Deploy** workflow run history in GitHub Actions — each run's
summary shows the image tag it deployed.

## Option A — re-run the workflow (preferred)

GitHub → Actions → **Demo Deploy** → **Run workflow** → set **ref** to the
older commit SHA / tag. It rebuilds and redeploys that exact code.

## Option B — roll back on the box (fastest, no rebuild)

The images for the previous deploy are already in GHCR. SSH in and redeploy a
known-good tag:

```bash
cd /opt/crystolia
IMAGE_TAG=<good-short-sha> bash deploy/demo/remote-deploy.sh
```

`remote-deploy.sh` pulls that tag, restarts, and health-checks. If the health
check fails it exits non-zero and prints backend logs.

## Option C — manual compose

```bash
cd /opt/crystolia
IMAGE_TAG=<good-short-sha> \
  docker compose -f docker-compose.demo.yml --env-file deploy/demo/.env.demo pull
IMAGE_TAG=<good-short-sha> \
  docker compose -f docker-compose.demo.yml --env-file deploy/demo/.env.demo up -d
```

## Verify after rollback

```bash
docker compose -f docker-compose.demo.yml ps
curl -fsS https://api.crystolia.com/api/health
```

Then check **Admin → System** — health score healthy, failed-jobs not climbing.

## Database considerations

- All schema changes across phases were **additive** — an older image runs
  safely against a newer database. Newer fields are simply ignored.
- A code rollback needs **no** database rollback.
- If a future change is destructive, document a paired down-step before
  shipping it.

## Caddy / TLS

Certificates persist in the `caddy_data` Docker volume across deploys and
rollbacks. A rollback does **not** re-issue certificates. **Do not delete that
volume** — re-issuing repeatedly can hit Let's Encrypt rate limits.

## Full restart (last resort)

```bash
cd /opt/crystolia
docker compose -f docker-compose.demo.yml --env-file deploy/demo/.env.demo down
docker compose -f docker-compose.demo.yml --env-file deploy/demo/.env.demo up -d
```

`down` keeps named volumes (`caddy_data`, `mongo_data`). **Never** add `-v` —
that deletes certificates and, with local Mongo, the database.

## Rollback decision guide

| Symptom                         | Action |
|---------------------------------|--------|
| Backend unhealthy after deploy  | Option B with the previous SHA |
| Admin UI broken, API fine       | Option A — rebuild the previous ref |
| TLS errors                      | Check DNS + `docker compose logs caddy`; do not wipe `caddy_data` |
| Bad data from a scheduled job   | Disable the job in Admin → System, then roll back |
| Box out of memory / OOM         | `docker compose restart`; consider a larger bundle |
