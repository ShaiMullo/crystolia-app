// ===============================================
// 🧮 Order Service
// ===============================================
// Single source of truth for order line + total calculations.
// Used by both the customer-portal POST and the admin order endpoints
// so the math can never drift between the two flows.

export interface RawOrderItem {
    productId?: string;
    productName?: string;
    quantity: number;
    price: number;
    taxRate?: number; // percentage, e.g. 17
}

export interface ComputedOrderItem {
    productId?: string;
    productName: string;
    quantity: number;
    price: number;
    taxRate: number;
    lineSubtotal: number;
    lineTax: number;
    lineTotal: number;
}

export interface OrderTotals {
    items: ComputedOrderItem[];
    subtotal: number;
    taxTotal: number;
    totalAmount: number;
}

function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Compute per-line and order-level totals. Tax is optional — items without a
 * taxRate contribute 0 tax, which keeps legacy orders (no tax) unchanged.
 */
export function computeOrderTotals(items: RawOrderItem[]): OrderTotals {
    const computed: ComputedOrderItem[] = items.map((item) => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const taxRate = Number(item.taxRate) || 0;
        const lineSubtotal = round2(quantity * price);
        const lineTax = round2(lineSubtotal * (taxRate / 100));
        return {
            productId: item.productId,
            productName: item.productName || '',
            quantity,
            price,
            taxRate,
            lineSubtotal,
            lineTax,
            lineTotal: round2(lineSubtotal + lineTax),
        };
    });

    const subtotal = round2(computed.reduce((s, i) => s + i.lineSubtotal, 0));
    const taxTotal = round2(computed.reduce((s, i) => s + i.lineTax, 0));
    const totalAmount = round2(subtotal + taxTotal);

    return { items: computed, subtotal, taxTotal, totalAmount };
}

/** Validate raw items; returns an error string or null. */
export function validateOrderItems(items: unknown): string | null {
    if (!Array.isArray(items) || items.length === 0) {
        return 'Order must contain at least one item';
    }
    for (const item of items as RawOrderItem[]) {
        if (!item.productName && !item.productId) {
            return 'Each item needs a product or product name';
        }
        if (!item.quantity || item.quantity <= 0) {
            return 'Each item needs a positive quantity';
        }
        if (item.price === undefined || item.price < 0) {
            return 'Each item needs a valid price';
        }
    }
    return null;
}
