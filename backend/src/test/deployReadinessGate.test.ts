// The deploy pipeline must gate on READINESS (/api/ready — transactions +
// critical indexes), never on the permissive liveness/health endpoints. A
// deploy that reports success against a standalone Mongo or broken invoice
// data would hide a production outage of the entire order workflow.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Vitest runs with cwd = backend/, so the repo root is one level up.
const repoRoot = path.resolve(process.cwd(), '..');

describe('deployment readiness gating', () => {
    it('remote-deploy.sh polls /api/ready and requires "ready":true', () => {
        const script = readFileSync(path.join(repoRoot, 'deploy/demo/remote-deploy.sh'), 'utf8');
        expect(script).toContain('/api/ready');
        expect(script).toContain('"ready":true');
        // The old permissive gate must be gone: no polling of /api/health.
        expect(script).not.toContain('/api/health');
    });

    it('docker-compose backend healthcheck gates on /api/ready (liveness stays /api/live in the image)', () => {
        const compose = readFileSync(path.join(repoRoot, 'docker-compose.demo.yml'), 'utf8');
        expect(compose).toMatch(/healthcheck:[\s\S]{0,200}\/api\/ready/);
        const dockerfile = readFileSync(path.join(repoRoot, 'backend/Dockerfile'), 'utf8');
        expect(dockerfile).toContain('/api/live');
    });
});
