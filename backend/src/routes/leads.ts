// ===============================================
// 📬 Leads Router - קבלת פניות
// ===============================================

import { Router, Request, Response } from 'express';

const router = Router();

// מערך זמני לשמירת פניות (בהמשך - מסד נתונים)
const leads: Array<{
    id: string;
    name: string;
    phone: string;
    message: string;
    createdAt: Date;
}> = [];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/leads - קבלת פנייה חדשה
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/', (req: Request, res: Response) => {
    const { name, phone, message } = req.body;

    // ולידציה בסיסית
    if (!name || !phone) {
        res.status(400).json({
            success: false,
            error: 'Name and phone are required',
        });
        return;
    }

    // יצירת פנייה חדשה
    const newLead = {
        id: Date.now().toString(),
        name,
        phone,
        message: message || '',
        createdAt: new Date(),
    };

    // שמירה במערך (בהמשך - מסד נתונים)
    leads.push(newLead);

    console.log(`📬 New lead received: ${name} - ${phone}`);

    res.status(201).json({
        success: true,
        message: 'Lead received successfully',
        lead: newLead,
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/leads - קבלת כל הפניות
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/', (_req: Request, res: Response) => {
    res.json({
        success: true,
        count: leads.length,
        leads,
    });
});

export default router;
