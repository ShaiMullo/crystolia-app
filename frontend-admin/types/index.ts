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

    // Conversion tracking — populated once a lead has been converted into a customer
    convertedToCompanyId?: string;
    convertedToUserId?: string;
    customerId?: string;
    convertedAt?: string;

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

export type OrderStatus = 'pending' | 'approved' | 'shipped' | 'completed' | 'cancelled';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

export interface Invoice {
    _id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: InvoiceStatus;
    issuedAt?: string;
    dueDate?: string;
    notes?: string;
    pdfUrl?: string;
    greenInvoiceDocId?: string;
    createdAt: string;
    company?: { _id: string; name: string } | string;
    order?: { _id: string; totalAmount: number; status: string } | string;
}

export interface OrderItem {
    productName?: string;
    productType?: string;
    quantity: number;
    price?: number;
}

export interface Order {
    _id: string;
    status: OrderStatus;
    items: OrderItem[];
    totalAmount: number;
    notes?: string;
    createdAt: string;
    company?: { _id: string; name: string } | string;
    createdBy?: { _id: string; name?: string; email: string } | string;
}

export type ProductUnit = 'unit' | 'box' | 'liter' | 'kg' | 'gram' | 'package';

export interface Product {
    _id: string;
    name: string;
    sku: string;
    category?: string;
    description?: string;
    unit: ProductUnit;
    price: number;
    currency: string;
    taxRate: number;
    isActive: boolean;
    stockTrackingEnabled: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export type InventoryMovementType = 'in' | 'out' | 'adjustment' | 'reserved' | 'released';

export interface InventoryProductRef {
    _id: string;
    name: string;
    sku: string;
    unit?: ProductUnit;
    category?: string;
    isActive?: boolean;
    stockTrackingEnabled?: boolean;
}

export interface InventoryRow {
    _id: string;
    product: InventoryProductRef | string;
    location: string;
    quantity: number;
    reservedQuantity: number;
    minimumQuantity: number;
    availableQuantity: number;
    isLowStock: boolean;
    lastMovementAt?: string;
    updatedAt: string;
}

export interface InventoryMovementRecord {
    _id: string;
    product: InventoryProductRef | string;
    location: string;
    type: InventoryMovementType;
    quantity: number;
    reason?: string;
    relatedOrder?: string;
    createdBy?: { _id: string; name?: string; email: string } | string;
    createdAt: string;
}

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskRelatedType = 'Lead' | 'Customer' | 'Invoice' | 'Order' | 'None';

export interface TaskRecord {
    _id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueAt?: string;
    completedAt?: string;
    assignedTo?: { _id: string; name?: string; email: string; role?: string } | string | null;
    createdBy?: { _id: string; name?: string; email: string } | string | null;
    relatedType: TaskRelatedType;
    relatedId?: string;
    relatedLabel?: string;
    sourceAutomation?: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export type NotificationType =
    | 'lead_assigned'
    | 'lead_status_changed'
    | 'task_assigned'
    | 'task_overdue'
    | 'invoice_overdue'
    | 'invoice_issued'
    | 'customer_created'
    | 'automation_triggered'
    | 'generic';

export interface NotificationRecord {
    _id: string;
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
    icon?: string;
    channel: 'in_app' | 'email' | 'whatsapp';
    isRead: boolean;
    readAt?: string;
    meta?: Record<string, unknown>;
    sourceAutomation?: string;
    createdAt: string;
}

export interface PipelineAnalytics {
    totals: {
        totalLeads: number;
        wonThisMonth: number;
        lostThisMonth: number;
        convertedTotal: number;
        overdueTasks: number;
        pipelineRevenue: number;
        outstandingInvoices: number;
    };
    rates: {
        winRate: number;
        winRateTrend: number;
        conversionRate: number;
    };
    byStatus: Record<string, number>;
    topAgents: Array<{ id: string; label: string; wins: number }>;
    avgResponseMinutes: number | null;
}

export type CustomerStatus = 'active' | 'inactive' | 'on-hold' | 'archived';

export interface CustomerNote {
    text: string;
    createdAt: string;
    actorId?: string;
}

export interface CustomerTimelineEvent {
    type: string;
    at: string;
    actorId?: string;
    meta?: Record<string, unknown>;
}

export interface CustomerCompanyRef {
    _id: string;
    name: string;
    vatNumber?: string;
    email?: string;
    phone?: string;
    city?: string;
    address?: string;
}

export interface CustomerAssignedAgent {
    _id: string;
    name?: string;
    email: string;
    role: 'admin' | 'agent' | 'customer';
}

export interface Customer {
    _id: string;
    company: CustomerCompanyRef | string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    status: CustomerStatus;
    tags: string[];
    notes: CustomerNote[];
    timeline: CustomerTimelineEvent[];
    assignedTo?: CustomerAssignedAgent | string | null;
    sourceLeadId?: string | null;
    createdBy?: { _id: string; name?: string; email: string } | string | null;
    lastContactAt?: string;
    totalOrders: number;
    totalRevenue: number;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerDetail extends Customer {
    orders: Order[];
    invoices: Invoice[];
    sourceLead?: {
        _id: string;
        name: string;
        phone: string;
        email?: string;
        status: LeadStatus;
        convertedAt?: string;
    } | null;
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
