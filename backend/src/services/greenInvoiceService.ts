// ===============================================
// 🟢 Green Invoice Service
// ===============================================
// Encapsulates all Green Invoice API calls.
// Docs: https://greeninvoice.co.il/api
// Document type 320 = חשבונית מס (Tax Invoice)

import axios from 'axios';
import { config } from '../config/index.js';

const SANDBOX_BASE = 'https://sandbox.greeninvoice.co.il/api/v1';
const PROD_BASE = 'https://api.greeninvoice.co.il/api/v1';

function getBaseUrl(): string {
    return config.greenInvoice.sandbox ? SANDBOX_BASE : PROD_BASE;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔑 Auth — get short-lived JWT from Green Invoice
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getToken(): Promise<string> {
    const { apiId, secret } = config.greenInvoice;
    const response = await axios.post(
        `${getBaseUrl()}/account/token`,
        { id: apiId, secret },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    const token = response.data?.token;
    if (!token) {
        throw new Error('Green Invoice auth failed: no token in response');
    }
    return token;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📄 Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface GreenInvoiceClientData {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    vatNumber?: string;
}

export interface GreenInvoiceIssueData {
    invoiceNumber: string;
    totalAmount: number;
    issuedAt?: Date;
    dueDate?: Date;
    notes?: string;
    client: GreenInvoiceClientData;
}

export interface GreenInvoiceResult {
    pdfUrl: string;
    greenInvoiceDocId: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📤 Issue document and return PDF URL + doc ID
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function issueInvoice(data: GreenInvoiceIssueData): Promise<GreenInvoiceResult> {
    const { apiId, secret } = config.greenInvoice;

    if (!apiId || !secret) {
        throw new Error('Green Invoice credentials are not configured (GREEN_INVOICE_API_ID / GREEN_INVOICE_SECRET)');
    }

    const token = await getToken();
    const baseUrl = getBaseUrl();

    const dateTs = Math.floor((data.issuedAt?.getTime() ?? Date.now()) / 1000);
    const dueDateTs = data.dueDate ? Math.floor(data.dueDate.getTime() / 1000) : undefined;

    const payload: Record<string, unknown> = {
        description: `Invoice ${data.invoiceNumber}`,
        type: 320, // חשבונית מס
        date: dateTs,
        ...(dueDateTs !== undefined && { dueDate: dueDateTs }),
        lang: 'he',
        currency: 'ILS',
        vatType: 1,
        discount: 0,
        rounding: false,
        signed: false,
        client: {
            name: data.client.name,
            ...(data.client.email && { emails: [data.client.email] }),
            ...(data.client.phone && { phone: data.client.phone }),
            ...(data.client.vatNumber && { taxId: data.client.vatNumber }),
            ...(data.client.address && { address: data.client.address }),
            ...(data.client.city && { city: data.client.city }),
        },
        income: [
            {
                description: data.notes || `Invoice ${data.invoiceNumber}`,
                quantity: 1,
                price: data.totalAmount,
                currency: 'ILS',
                vatType: 1,
            },
        ],
    };

    console.log('📤 Green Invoice: creating document', { invoiceNumber: data.invoiceNumber, sandbox: config.greenInvoice.sandbox });

    const response = await axios.post(`${baseUrl}/documents`, payload, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
    });

    const doc = response.data;
    const greenInvoiceDocId = (doc.id ?? doc.data?.id)?.toString();
    const pdfUrl = doc.url ?? doc.data?.url ?? `${baseUrl}/documents/${greenInvoiceDocId}/download`;

    if (!greenInvoiceDocId) {
        throw new Error('Green Invoice did not return a document ID');
    }

    console.log('✅ Green Invoice: document created', { greenInvoiceDocId, pdfUrl });

    return { pdfUrl, greenInvoiceDocId };
}
