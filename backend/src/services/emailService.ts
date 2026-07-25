// ===============================================
// Transactional Email Service (Twilio Email + SendGrid fallback)
// ===============================================

import axios from 'axios';
import { config } from '../config/index.js';

export type EmailLocale = 'he' | 'en' | 'ru';

export interface SendEmailResult {
    success: boolean;
    error?: string;
}

export interface RegistrationEmailDetails {
    to: string;
    name: string;
    companyName?: string;
    locale: EmailLocale;
}

export interface RegistrationRejectedEmailDetails extends RegistrationEmailDetails {
    /** Included in the email ONLY when the administrator chose to share it. */
    reason?: string;
}

export interface OrderStatusEmailDetails {
    to: string;
    name: string;
    locale: EmailLocale;
    orderId: string;
    status: 'pending' | 'approved' | 'rejected' | 'shipped' | 'completed' | 'cancelled';
    totalAmount: number;
    rejectionReason?: string;
}

export interface PasswordResetEmailDetails {
    to: string;
    name: string;
    locale: EmailLocale;
    resetUrl: string;
}

type EmailHttpClient = Pick<typeof axios, 'post'>;

interface EmailCopy {
    subject: string;
    eyebrow: string;
    title: string;
    greeting: string;
    paragraphs: string[];
    button?: string;
    footer: string;
    direction: 'rtl' | 'ltr';
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function safeLocale(locale: string | undefined): EmailLocale {
    return locale === 'en' || locale === 'ru' ? locale : 'he';
}

function portalUrl(locale: EmailLocale): string {
    return `${config.frontendUrl.replace(/\/$/, '')}/${locale}/auth?mode=login`;
}

function pendingCopy(locale: EmailLocale, name: string, companyName?: string): EmailCopy {
    const company = companyName || (locale === 'he' ? 'העסק שלך' : locale === 'ru' ? 'вашей компании' : 'your business');
    if (locale === 'en') {
        return {
            subject: 'We received your Crystolia business registration',
            eyebrow: 'BUSINESS PORTAL REGISTRATION',
            title: 'Your registration is awaiting approval',
            greeting: `Hello ${name},`,
            paragraphs: [
                `We received the registration request for ${company}.`,
                'A member of the Crystolia team will review the details. For security, access to the ordering portal will remain locked until the review is complete.',
                'You do not need to register again. We will email you as soon as your account is approved.',
            ],
            footer: 'This is a transactional message about your Crystolia account.',
            direction: 'ltr',
        };
    }
    if (locale === 'ru') {
        return {
            subject: 'Мы получили вашу регистрацию в бизнес-портале Crystolia',
            eyebrow: 'РЕГИСТРАЦИЯ В БИЗНЕС-ПОРТАЛЕ',
            title: 'Регистрация ожидает подтверждения',
            greeting: `Здравствуйте, ${name}!`,
            paragraphs: [
                `Мы получили заявку на регистрацию компании ${company}.`,
                'Сотрудник Crystolia проверит данные. В целях безопасности доступ к порталу заказов будет закрыт до завершения проверки.',
                'Повторно регистрироваться не нужно. Мы отправим письмо, когда аккаунт будет подтверждён.',
            ],
            footer: 'Это сервисное сообщение о вашей учётной записи Crystolia.',
            direction: 'ltr',
        };
    }
    return {
        subject: 'קיבלנו את ההרשמה שלך לאזור העסקים של קריסטוליה',
        eyebrow: 'הרשמה לאזור העסקים',
        title: 'ההרשמה ממתינה לאישור',
        greeting: `שלום ${name},`,
        paragraphs: [
            `קיבלנו את בקשת ההרשמה עבור ${company}.`,
            'איש צוות מקריסטוליה יעבור על הפרטים. מטעמי אבטחה, הכניסה לממשק ההזמנות תישאר חסומה עד לסיום הבדיקה.',
            'אין צורך להירשם שוב. נשלח אליך מייל נוסף מיד לאחר אישור החשבון.',
        ],
        footer: 'זוהי הודעה תפעולית בנוגע לחשבון שלך בקריסטוליה.',
        direction: 'rtl',
    };
}

function approvedCopy(locale: EmailLocale, name: string): EmailCopy {
    if (locale === 'en') {
        return {
            subject: 'Your Crystolia business account has been approved',
            eyebrow: 'ACCOUNT APPROVED',
            title: 'Welcome to the Crystolia business portal',
            greeting: `Hello ${name},`,
            paragraphs: [
                'Your registration has been approved and your account is now active.',
                'You can sign in with the email address and password you used during registration, then place and track orders from your customer dashboard.',
            ],
            button: 'Sign in to the business portal',
            footer: 'Need help? Reply to this email and the Crystolia team will assist you.',
            direction: 'ltr',
        };
    }
    if (locale === 'ru') {
        return {
            subject: 'Ваш бизнес-аккаунт Crystolia подтверждён',
            eyebrow: 'АККАУНТ ПОДТВЕРЖДЁН',
            title: 'Добро пожаловать в бизнес-портал Crystolia',
            greeting: `Здравствуйте, ${name}!`,
            paragraphs: [
                'Ваша регистрация подтверждена, и аккаунт активирован.',
                'Войдите с адресом электронной почты и паролем, указанными при регистрации, чтобы оформлять и отслеживать заказы.',
            ],
            button: 'Войти в бизнес-портал',
            footer: 'Нужна помощь? Ответьте на это письмо, и команда Crystolia поможет вам.',
            direction: 'ltr',
        };
    }
    return {
        subject: 'החשבון העסקי שלך בקריסטוליה אושר',
        eyebrow: 'החשבון אושר',
        title: 'ברוכים הבאים לאזור העסקים של קריסטוליה',
        greeting: `שלום ${name},`,
        paragraphs: [
            'ההרשמה שלך אושרה והחשבון פעיל כעת.',
            'אפשר להתחבר באמצעות כתובת האימייל והסיסמה שהזנת בהרשמה, לבצע הזמנות ולעקוב אחריהן מממשק הלקוח.',
        ],
        button: 'כניסה לאזור העסקים',
        footer: 'צריכים עזרה? אפשר להשיב למייל הזה וצוות קריסטוליה יסייע לכם.',
        direction: 'rtl',
    };
}

function rejectedCopy(locale: EmailLocale, name: string, reason?: string): EmailCopy {
    if (locale === 'en') {
        return {
            subject: 'Update on your Crystolia business registration',
            eyebrow: 'REGISTRATION UPDATE',
            title: 'We could not approve your registration',
            greeting: `Hello ${name},`,
            paragraphs: [
                'Thank you for your interest in the Crystolia business portal. After reviewing the details, we are unable to approve the registration at this time.',
                ...(reason ? [`Reason provided by our team: ${reason}`] : []),
                'If you believe this is a mistake or you would like to provide additional details, simply reply to this email and the Crystolia team will be happy to take another look.',
            ],
            footer: 'This is a transactional message about your Crystolia registration request.',
            direction: 'ltr',
        };
    }
    if (locale === 'ru') {
        return {
            subject: 'Обновление по вашей регистрации в Crystolia',
            eyebrow: 'СТАТУС РЕГИСТРАЦИИ',
            title: 'Мы не смогли подтвердить регистрацию',
            greeting: `Здравствуйте, ${name}!`,
            paragraphs: [
                'Благодарим за интерес к бизнес-порталу Crystolia. После проверки данных мы, к сожалению, не можем подтвердить регистрацию в данный момент.',
                ...(reason ? [`Причина, указанная нашей командой: ${reason}`] : []),
                'Если вы считаете, что произошла ошибка, или хотите предоставить дополнительные сведения — просто ответьте на это письмо, и команда Crystolia рассмотрит заявку повторно.',
            ],
            footer: 'Это сервисное сообщение о вашей заявке на регистрацию в Crystolia.',
            direction: 'ltr',
        };
    }
    return {
        subject: 'עדכון לגבי בקשת ההרשמה שלך לקריסטוליה',
        eyebrow: 'עדכון הרשמה',
        title: 'לא אישרנו את בקשת ההרשמה',
        greeting: `שלום ${name},`,
        paragraphs: [
            'תודה על ההתעניינות באזור העסקים של קריסטוליה. לאחר בדיקת הפרטים, לא נוכל לאשר את ההרשמה בשלב זה.',
            ...(reason ? [`הסיבה שצוינה על ידי הצוות: ${reason}`] : []),
            'אם לדעתכם מדובר בטעות, או שתרצו להוסיף פרטים — אפשר פשוט להשיב למייל הזה וצוות קריסטוליה ישמח לבדוק שוב.',
        ],
        footer: 'זוהי הודעה תפעולית בנוגע לבקשת ההרשמה שלך בקריסטוליה.',
        direction: 'rtl',
    };
}

function existingAccountCopy(locale: EmailLocale, name: string): EmailCopy {
    if (locale === 'en') {
        return {
            subject: 'A registration was attempted with your Crystolia email',
            eyebrow: 'ACCOUNT NOTICE',
            title: 'This email address is already registered',
            greeting: `Hello ${name},`,
            paragraphs: [
                'Someone (probably you) just tried to register to the Crystolia business portal with this email address, but an account already exists for it.',
                'If this was you, simply sign in with your existing password. If you forgot it, reply to this email and the Crystolia team will help.',
                'If this was not you, no action is needed — no new account was created and nothing changed.',
            ],
            button: 'Sign in to the business portal',
            footer: 'This is a transactional message about your Crystolia account.',
            direction: 'ltr',
        };
    }
    if (locale === 'ru') {
        return {
            subject: 'Попытка регистрации с вашим адресом в Crystolia',
            eyebrow: 'УВЕДОМЛЕНИЕ ОБ АККАУНТЕ',
            title: 'Этот адрес уже зарегистрирован',
            greeting: `Здравствуйте, ${name}!`,
            paragraphs: [
                'Кто-то (вероятно, вы) только что попытался зарегистрироваться в бизнес-портале Crystolia с этим адресом, но аккаунт с ним уже существует.',
                'Если это были вы — просто войдите с существующим паролем. Если вы его забыли, ответьте на это письмо, и команда Crystolia поможет.',
                'Если это были не вы — ничего делать не нужно: новый аккаунт не создан и ничего не изменилось.',
            ],
            button: 'Войти в бизнес-портал',
            footer: 'Это сервисное сообщение о вашей учётной записи Crystolia.',
            direction: 'ltr',
        };
    }
    return {
        subject: 'ניסיון הרשמה עם כתובת האימייל שלך בקריסטוליה',
        eyebrow: 'עדכון חשבון',
        title: 'כתובת האימייל כבר רשומה במערכת',
        greeting: `שלום ${name},`,
        paragraphs: [
            'מישהו (כנראה אתם) ניסה כרגע להירשם לאזור העסקים של קריסטוליה עם כתובת האימייל הזאת, אבל כבר קיים חשבון עבורה.',
            'אם זה הייתם אתם — אפשר פשוט להתחבר עם הסיסמה הקיימת. אם שכחתם אותה, השיבו למייל הזה וצוות קריסטוליה יסייע.',
            'אם זה לא הייתם אתם — אין צורך לעשות דבר: לא נוצר חשבון חדש ושום דבר לא השתנה.',
        ],
        button: 'כניסה לאזור העסקים',
        footer: 'זוהי הודעה תפעולית בנוגע לחשבון שלך בקריסטוליה.',
        direction: 'rtl',
    };
}

function renderEmail(copy: EmailCopy, actionUrl?: string): { text: string; html: string } {
    const text = [
        copy.title,
        '',
        copy.greeting,
        ...copy.paragraphs.flatMap((paragraph) => ['', paragraph]),
        ...(copy.button && actionUrl ? ['', `${copy.button}: ${actionUrl}`] : []),
        '',
        copy.footer,
    ].join('\n');

    const paragraphs = copy.paragraphs
        .map((paragraph) => `<p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.7">${escapeHtml(paragraph)}</p>`)
        .join('');
    const button = copy.button && actionUrl
        ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#d4a83a;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:999px">${escapeHtml(copy.button)}</a></p>`
        : '';

    const html = `<!doctype html>
<html lang="${copy.direction === 'rtl' ? 'he' : 'en'}" dir="${copy.direction}">
<body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(copy.title)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,.08)">
        <tr><td style="height:8px;background:#f5c542"></td></tr>
        <tr><td style="padding:36px 36px 28px;text-align:${copy.direction === 'rtl' ? 'right' : 'left'}">
          <p style="margin:0 0 12px;color:#a16207;font-size:12px;font-weight:700;letter-spacing:.12em">${escapeHtml(copy.eyebrow)}</p>
          <h1 style="margin:0 0 24px;color:#0f172a;font-size:28px;line-height:1.25">${escapeHtml(copy.title)}</h1>
          <p style="margin:0 0 16px;color:#0f172a;font-size:17px;font-weight:700">${escapeHtml(copy.greeting)}</p>
          ${paragraphs}
          ${button}
        </td></tr>
        <tr><td style="padding:20px 36px;background:#fffbeb;text-align:${copy.direction === 'rtl' ? 'right' : 'left'};color:#64748b;font-size:13px;line-height:1.6">
          ${escapeHtml(copy.footer)}<br><strong style="color:#334155">Crystolia</strong>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    return { text, html };
}

export function isEmailConfigured(): boolean {
    const providerConfigured = config.email.provider === 'twilio'
        ? Boolean(config.sms.accountSid && config.sms.authToken)
        : Boolean(config.email.apiKey);
    return Boolean(providerConfigured && config.email.fromAddress);
}

export async function sendEmail(
    to: string,
    subject: string,
    content: { text: string; html: string },
    httpClient: EmailHttpClient = axios,
): Promise<SendEmailResult> {
    if (!isEmailConfigured()) {
        return { success: false, error: 'Configuration missing' };
    }

    try {
        if (config.email.provider === 'twilio') {
            await httpClient.post('https://comms.twilio.com/v1/Emails', {
                from: {
                    address: config.email.fromAddress,
                    name: config.email.fromName,
                },
                to: [{ address: to }],
                content: {
                    subject,
                    text: content.text,
                    html: content.html,
                },
            }, {
                auth: {
                    username: config.sms.accountSid,
                    password: config.sms.authToken,
                },
                headers: { 'Content-Type': 'application/json' },
                timeout: 8000,
            });
        } else {
            await httpClient.post('https://api.sendgrid.com/v3/mail/send', {
                personalizations: [{ to: [{ email: to }], subject }],
                from: { email: config.email.fromAddress, name: config.email.fromName },
                ...(config.email.replyTo ? { reply_to: { email: config.email.replyTo, name: config.email.fromName } } : {}),
                content: [
                    { type: 'text/plain', value: content.text },
                    { type: 'text/html', value: content.html },
                ],
            }, {
                headers: {
                    Authorization: `Bearer ${config.email.apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 8000,
            });
        }
        return { success: true };
    } catch (error: unknown) {
        const providerName = config.email.provider === 'twilio' ? 'Twilio Email' : 'SendGrid';
        const detail = axios.isAxiosError(error)
            ? `${providerName} request failed (${error.response?.status || 'network'})`
            : error instanceof Error
                ? error.message
                : 'Unknown email provider error';
        console.warn('[Email] Delivery failed:', detail);
        return { success: false, error: detail };
    }
}

