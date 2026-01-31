"use client";

// Rebuild trigger: Fixed 404
import { useEffect, useState } from "react";
// Since api.ts is in app/lib, and @ points to root:
import api from "@/app/lib/api";

interface Order {
    _id: string;
    status: string;
    totalAmount: number;
    finalPrice?: number;
    customer: {
        businessName: string;
        contactPerson: string;
    };
    invoiceUrl?: string;
    deliveryNoteUrl?: string;
    createdAt: string;
}

export default function TestFlowPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionStatus, setActionStatus] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            // Fetch all orders (using admin endpoint or similar if available, or just recently created)
            // For simplicity, we assume we are logged in as admin or user with access
            // Use debug endpoint to avoid auth requirement for test flow
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
            const debugUrl = `${API_URL.replace('/api', '')}/debug/orders?limit=10`;

            const response = await fetch(debugUrl);
            const data = await response.json();
            setOrders(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchOrders();

        // Polling every 3 seconds for real-time updates
        const intervalId = setInterval(() => {
            fetchOrders();
        }, 3000);

        return () => clearInterval(intervalId);
    }, []);

    const simulateApproval = async (orderId: string) => {
        setActionStatus(`Approving order ${orderId.slice(-4)}...`);
        try {
            const price = 500; // Default test price
            // Using the routes/debug.ts GET endpoint
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
            // Note: debug route is mounted at /debug, not /api/debug in index.ts
            // Let's check index.ts: app.use('/debug', debugRouter); -> http://localhost:4000/debug
            const debugUrl = `${API_URL.replace('/api', '')}/debug/approve/${orderId}/${price}`;

            await fetch(debugUrl); // GET request

            setActionStatus(`✅ Approved!`);
            fetchOrders();
        } catch (err) {
            console.error(err);
            setActionStatus("❌ Approval Failed");
        }
    };

    const simulatePayment = async (orderId: string) => {
        setActionStatus(`Simulating payment for ${orderId.slice(-4)}...`);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
            const debugUrl = `${API_URL.replace('/api', '')}/debug/simulate-payment-success/${orderId}`;

            await api.post(debugUrl);

            setActionStatus(`✅ Payment Succeeded! Docs generated.`);
            fetchOrders();
        } catch (err) {
            console.error(err);
            setActionStatus("❌ Payment Simulation Failed");
        }
    };

    return (
        <div className="p-10 max-w-6xl mx-auto bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold mb-6">🛠️ End-to-End B2B Flow Test</h1>

            <div className="mb-6 flex gap-4 items-center">
                <button
                    onClick={fetchOrders}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Refresh Orders
                </button>
                {actionStatus && <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">{actionStatus}</span>}
            </div>

            <div className="grid gap-6">
                {orders.map(order => (
                    <div key={order._id} className="bg-white p-6 rounded-xl shadow border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-bold text-gray-500">#{order._id.slice(-6)}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${order.status === 'paid' ? 'bg-green-100 text-green-700' :
                                    order.status === 'awaiting_payment' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {order.status}
                                </span>
                            </div>
                            <h3 className="font-bold text-lg">{order.customer?.businessName || 'Unknown Customer'}</h3>
                            <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                            {order.finalPrice && <p className="text-sm font-semibold mt-1">Price: ₪{order.finalPrice}</p>}

                            <div className="flex gap-2 mt-2">
                                {order.invoiceUrl && (
                                    <a href={order.invoiceUrl} target="_blank" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                        📄 Invoice
                                    </a>
                                )}
                                {order.deliveryNoteUrl && (
                                    <a href={order.deliveryNoteUrl} target="_blank" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                        📦 Delivery Note
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            {/* 1. Approve */}
                            {order.status === 'pending_approval' && (
                                <button
                                    onClick={() => simulateApproval(order._id)}
                                    className="bg-purple-100 text-purple-700 px-4 py-2 rounded hover:bg-purple-200 text-sm font-semibold text-left md:text-center"
                                >
                                    Step 1: Simulate Admin Approval 👮
                                </button>
                            )}

                            {/* 2. Go to Payment */}
                            {order.status === 'awaiting_payment' && (
                                <a
                                    href={`/he/orders/${order._id}/pay`}
                                    target="_blank"
                                    className="bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200 text-sm font-semibold text-center block"
                                >
                                    Step 2: Go to Payment Page 💳
                                </a>
                            )}

                            {/* 3. Simulate Payment */}
                            {order.status === 'awaiting_payment' && (
                                <button
                                    onClick={() => simulatePayment(order._id)}
                                    className="bg-green-100 text-green-700 px-4 py-2 rounded hover:bg-green-200 text-sm font-semibold text-left md:text-center"
                                >
                                    Alternate Step 3: Force Payment Success ✅
                                </button>
                            )}

                            {order.status === 'paid' && (
                                <div className="text-green-600 font-bold text-sm flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Flow Complete
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
