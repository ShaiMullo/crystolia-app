'use client';

import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

const FloatingWhatsApp = () => {
    const phoneNumber = '972501234567'; // Replace with actual business number
    const message = encodeURIComponent('היי, הגעתי מהאתר ואני מעוניין בפרטים על רכישת שמן סיטונאית.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 left-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
            aria-label="Contact via WhatsApp"
        >
            <FaWhatsapp size={32} />
        </a>
    );
};

export default FloatingWhatsApp;