export async function sendRegistrationPendingEmail(details: RegistrationEmailDetails): Promise<SendEmailResult> {
    const locale = safeLocale(details.locale);
    const copy = pendingCopy(locale, details.name, details.companyName);
    return sendEmail(details.to, copy.subject, renderEmail(copy));
}

export async function sendRegistrationApprovedEmail(details: RegistrationEmailDetails): Promise<SendEmailResult> {
    const locale = safeLocale(details.locale);
    const copy = approvedCopy(locale, details.name);
    return sendEmail(details.to, copy.subject, renderEmail(copy, portalUrl(locale)));
}

export async function sendRegistrationRejectedEmail(details: RegistrationRejectedEmailDetails): Promise<SendEmailResult> {
    const locale = safeLocale(details.locale);
    const copy = rejectedCopy(locale, details.name, details.reason?.trim() || undefined);
    return sendEmail(details.to, copy.subject, renderEmail(copy));
}

/**
 * Sent when a public registration is attempted with an email that already has
 * an account. The HTTP response stays generic (no account enumeration); only
 * the mailbox owner learns an account exists.
 */
export async function sendRegistrationExistingAccountEmail(details: RegistrationEmailDetails): Promise<SendEmailResult> {
    const locale = safeLocale(details.locale);
    const copy = existingAccountCopy(locale, details.name);
    return sendEmail(details.to, copy.subject, renderEmail(copy, portalUrl(locale)));
}

