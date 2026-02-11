export interface Lead {
    _id: string;
    name: string;
    phone: string;
    email: string;
    message?: string;
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'closed' | 'archived';
    source: string;
    tags: string[];
    assignedTo?: string; // User ID or Name
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    _id: string;
    name?: string;
    email: string;
    role: 'admin' | 'agent';
    isActive: boolean;
    firstName?: string;
    lastName?: string;
    lastLogin?: string;
}

export interface AuditLog {
    _id: string;
    action: string;
    entity: string; // 'Lead', 'User', etc.
    entityId: string;
    performedBy: {
        _id: string;
        name: string;
        email: string;
        role: 'admin' | 'agent';
    } | null; // Can be null if system action or user deleted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}
