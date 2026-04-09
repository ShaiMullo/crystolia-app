'use client';

import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

const FloatingWhatsApp = () => {
    const phoneNumber = '972546970555';
    const message = encodeURIComponent('שלום, אני מעוניין לקבל פרטים והצעת מחיר עבור שמן חמניות/קנולה. אשמח שתיצרו איתי קשר.');
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
