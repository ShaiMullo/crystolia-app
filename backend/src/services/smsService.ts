
import twilio from 'twilio';

// Environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

let client: twilio.Twilio;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
} else {
    console.warn("⚠️ Twilio credentials missing. SMS service will not work.");
}

/**
 * Send an SMS message
 * @param to Recipient phone number (e.g., +972501234567)
 * @param body Message content
 */
export const sendSMS = async (to: string, body: string): Promise<boolean> => {
    if (!client) {
        console.log(`[MOCK SMS] To: ${to} | Body: ${body}`);
        return false;
    }

    try {
        const message = await client.messages.create({
            body,
            from: TWILIO_PHONE_NUMBER,
            to
        });
        console.log(`✅ SMS sent: ${message.sid}`);
        return true;
    } catch (error) {
        console.error("❌ Failed to send SMS:", error);
        return false;
    }
};

/**
 * Send welcome message to a new user
 * @param phone Users phone number
 * @param name Users first name
 */
export const sendWelcomeSMS = async (phone: string, name: string) => {
    if (!phone) return;

    const message = `שלום ${name}! 👋
ברוכים הבאים ל-Crystolia! 
שמחים שהצטרפתם אלינו.
המערכת מוכנה לשימוש - ניתן להיכנס ולהזמין סחורה בקלות.
לכל שאלה אנחנו כאן!`;

    return sendSMS(phone, message);
};
