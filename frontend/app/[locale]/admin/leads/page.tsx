'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'react-hot-toast';
import { FaWhatsapp, FaTrash, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

interface Lead {
    _id: string;
    name: string;
    phone: string;
    company?: string;
    message?: string;
    status: 'New' | 'In Progress' | 'Converted' | 'Junk';
    createdAt: string;
}

export default function LeadsManagement() {
    const { token, user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeads();
    }, [token]);

    const fetchLeads = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/leads`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLeads(res.data);
        } catch (error) {
            console.error('Failed to fetch leads:', error);
            toast.error('שגיאה בטעינת הלידים');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/leads/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLeads(leads.map(l => l._id === id ? { ...l, status: status as any } : l));
            toast.success('סטטוס עודכן');
        } catch (error) {
            toast.error('שגיאה בעדכון סטטוס');
        }
    };

    const deleteLead = async (id: string) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק ליד זה?')) return;
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/leads/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLeads(leads.filter(l => l._id !== id));
            toast.success('ליד נמחק');
        } catch (error) {
            toast.error('שגיאה במחיקת ליד');
        }
    };

    const openWhatsApp = (phone: string, name: string) => {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const url = `https://wa.me/${cleanPhone}?text=היי ${name}, מדברים מקריסטוליה בקשר לפנייתך באתר.`;
        window.open(url, '_blank');
    };

    if (loading) return <div className="p-8 text-center text-gray-500">טוען לידים...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">ניהול לידים ופניות</h1>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם לקוח</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">טלפון</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">חברה</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">הודעה</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {leads.map((lead) => (
                            <tr key={lead._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(lead.createdAt).toLocaleDateString('he-IL')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {lead.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span
                                        onClick={() => openWhatsApp(lead.phone, lead.name)}
                                        className="cursor-pointer text-green-600 hover:text-green-800 flex items-center gap-1"
                                    >
                                        <FaWhatsapp /> {lead.phone}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {lead.company || '-'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={lead.message}>
                                    {lead.message || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <select
                                        value={lead.status}
                                        onChange={(e) => updateStatus(lead._id, e.target.value)}
                                        className={`rounded-full px-3 py-1 text-xs font-semibold border-0 cursor-pointer outline-none ${lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                                            lead.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                                lead.status === 'Converted' ? 'bg-green-100 text-green-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}
                                    >
                                        <option value="New">חדש</option>
                                        <option value="In Progress">בטיפול</option>
                                        <option value="Converted">הומר להזמנה</option>
                                        <option value="Junk">לא רלוונטי</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex gap-3">
                                    <button
                                        onClick={() => deleteLead(lead._id)}
                                        className="text-red-500 hover:text-red-700 transition"
                                        title="מחק ליד"
                                    >
                                        <FaTrash />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {leads.length === 0 && (
                    <div className="p-8 text-center text-gray-400">
                        אין לידים חדשים במערכת.
                    </div>
                )}
            </div>
        </div>
    );
}
