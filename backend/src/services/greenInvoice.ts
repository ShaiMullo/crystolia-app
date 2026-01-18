/**
 * Green Invoice API Integration Service
 * מודול לחיבור ל-Green Invoice ויצירת חשבוניות אוטומטית
 * 
 * Docs: https://www.greeninvoice.co.il/api-docs
 */

import axios from 'axios';

// Environment configuration
const GREEN_INVOICE_API_ID = process.env.GREEN_INVOICE_API_ID || '';
const GREEN_INVOICE_SECRET = process.env.GREEN_INVOICE_SECRET || '';
const GREEN_INVOICE_SANDBOX = process.env.GREEN_INVOICE_SANDBOX === 'true';

const BASE_URL = GREEN_INVOICE_SANDBOX
    ? 'https://sandbox.d.greeninvoice.co.il/api/v1'
    : 'https://api.greeninvoice.co.il/api/v1';

interface GreenInvoiceClient {
    name: string;
    emails?: string[];
    address?: string;
    city?: string;
    phone?: string;
    taxId?: string; // ח.פ
}

interface InvoiceItem {
    description: string;
    quantity: number;
    price: number;
    currency?: string;
    vatType?: number; // 0 = כולל מע"מ, 1 = לפני מע"מ
}

interface CreateInvoiceRequest {
    client: GreenInvoiceClient;
    items: InvoiceItem[];
    type?: number; // 320 = חשבונית מס, 400 = קבלה
    date?: string;
    dueDate?: string;
    lang?: string; // he or en
    currency?: string;
}

let accessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get authentication token from Green Invoice
 */
async function getToken(): Promise<string> {
    // Return cached token if still valid
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    if (!GREEN_INVOICE_API_ID || !GREEN_INVOICE_SECRET) {
        throw new Error('Green Invoice API credentials not configured');
    }

    try {
        const response = await axios.post(`${BASE_URL}/account/token`, {
            id: GREEN_INVOICE_API_ID,
            secret: GREEN_INVOICE_SECRET
        });

        accessToken = response.data.token;
        // Token expires in 60 minutes, refresh at 55
        tokenExpiry = Date.now() + 55 * 60 * 1000;

        return accessToken!;
    } catch (error: any) {
        console.error('❌ Green Invoice Auth Error:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with Green Invoice');
    }
}

/**
 * Create a new invoice in Green Invoice
 */
export async function createInvoice(data: CreateInvoiceRequest): Promise<any> {
    const token = await getToken();

    const payload = {
        type: data.type || 320, // Default: חשבונית מס
        lang: data.lang || 'he',
        currency: data.currency || 'ILS',
        client: {
            name: data.client.name,
            emails: data.client.emails || [],
            address: data.client.address || '',
            city: data.client.city || '',
            phone: data.client.phone || '',
            taxId: data.client.taxId || ''
        },
        income: data.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            currency: item.currency || 'ILS',
            vatType: item.vatType ?? 0 // Default: כולל מע"מ
        }))
    };

    try {
        const response = await axios.post(`${BASE_URL}/documents`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Invoice created:', response.data.id);
        return response.data;
    } catch (error: any) {
        console.error('❌ Green Invoice Create Error:', error.response?.data || error.message);
        throw new Error('Failed to create invoice in Green Invoice');
    }
}

/**
 * Get invoice PDF URL
 */
export async function getInvoicePdf(documentId: string): Promise<string> {
    const token = await getToken();

    try {
        const response = await axios.get(`${BASE_URL}/documents/${documentId}/download`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        return response.data.url;
    } catch (error: any) {
        console.error('❌ Green Invoice PDF Error:', error.response?.data || error.message);
        throw new Error('Failed to get invoice PDF');
    }
}

/**
 * Check if Green Invoice is configured
 */
export function isGreenInvoiceConfigured(): boolean {
    return !!(GREEN_INVOICE_API_ID && GREEN_INVOICE_SECRET);
}

export default {
    createInvoice,
    getInvoicePdf,
    isGreenInvoiceConfigured
};
