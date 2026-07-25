import type { IOrder } from '../models/Order.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import { config } from '../config/index.js';
import {
    buildNewOrderNotificationSms,
    buildOrderStatusNotificationSms,
    sendSms,
    type SendSmsResult,
} from './smsService.js';
import {
    sendOrderStatusEmail,
    type OrderPaymentInstructions,
    type SendEmailResult,
    type EmailLocale,
} from './emailService.js';
import Settings from '../models/Settings.js';
import type { PaymentPreference } from '../utils/paymentOptions.js';
import { notifyAdmins } from './notificationService.js';

type CustomerNotifiableStatus = 'pending' | 'approved' | 'rejected' | 'shipped' | 'completed' | 'cancelled';

const PAYMENT_METHOD_HEBREW: Record<PaymentPreference, string> = {
    bank_transfer: 'העברה בנקאית',
    credit_card: 'כרטיס אשראי',
};

const HEBREW_STATUS: Record<CustomerNotifiableStatus, string> = {
    pending: 'התקבלה וממתינה לאישור',
    approved: 'אושרה',
    rejected: 'נדחתה',
    shipped: 'יצאה למשלוח',
    completed: 'הושלמה',
    cancelled: 'בוטלה',
};

export async function notifyAdminOfNewOrder(order: IOrder): Promise<SendSmsResult> {
    const [company, customer] = await Promise.all([
        Company.findById(order.company).select('name phone').lean(),
        User.findById(order.createdBy).select('name phone').lean(),
    ]);
    const shortId = order._id.toString().slice(-8).toUpperCase();
    const orderUrl = `${config.adminFrontendUrl.replace(/\/$/, '')}/admin/orders/${order._id}`;

    // Persistent in-app inbox item for every active admin — created even when
    // the SMS provider is unconfigured, idempotent per order (bell dropdown
    // shows company + total only; no customer contact details).
    await notifyAdmins({
        type: 'order_pending_approval',
        entityId: order._id.toString(),
        title: 'הזמנה חדשה ממתינה לאישור',
        body: `הזמנה #${shortId} · ${company?.name || 'חברה לא ידועה'} · ₪${order.totalAmount.toLocaleString('he-IL')}`,
        link: `/admin/orders/${order._id}`,
        icon: 'Package',
    });

    if (!config.adminPhone) return { success: false, error: 'Configuration missing' };

    const message = buildNewOrderNotificationSms({
        orderId: shortId,
        customerName: customer?.name || 'לקוח עסקי',
        companyName: company?.name || 'לא ידוע',
        phone: customer?.phone || company?.phone,
        itemCount: order.items.length,
        totalAmount: order.totalAmount,
        orderUrl,
    });
    return sendSms(config.adminPhone, message);
}

export async function notifyCustomerOfOrderStatus(
    order: IOrder,
    status: CustomerNotifiableStatus,
): Promise<{ email: SendEmailResult; sms: SendSmsResult }> {
    let customer = await User.findById(order.createdBy)
        .select('name email phone preferredLocale role isActive')
        .lean();
    if (!customer || customer.role !== 'customer') {
        customer = await User.findOne({
            company: order.company,
            role: 'customer',
            isActive: true,
            isDeleted: { $ne: true },
        }).sort({ isCompanyOwner: -1, createdAt: 1 })
            .select('name email phone preferredLocale role isActive')
            .lean();
    }

    if (!customer?.email) {
        return {
            email: { success: false, error: 'Customer email missing' },
            sms: { success: false, error: 'Customer phone missing' },
        };
    }

    const locale = (customer.preferredLocale || 'he') as EmailLocale;
    const shortId = order._id.toString().slice(-8).toUpperCase();
    const dashboardUrl = `${config.frontendUrl.replace(/\/$/, '')}/${locale}/dashboard`;

    // An approval carries the customer's SELECTED payment instructions —
    // email gets the full details, SMS only the method label. The approval
    // routes already refused to approve with an unusable configuration
    // (utils/paymentOptions.ts), so the lookup here is best-effort display.
    let payment: OrderPaymentInstructions | undefined;
    if (status === 'approved' && order.paymentPreference) {
        const settings = await Settings.findOne({ key: 'business' }).select('paymentOptions').lean();
        payment = order.paymentPreference === 'bank_transfer'
            ? { method: 'bank_transfer', bank: settings?.paymentOptions?.bankTransfer }
            : { method: 'credit_card', paymentUrl: settings?.paymentOptions?.creditCard?.paymentUrl };
    }

    const [email, sms] = await Promise.all([
        sendOrderStatusEmail({
            to: customer.email,
            name: customer.name,
            locale,
            orderId: order._id.toString(),
            status,
            totalAmount: order.totalAmount,
            rejectionReason: order.rejectionReason,
            payment,
        }),
        customer.phone
            ? sendSms(customer.phone, buildOrderStatusNotificationSms({
                customerName: customer.name,
                orderId: shortId,
                statusLabel: HEBREW_STATUS[status],
                status,
                totalAmount: order.totalAmount,
                dashboardUrl,
                rejectionReason: order.rejectionReason,
                paymentMethodLabel: order.paymentPreference
                    ? PAYMENT_METHOD_HEBREW[order.paymentPreference]
                    : undefined,
            }))
            : Promise.resolve({ success: false, error: 'Customer phone missing' }),
    ]);
    return { email, sms };
}

export function isCustomerNotifiableStatus(status: string): status is CustomerNotifiableStatus {
    return status === 'pending' || status === 'approved' || status === 'rejected'
        || status === 'shipped' || status === 'completed' || status === 'cancelled';
}
