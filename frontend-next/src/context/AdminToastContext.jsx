'use client';

import { createContext, useContext } from "react";

export const AdminToastContext = createContext(() => { });

export function useAdminToast() {
    return useContext(AdminToastContext);
}