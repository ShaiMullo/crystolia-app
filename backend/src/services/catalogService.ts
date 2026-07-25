// ===============================================
// 🛒 Customer Catalog Service
// ===============================================
// Single source of truth for what a customer may see and order.
//
// Source priority (catalog migration, additive — no data is rewritten):
//   1. Product collection (Admin → Products) — authoritative for any SKU that
//      exists there as an active, non-deleted row.
//   2. Settings.boxPrices — LEGACY compatibility fallback, included only for
//      active rows whose SKU has no counterpart in the Product collection at
//      all. A SKU whose Product is inactive/soft-deleted is intentionally NOT
//      served from the legacy list: deactivating a Product must actually
//      remove it from sale, not silently re-expose an old settings row.
//
// Both the customer catalog endpoint and order placement resolve SKUs through
// this module so the two can never disagree on price, name or availability.

import Product, { type ProductUnit } from '../models/Product.js';
import Settings, { type IBoxPrice } from '../models/Settings.js';
import Inventory from '../models/Inventory.js';

export interface CustomerCatalogItem {
    productId?: string;
    sku: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    unit?: ProductUnit;
    taxRate?: number;
    stockTrackingEnabled: boolean;
    /** Units orderable right now (max(0, quantity - reserved), summed across
     *  locations). null = not stock-tracked → no availability limit. */
    available: number | null;
    /** true = served from the legacy Settings.boxPrices compatibility list. */
    isLegacy: boolean;
}

/** SKU comparisons are case/whitespace-insensitive across both sources. */
export function normalizeSku(sku: string): string {
    return sku.trim().toUpperCase();
}

const ACTIVE_PRODUCT_FILTER = { isActive: true, isDeleted: { $ne: true } } as const;

// Only these fields ever leave the server for customers — costPrice, supplier
// data, sync/audit metadata and internal ids stay admin-only.
const CUSTOMER_PRODUCT_FIELDS = '_id sku name description price currency unit taxRate stockTrackingEnabled';

/**
 * Available stock per product id, aggregated over all inventory locations.
 * Each location contributes max(0, quantity - reservedQuantity) so an
 * over-reserved location can never eat into another location's availability.
 */
async function availableByProductId(productIds: unknown[]): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();
    const rows = await Inventory.aggregate<{ _id: unknown; available: number }>([
        { $match: { product: { $in: productIds } } },
        {
            $group: {
                _id: '$product',
                available: {
                    $sum: {
                        $max: [0, { $subtract: [
                            { $ifNull: ['$quantity', 0] },
                            { $ifNull: ['$reservedQuantity', 0] },
                        ] }],
                    },
                },
            },
        },
    ]);
    return new Map(rows.map((row) => [String(row._id), row.available]));
}

/**
 * The merged Product-first catalog a customer is allowed to order from.
 * Deterministic ordering: by display name, then SKU.
 */
