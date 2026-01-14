
import { Router, Request, Response } from 'express';

const router = Router();

// In-Memory Users DB
const users: any[] = [
    {
        _id: "user_1",
        email: "demo@crystolia.com",
        password: "password123", // In real app, verify hash
        firstName: "Demo",
        lastName: "User",
        role: "admin"
    }
];

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        res.status(400).json({ message: "User already exists" });
        return;
    }

    const newUser = {
        _id: Date.now().toString(),
        email,
        password, // In real app, hash this!
        firstName,
        lastName,
        phone,
        role: "customer"
    };

    users.push(newUser);

    // Mock Token
    const token = "mock_jwt_token_" + newUser._id;

    res.status(201).json({
        access_token: token,
        user: {
            _id: newUser._id,
            email: newUser.email,
            role: newUser.role,
            firstName: newUser.firstName,
            lastName: newUser.lastName
        }
    });
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
    }

    // Mock Token
    const token = "mock_jwt_token_" + user._id;

    res.json({
        access_token: token,
        user: {
            _id: user._id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName
        }
    });
});

export default router;