export async function sendOrderStatusEmail(details: OrderStatusEmailDetails): Promise<SendEmailResult> {
    const locale = safeLocale(details.locale);
    const statusCopy = {
        he: {
            pending: 'התקבלה וממתינה לאישור',
            approved: 'אושרה',
            rejected: 'נדחתה',
            shipped: 'יצאה למשלוח',
            completed: 'הושלמה',
            cancelled: 'בוטלה',
        },
        en: {
            pending: 'was received and is awaiting approval',
            approved: 'has been approved',
            rejected: 'was rejected',
            shipped: 'has shipped',
            completed: 'is complete',
            cancelled: 'has been cancelled',
        },
        ru: {
            pending: 'получен и ожидает подтверждения',
            approved: 'подтверждён',
            rejected: 'отклонён',
            shipped: 'отправлен',
            completed: 'завершён',
            cancelled: 'отменён',
        },
    } as const;
    const shortId = details.orderId.slice(-8).toUpperCase();
    const amount = `₪${details.totalAmount.toLocaleString(locale === 'he' ? 'he-IL' : locale === 'ru' ? 'ru-RU' : 'en-US')}`;
    const reasonText = details.rejectionReason?.trim();
    const copy: EmailCopy = locale === 'en'
        ? {
            subject: `Crystolia order #${shortId} ${statusCopy.en[details.status]}`,
            eyebrow: 'ORDER UPDATE',
            title: `Your order ${statusCopy.en[details.status]}`,
            greeting: `Hello ${details.name},`,
            paragraphs: [
                `Order #${shortId} was updated.`,
                `Order total: ${amount}`,
                ...(details.status === 'pending' ? ['Our team will review it and notify you after approval or rejection.'] : []),
                ...(details.status === 'approved' ? ['Bank transfer and credit-card payment options are now available in your business dashboard.'] : []),
                ...(details.status === 'rejected' && reasonText ? [`Reason: ${reasonText}`] : []),
                'You can view its current status in your business dashboard.',
            ],
            button: 'View my orders',
            footer: 'This is a transactional update about your Crystolia order.',
            direction: 'ltr',
        }
        : locale === 'ru'
            ? {
                subject: `Заказ Crystolia #${shortId} ${statusCopy.ru[details.status]}`,
                eyebrow: 'СТАТУС ЗАКАЗА',
                title: `Ваш заказ ${statusCopy.ru[details.status]}`,
                greeting: `Здравствуйте, ${details.name}!`,
                paragraphs: [
                    `Статус заказа #${shortId} обновлён.`,
                    `Сумма заказа: ${amount}`,
                    ...(details.status === 'pending' ? ['Наша команда проверит заказ и сообщит о подтверждении или отклонении.'] : []),
                    ...(details.status === 'approved' ? ['В бизнес-портале доступны банковский перевод и оплата картой.'] : []),
                    ...(details.status === 'rejected' && reasonText ? [`Причина: ${reasonText}`] : []),
                    'Актуальный статус доступен в бизнес-портале.',
                ],
                button: 'Открыть мои заказы',
                footer: 'Это сервисное уведомление о вашем заказе Crystolia.',
                direction: 'ltr',
            }
            : {
                subject: `הזמנת Crystolia #${shortId} ${statusCopy.he[details.status]}`,
                eyebrow: 'עדכון הזמנה',
                title: `ההזמנה שלך ${statusCopy.he[details.status]}`,
                greeting: `שלום ${details.name},`,
                paragraphs: [
                    `סטטוס הזמנה #${shortId} עודכן.`,
                    `סכום ההזמנה: ${amount}`,
                    ...(details.status === 'pending' ? ['צוות Crystolia יעבור על ההזמנה ויעדכן אותך לאחר אישור או דחייה.'] : []),
                    ...(details.status === 'approved' ? ['אפשר לבחור העברה בנקאית או תשלום באשראי באזור העסקי.'] : []),
                    ...(details.status === 'rejected' && reasonText ? [`סיבת הדחייה: ${reasonText}`] : []),
                    'אפשר לראות את הסטטוס העדכני באזור העסקי שלך.',
                ],
                button: 'צפייה בהזמנות שלי',
                footer: 'זוהי הודעה תפעולית בנוגע להזמנה שלך בקריסטוליה.',
                direction: 'rtl',
            };

    const dashboardUrl = `${config.frontendUrl.replace(/\/$/, '')}/${locale}/dashboard`;
    return sendEmail(details.to, copy.subject, renderEmail(copy, dashboardUrl));
}

