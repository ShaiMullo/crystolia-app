// ===============================================
// 📦 CRM Type Definitions
// ===============================================

export interface TimelineEvent {
    type: string;
    at: string;
    actorId?: string;
    meta?: Record<string, unknown>;
}

export interface LeadNote {
    text: string;
    createdAt: string;
    actorId?: string;
}

export interface LeadMessage {
    content: string;
    source: string;
    createdAt: string;
}

export interface LeadOnboarding {
    currentStep: number;
    completed: boolean;
    completedAt?: string;
    data: Record<string, unknown>;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost' | 'converted' | 'closed' | 'archived' | 're-engaged';

export interface Lead {
    _id: string;
    name: string;
    phone: string;
    email: string;
    message?: string;
    status: LeadStatus;
    source: string;
    tags: string[];
    assignedTo?: string;

    // CRM fields
    contactCount: number;
    lastContactAt: string;
    ownerId?: string;
    messages: LeadMessage[];
    timeline: TimelineEvent[];
    notes: LeadNote[];
    onboarding: LeadOnboarding;

    isDeleted: boolean;
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
    entity: string;
    entityId: string;
    performedBy: {
        _id: string;
        name: string;
        email: string;
        role: 'admin' | 'agent';
    } | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}
