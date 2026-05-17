// ===============================================
// 🩺 Diagnostics Service
// ===============================================
// Detects whether the Mongo deployment supports transactions
// (replica set / mongos) so the UI can warn admins running standalone.

import mongoose from 'mongoose';

export interface ReplicaDiagnostics {
    connected: boolean;
    isReplicaSet: boolean;
    transactionsSupported: boolean;
    topology: string;          // 'replica_set' | 'sharded' | 'standalone' | 'unknown'
    setName?: string;
    checkedAt: string;
}

/**
 * Probe the deployment via `hello`. Transactions need a replica set or
 * a sharded cluster; a bare mongod reports neither.
 */
export async function getReplicaDiagnostics(): Promise<ReplicaDiagnostics> {
    const checkedAt = new Date().toISOString();
    const db = mongoose.connection.db;

    if (!db || mongoose.connection.readyState !== 1) {
        return {
            connected: false,
            isReplicaSet: false,
            transactionsSupported: false,
            topology: 'unknown',
            checkedAt,
        };
    }

    try {
        const hello = await db.admin().command({ hello: 1 });
        const setName: string | undefined = hello.setName;
        const isReplicaSet = !!setName;
        const isSharded = hello.msg === 'isdbgrid';
        const transactionsSupported = isReplicaSet || isSharded;
        const topology = isSharded ? 'sharded' : isReplicaSet ? 'replica_set' : 'standalone';

        return {
            connected: true,
            isReplicaSet,
            transactionsSupported,
            topology,
            setName,
            checkedAt,
        };
    } catch {
        return {
            connected: true,
            isReplicaSet: false,
            transactionsSupported: false,
            topology: 'unknown',
            checkedAt,
        };
    }
}
