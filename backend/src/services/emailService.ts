// ===============================================
// Transactional Email Service (Twilio SendGrid)
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
    return Boolean(config.email.apiKey && config.email.fromAddress);
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
        return { success: true };
    } catch (error: unknown) {
        const detail = axios.isAxiosError(error)
            ? `SendGrid request failed (${error.response?.status || 'network'})`
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