export async function getCustomerCatalog(): Promise<CustomerCatalogItem[]> {
    const [activeProducts, allProductSkus, settings] = await Promise.all([
        Product.find(ACTIVE_PRODUCT_FILTER).select(CUSTOMER_PRODUCT_FIELDS).lean(),
        Product.distinct('sku'),
        Settings.findOne({ key: 'business' }).select('boxPrices currency').lean(),
    ]);

    const tracked = activeProducts.filter((p) => p.stockTrackingEnabled);
    const availability = await availableByProductId(tracked.map((p) => p._id));

    const items: CustomerCatalogItem[] = [];
    const seenSkus = new Set<string>();

    for (const product of activeProducts) {
        const normalized = normalizeSku(product.sku);
        if (seenSkus.has(normalized)) continue; // defensive: sku is unique-indexed
        seenSkus.add(normalized);
        items.push({
            productId: String(product._id),
            sku: product.sku,
            name: product.name,
            description: product.description || undefined,
            price: product.price,
            currency: product.currency || 'ILS',
            unit: product.unit,
            taxRate: product.taxRate,
            stockTrackingEnabled: product.stockTrackingEnabled,
            available: product.stockTrackingEnabled
                ? (availability.get(String(product._id)) ?? 0)
                : null,
            isLegacy: false,
        });
    }

    // Any Product SKU — active or not — shadows the legacy list (see header).
    const knownProductSkus = new Set(
        allProductSkus.map((sku) => normalizeSku(String(sku))),
    );
    const legacyCurrency = settings?.currency || 'ILS';
    for (const row of settings?.boxPrices ?? []) {
        if (!row.isActive) continue;
        const normalized = normalizeSku(row.sku);
        if (seenSkus.has(normalized) || knownProductSkus.has(normalized)) continue;
        seenSkus.add(normalized);
        items.push({
            sku: row.sku,
            name: row.label,
            price: row.pricePerUnit,
            currency: legacyCurrency,
            stockTrackingEnabled: false,
            available: null,
            isLegacy: true,
        });
    }

    items.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.sku < b.sku ? -1 : 1));
    return items;
}

export interface ResolvedOrderLine {
    sku: string;
    productId?: string;
    productName: string;
    price: number;
    taxRate?: number;
}

export interface SkuResolution {
    /** Lines in the same order as the input SKUs (when ok). */
    lines?: ResolvedOrderLine[];
    /** First SKU that could not be resolved to an orderable item. */
    unavailableSku?: string;
}

/**
 * Resolve requested SKUs to server-authoritative order lines.
 * Product (active, non-deleted) wins; legacy boxPrices rows are used only for
 * SKUs unknown to the Product collection entirely. Client names/prices are
 * never consulted.
 */
export async function resolveOrderSkus(
    requestedSkus: string[],
    boxPrices: IBoxPrice[],
): Promise<SkuResolution> {
    const normalizedRequested = requestedSkus.map(normalizeSku);

    // Case-insensitive lookup so a Product row shadows a legacy row even when
    // the two differ only in SKU casing (mirrors getCustomerCatalog).
    const skuPatterns = [...new Set(normalizedRequested)].map(
        (sku) => new RegExp(`^${sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    );
    const matchingProducts = await Product.find({ sku: { $in: skuPatterns } })
        .select('_id sku name price taxRate isActive isDeleted')
        .lean();

    const activeProductBySku = new Map<string, (typeof matchingProducts)[number]>();
    const knownProductSkus = new Set<string>();
    for (const product of matchingProducts) {
        const normalized = normalizeSku(product.sku);
        knownProductSkus.add(normalized);
        if (product.isActive && !product.isDeleted) {
            activeProductBySku.set(normalized, product);
        }
    }

    const legacyBySku = new Map<string, IBoxPrice>();
    for (const row of boxPrices) {
        if (!row.isActive) continue;
        const normalized = normalizeSku(row.sku);
        if (!legacyBySku.has(normalized)) legacyBySku.set(normalized, row);
    }

    const lines: ResolvedOrderLine[] = [];
    for (let i = 0; i < requestedSkus.length; i += 1) {
        const normalized = normalizedRequested[i];
        const product = activeProductBySku.get(normalized);
        if (product) {
            lines.push({
                sku: requestedSkus[i],
                productId: String(product._id),
                productName: product.name,
                price: product.price,
                taxRate: product.taxRate,
            });
            continue;
        }
        // A known-but-inactive/deleted Product must NOT fall back to legacy.
        if (knownProductSkus.has(normalized)) {
            return { unavailableSku: requestedSkus[i] };
        }
        const legacy = legacyBySku.get(normalized);
        if (!legacy) {
            return { unavailableSku: requestedSkus[i] };
        }
        lines.push({
            sku: requestedSkus[i],
            productName: legacy.label,
            price: legacy.pricePerUnit,
        });
    }

    return { lines };
}
