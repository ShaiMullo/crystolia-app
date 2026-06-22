// ===============================================
// 📦 ERP integration layer — public barrel
// ===============================================
// Single import surface for the generic ERP layer. Importing this file pulls in
// only types, interfaces and inert classes — it registers nothing, connects to
// nothing, and writes to no database. Comax (and any other vendor) is a separate,
// optional sub-module that self-registers with the factory when wired later.

export * from './types/erp.js';
export * from './core/syncTypes.js';
export type { IERPConnector } from './core/IERPConnector.js';
export { ERPConnector } from './core/ERPConnector.js';
export {
    registerConnector,
    createConnector,
    isProviderRegistered,
    listRegisteredProviders,
    type ERPConnectorConstructor,
} from './core/ERPFactory.js';
export {
    SyncEngine,
    InMemorySyncQueue,
    InMemoryDeadLetterSink,
    type SyncQueue,
    type DeadLetterSink,
    type SyncJob,
    type DeadLetterEntry,
    type SyncEngineDeps,
} from './core/SyncEngine.js';
export {
    ConsoleSyncLogSink,
    defaultSyncLogSink,
    type SyncLogSink,
    type SyncLogEvent,
} from './core/SyncLog.js';
