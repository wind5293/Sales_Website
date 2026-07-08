// src/lib/services/users.js
//
// Dùng chung cho cả route.js (client gọi qua fetch) lẫn Server Component
// (page.jsx gọi thẳng trong lúc SSR, không cần vòng qua HTTP self-fetch).

import { dbAdmin } from '@/lib/firebaseAdmin';

/** GET /api/users/addresses — danh sách địa chỉ của 1 user, is_default lên đầu */
export async function listAddresses(uid) {
    const snap = await dbAdmin.collection('users').doc(uid).collection('addresses').get();

    let addresses = snap.docs.map((doc) => {
        const { created_at, ...rest } = doc.data();
        return rest;
    });

    addresses.sort((a, b) => (a.is_default === b.is_default ? 0 : a.is_default ? -1 : 1));

    return { addresses };
}