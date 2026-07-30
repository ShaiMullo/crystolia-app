# MongoDB Restore Runbook (production box)

Backups are produced daily by `.github/workflows/database-backup.yml`
(mongodump `--archive --gzip`, SHA-256 checksum, automated restore test,
S3 upload with SSE-AES256, 35-day retention). This is the human procedure
for restoring one.

**Restoring overwrites data. Confirm with the owner before running step 5
against the production database.**

## 1. Pick a backup

```bash
aws s3 ls s3://$BACKUP_S3_BUCKET/mongodb/ --recursive | sort | tail -20
```

Each day has `crystolia-<date>.archive.gz` and a matching `.sha256`.

## 2. Download and verify integrity

```bash
aws s3 cp s3://$BACKUP_S3_BUCKET/mongodb/YYYY/MM/DD/crystolia-<date>.archive.gz .
aws s3 cp s3://$BACKUP_S3_BUCKET/mongodb/YYYY/MM/DD/crystolia-<date>.archive.gz.sha256 .
shasum -a 256 -c crystolia-<date>.archive.gz.sha256
```

## 3. Rehearse into a throwaway instance (always do this first)

```bash
docker run -d --name restore-test -p 27099:27017 mongo:7
docker run --rm -i --network host mongo:7 \
  mongorestore --uri "mongodb://127.0.0.1:27099" --archive --gzip --drop < crystolia-<date>.archive.gz
docker exec restore-test mongosh --quiet --eval \
  'db.getSiblingDB("crystolia").getCollectionNames().length'
```

Spot-check counts (`orders`, `users`, `companies`, `invoices`) against
expectations before touching production.

## 4. Get the production URI

SSH to the box (the deploy workflows open/close port 22 themselves — do the
same manually via `aws lightsail open-instance-public-ports`, scoped to your
IP `/32`, and **close it afterwards**):

```bash
MONGO_URI=$(docker exec $(docker ps -qf name=backend) printenv MONGO_URI)
```

## 5. Restore to production (owner-approved only)

Stop writes first, restore, then restart:

```bash
docker compose -f /opt/crystolia/docker-compose.demo.yml stop backend
docker run --rm -i --network host mongo:7 \
  mongorestore --uri "$MONGO_URI" --archive --gzip --drop < crystolia-<date>.archive.gz
docker compose -f /opt/crystolia/docker-compose.demo.yml start backend
```

## 6. Verify

- `curl -fsS https://api.crystolia.com/api/health` → `"status":"ok"`.
- Admin login, orders list, a known company/order spot-check.
- Close port 22 (`aws lightsail close-instance-public-ports`).

**RPO:** up to 24h (daily backup). **RTO:** ~15–30 min following this
runbook. If either is insufficient, move to Atlas continuous backups —
an owner/cost decision.
