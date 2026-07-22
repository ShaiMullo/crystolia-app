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

export interface RegistrationRejectedEmailDetails extends RegistrationEmailDetails {
    /** Included in the email ONLY when the administrator chose to share it. */
    reason?: string;
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
