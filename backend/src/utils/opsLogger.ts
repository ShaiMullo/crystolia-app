// ===============================================
// 📋 Operational Logger
// ===============================================
// Thin structured-logging wrapper. Emits one JSON line per event so
// log aggregators (Loki, CloudWatch) can parse without a transport lib.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    requestId?: string;
    service?: string;     // e.g. 'scheduler', 'reconciliation', 'export'
    jobKey?: string;
    userId?: string;
    [key: string]: unknown;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
    const entry = {
        ts: new Date().toISOString(),
        level,
        type: 'ops',
        message,
        ...context,
    };
    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
}

export const opsLogger = {
    debug: (msg: string, ctx?: LogContext) => emit('debug', msg, ctx),
    info: (msg: string, ctx?: LogContext) => emit('info', msg, ctx),
    warn: (msg: string, ctx?: LogContext) => emit('warn', msg, ctx),
    error: (msg: string, ctx?: LogContext) => emit('error', msg, ctx),
    /** Bind a service tag so call sites don't repeat it. */
    forService(service: string) {
        return {
            debug: (msg: string, ctx?: LogContext) => emit('debug', msg, { service, ...ctx }),
            info: (msg: string, ctx?: LogContext) => emit('info', msg, { service, ...ctx }),
            warn: (msg: string, ctx?: LogContext) => emit('warn', msg, { service, ...ctx }),
            error: (msg: string, ctx?: LogContext) => emit('error', msg, { service, ...ctx }),
        };
    },
};

export default opsLogger;