export async function sendPasswordResetEmail(details: PasswordResetEmailDetails): Promise<SendEmailResult> {
    const locale = safeLocale(details.locale);
    const copy: EmailCopy = locale === 'en'
        ? {
            subject: 'Reset your Crystolia password',
            eyebrow: 'PASSWORD RESET',
            title: 'Choose a new password',
            greeting: `Hello ${details.name},`,
            paragraphs: [
                'We received a request to reset the password for your Crystolia business account.',
                'The secure link below is valid for 30 minutes and can only be used once. If you did not request this, you can ignore this email.',
            ],
            button: 'Reset password',
            footer: 'Crystolia will never ask you to send your password by email.',
            direction: 'ltr',
        }
        : locale === 'ru'
            ? {
                subject: 'Сброс пароля Crystolia',
                eyebrow: 'СБРОС ПАРОЛЯ',
                title: 'Создайте новый пароль',
                greeting: `Здравствуйте, ${details.name}!`,
                paragraphs: [
                    'Мы получили запрос на сброс пароля бизнес-аккаунта Crystolia.',
                    'Защищённая ссылка действует 30 минут и только один раз. Если это были не вы, просто проигнорируйте письмо.',
                ],
                button: 'Сбросить пароль',
                footer: 'Crystolia никогда не просит отправлять пароль по электронной почте.',
                direction: 'ltr',
            }
            : {
                subject: 'איפוס הסיסמה שלך בקריסטוליה',
                eyebrow: 'איפוס סיסמה',
                title: 'בחירת סיסמה חדשה',
                greeting: `שלום ${details.name},`,
                paragraphs: [
                    'קיבלנו בקשה לאיפוס הסיסמה לחשבון העסקי שלך בקריסטוליה.',
                    'הקישור המאובטח תקף ל־30 דקות ולשימוש חד־פעמי. אם לא ביקשת לאפס את הסיסמה, אפשר להתעלם מהמייל.',
                ],
                button: 'איפוס הסיסמה',
                footer: 'Crystolia לעולם לא תבקש ממך לשלוח סיסמה במייל.',
                direction: 'rtl',
            };
    return sendEmail(details.to, copy.subject, renderEmail(copy, details.resetUrl));
}
