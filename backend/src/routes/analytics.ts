
import { Router, Request, Response } from 'express';
import { OrderModel } from '../models/Order.js';
import { CustomerModel } from '../models/Customer.js';

const router = Router();

// GET /api/analytics/summary - Key metrics for Admin Dashboard
router.get('/summary', async (req: Request, res: Response) => {
    try {
        const totalOrders = await OrderModel.countDocuments();

        // Calculate Total Revenue
        const revenueAgg = await OrderModel.aggregate([
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

        // Count Customers
        const totalCustomers = await CustomerModel.countDocuments();

        // Calculate Pending Orders
        const pendingOrders = await OrderModel.countDocuments({ status: 'pending' });

        res.json({
            totalOrders,
            totalRevenue,
            totalCustomers,
            pendingOrders
        });
    } catch (error) {
        console.error("Analytics Summary Error:", error);
        res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
});

// GET /api/analytics/revenue-by-month - For sales chart
router.get('/revenue-by-month', async (req: Request, res: Response) => {
    try {
        const revenueByMonth = await OrderModel.aggregate([
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    revenue: { $sum: "$totalAmount" },
                    ordersCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Map headers to month names (simplified)
        const formatData = revenueByMonth.map(item => ({
            month: item._id, // Frontend can map 1->Jan, 2->Feb etc
            revenue: item.revenue,
            orders: item.ordersCount
        }));

        res.json(formatData);
    } catch (error) {
        console.error("Analytics Revenue Error:", error);
        res.status(500).json({ message: "Failed to fetch revenue analytics" });
    }
});

// GET /api/analytics/top-customers - For leaderboards
router.get('/top-customers', async (req: Request, res: Response) => {
    try {
        const topCustomers = await OrderModel.aggregate([
            {
                $group: {
                    _id: "$customer",
                    totalSpent: { $sum: "$totalAmount" },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "customers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "customerInfo"
                }
            },
            { $unwind: "$customerInfo" },
            {
                $project: {
                    _id: 1,
                    businessName: "$customerInfo.businessName",
                    totalSpent: 1,
                    orderCount: 1
                }
            }
        ]);

        res.json(topCustomers);
    } catch (error) {
        console.error("Analytics Top Customers Error:", error);
        res.status(500).json({ message: "Failed to fetch top customers" });
    }
});

export default router;
