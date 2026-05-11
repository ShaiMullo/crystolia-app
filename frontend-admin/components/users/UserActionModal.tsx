"use client";

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { User } from '@/types';
import { useAdminI18n } from '@/i18n/I18nProvider';

interface UserPayload {
    name: string;
    email: string;
    role: 'admin' | 'agent';
    password?: string;
}

interface UserActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    user?: User | null;
    onSave: (data: UserPayload) => Promise<void>;
}

export default function UserActionModal({ isOpen, onClose, mode, user, onSave }: UserActionModalProps) {
    const { t } = useAdminI18n();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'agent'>('agent');
    const [loading, setLoading] = useState(false);

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && user) {
                setName(user.name || '');
                setEmail(user.email);
                setRole(user.role);
                setPassword(''); // Don't show existing password
            } else {
                setName('');
                setEmail('');
                setPassword('');
                setRole('agent');
            }
        }
    }, [isOpen, mode, user]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload: UserPayload = { name, email, role };
            if (password) payload.password = password; // Only send if changed/new

            await onSave(payload);
            onClose();
        } catch (error) {
            console.error("Failed to save user", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                mode === 'create'
                    ? t('users.modal.createTitle')
                    : t('users.modal.editTitle', { label: user?.name || user?.email || '' })
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('users.modal.fullName')}</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('users.modal.emailAddress')}</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={mode === 'edit'} // Email is ID usually
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm disabled:bg-gray-100"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        {mode === 'create' ? t('users.modal.passwordCreate') : t('users.modal.passwordEdit')}
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={mode === 'create'}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('users.modal.role')}</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'admin' | 'agent')}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
                    >
                        <option value="agent">{t('role.agent')}</option>
                        <option value="admin">{t('role.admin')}</option>
                    </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none disabled:opacity-50"
                    >
                        {loading ? t('users.modal.submitting') : (mode === 'create' ? t('users.modal.submitCreate') : t('users.modal.submitUpdate'))}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
