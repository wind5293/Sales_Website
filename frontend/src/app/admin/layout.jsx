'use client';

import { useState, useCallback } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Toast } from "@/components/admin/AdminUI";
import { AdminToastContext } from "@/context/AdminToastContext";

export default function AdminLayout({ children }) {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((msg, type = "success") => {
        setToast({ msg, type });
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex">

            <AdminSidebar />

            <main className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto px-6 py-8">
                    <AdminToastContext.Provider value={showToast}>
                        {children}
                    </AdminToastContext.Provider>
                </div>
            </main>

            {toast && (
                <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    );
}