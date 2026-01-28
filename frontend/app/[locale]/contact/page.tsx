'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface ContactFormInputs {
    name: string;
    phone: string;
    company?: string;
    message?: string;
}

export default function ContactPage() {
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactFormInputs>();
    const [submitted, setSubmitted] = useState(false);

    const onSubmit = async (data: ContactFormInputs) => {
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/leads`, data);
            setSubmitted(true);
            toast.success('הפנייה נשלחה בהצלחה! ניצור קשר בהקדם.');
            reset();
        } catch (error) {
            console.error('Failed to submit lead:', error);
            toast.error('שגיאה בשליחת הפנייה, אנא נסה שנית.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        צור קשר
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        מעוניינים בפרטים נוספים? השאירו פרטים ונחזור אליכם.
                    </p>
                </div>

                {submitted ? (
                    <div className="text-center p-6 bg-green-100 dark:bg-green-900 rounded-lg">
                        <h3 className="text-lg font-medium text-green-900 dark:text-green-100">תודה על פנייתך!</h3>
                        <p className="mt-2 text-green-700 dark:text-green-300">קיבלנו את הפרטים וניצור קשר בהקדם.</p>
                        <button
                            onClick={() => setSubmitted(false)}
                            className="mt-4 text-sm text-green-600 hover:text-green-500 font-medium"
                        >
                            שלח פנייה נוספת
                        </button>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div className="mb-4">
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">שם מלא *</label>
                                <input
                                    id="name"
                                    type="text"
                                    {...register('name', { required: 'שם מלא הוא שדה חובה' })}
                                    className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-900 focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm"
                                    placeholder="ישראל ישראלי"
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                            </div>

                            <div className="mb-4">
                                <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">שם העסק / חברה</label>
                                <input
                                    id="company"
                                    type="text"
                                    {...register('company')}
                                    className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-900 focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm"
                                    placeholder="קריסטוליה בע״מ"
                                />
                            </div>

                            <div className="mb-4">
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">טלפון *</label>
                                <input
                                    id="phone"
                                    type="tel"
                                    {...register('phone', { required: 'טלפון הוא שדה חובה', pattern: { value: /^[0-9\-+]{9,15}$/, message: 'מספר טלפון לא תקין' } })}
                                    className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-900 focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm"
                                    placeholder="050-1234567"
                                    dir="ltr"
                                />
                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                            </div>

                            <div className="mb-4">
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">הודעה</label>
                                <textarea
                                    id="message"
                                    rows={4}
                                    {...register('message')}
                                    className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-900 focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm"
                                    placeholder="כיצד נוכל לעזור?"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                            >
                                {isSubmitting ? 'שולח...' : 'שלח פנייה'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
