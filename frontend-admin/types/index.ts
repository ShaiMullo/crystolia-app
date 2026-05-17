// ===============================================
// 📦 CRM Type Definitions
// ===============================================

// ── Phase 7: Payments / Shipments / Suppliers / Purchase Orders ──────────────

export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'other';
export type InvoicePaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export interface PaymentRecord {
    _id: string;
    invoice: { _id: string; invoiceNumber: string; totalAmount: number } | string;
    company?: { _id: string; name: string } | string;
    amount: number;
    method: PaymentMethod;
    status: 'posted' | 'voided';
    externalRef?: string;
    notes?: string;
    paidAt: string;
    createdBy?: { _id: string; name?: string; email: string } | string;
    createdAt: string;
}

export type ShipmentStatus = 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled';

export interface ShipmentRecord {
    _id: string;
    order: string | { _id: string; totalAmount: number; status: string };
    company?: { _id: string; name: string } | string;
    status: ShipmentStatus;
    courier?: string;
    trackingNumber?: string;
    shippedAt?: string;
    deliveredAt?: string;
    notes?: string;
    timeline: Array<{ type: string; at: string; meta?: Record<string, unknown> }>;
    createdAt: string;
}

export interface SupplierNote {
    text: string;
    createdAt: string;
}

export interface Supplier {
    _id: string;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    vatNumber?: string;
    notes: SupplierNote[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SupplierDetail extends Supplier {
    products: Array<{ _id: string; name: string; sku: string; price: number; costPrice?: number; unit: string; isActive: boolean }>;
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
    product: string;
    productName: string;
    quantity: number;
    receivedQuantity: number;
    unitCost: number;
}

export interface PurchaseOrder {
    _id: string;
    poNumber: string;
    supplier: { _id: string; name: string; email?: string; phone?: string } | string;
    status: PurchaseOrderStatus;
    items: PurchaseOrderItem[];
    totalCost: number;
    notes?: string;
    expectedAt?: string;
    orderedAt?: string;
    receivedAt?: string;
    timeline: Array<{ type: string; at: string; meta?: Record<string, unknown> }>;
    createdAt: string;
}

export interface ProfitabilitySummary {
    totals: { revenue: number; cogs: number; grossProfit: number; marginPct: number };
    topProducts: Array<{ productId: string; name: string; revenue: number; profit: number; marginPct: number; qty: number }>;
    topCustomers: Array<{ companyId: string; name: string; revenue: number; profit: number; marginPct: number }>;
}

export interface ReconciliationHistoryEntry {
    _id: string;
    autoFix: boolean;
    scannedOrders: number;
    scannedInventoryRows: number;
    reservationDriftCount: number;
    negativeStockCount: number;
    invoicePaymentMismatchCount: number;
    fixed: boolean;
    createdAt: string;
}

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
    amountPaid?: number;
    paymentStatus?: InvoicePaymentStatus;
    createdAt: string;
    company?: { _id: string; name: string } | string;
    order?: { _id: string; totalAmount: number; status: string } | string;
}

export interface OrderItem {
    productId?: string;
    productName?: string;
    productType?: string;
    quantity: number;
    price?: number;
    taxRate?: number;
}

export interface OrderTimelineEvent {
    type: string;
    at: string;
    actorId?: string;
    meta?: Record<string, unknown>;
}

export interface Order {
    _id: string;
    status: OrderStatus;
    items: OrderItem[];
    totalAmount: number;
    subtotal?: number;
    taxTotal?: number;
    notes?: string;
    timeline?: OrderTimelineEvent[];
    createdAt: string;
    updatedAt?: string;
    company?: { _id: string; name: string; vatNumber?: string; email?: string; phone?: string } | string;
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
    costPrice?: number;
    currency: string;
    taxRate: number;
    supplier?: string;
    barcode?: string;
    isActive: boolean;
    stockTrackingEnabled: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface OrderDetail extends Order {
    invoices: Invoice[];
    customer?: { _id: string; contactName?: string } | null;
}

export interface OrderTotals {
    items: Array<{
        productId?: string;
        productName: string;
        quantity: number;
        price: number;
        taxRate: number;
        lineSubtotal: number;
        lineTax: number;
        lineTotal: number;
    }>;
    subtotal: number;
    taxTotal: number;
    totalAmount: number;
}

export interface OrderInventoryPreviewLine {
    productId?: string;
    productName: string;
    quantity: number;
    available: number | null;
    sufficient: boolean;
}

export interface ReconciliationDiscrepancy {
    productId: string;
    productName: string;
    location: string;
    storedReserved: number;
    expectedReserved: number;
    drift: number;
}

export interface ReconciliationResult {
    scannedOrders: number;
    scannedInventoryRows: number;
    discrepancies: ReconciliationDiscrepancy[];
    fixed: boolean;
    ranAt: string;
}

export interface FinanceSummary {
    revenue: {
        ordersTotal: number;
        ordersCount: number;
        ordersThisMonth: number;
        ordersThisMonthCount: number;
        paidInvoices: number;
    };
    invoices: {
        outstandingTotal: number;
        outstandingCount: number;
        overdueCount: number;
        overdue: Array<{
            _id: string;
            invoiceNumber: string;
            totalAmount: number;
            dueDate?: string;
            company?: { _id: string; name: string } | string;
        }>;
    };
    inventoryValuation: { cost: number; retail: number };
    recentOrders: Array<{
        _id: string;
        status: OrderStatus;
        totalAmount: number;
        company?: { _id: string; name: string } | string;
        itemCount: number;
        createdAt: string;
    }>;
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
