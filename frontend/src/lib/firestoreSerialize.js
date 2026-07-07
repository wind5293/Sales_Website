// src/lib/firestoreSerialize.js
//
// Firestore Admin SDK trả về field kiểu Timestamp/GeoPoint dưới dạng CLASS
// INSTANCE, không phải plain object. Next.js không cho phép truyền class
// instance từ Server Component xuống Client Component (lỗi:
// "Only plain objects... can be passed to Client Components"), và JSON.stringify
// mặc định của Response.json() cũng không cho ra format mong muốn.
//
// -> Mọi service đọc dữ liệu từ Firestore PHẢI chạy qua serializeFirestore()
//    trước khi return, để convert Timestamp -> chuỗi ISO 8601.

import { Timestamp } from 'firebase-admin/firestore';

export function serializeFirestore(value) {
    if (value instanceof Timestamp) {
        return value.toDate().toISOString();
    }
    if (Array.isArray(value)) {
        return value.map(serializeFirestore);
    }
    if (value && typeof value === 'object' && value.constructor === Object) {
        return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, serializeFirestore(v)])
        );
    }
    return value;
}

/** Convert 1 Firestore DocumentSnapshot thành plain object { id, ...data } đã serialize. */
export function docToPlain(doc) {
    return serializeFirestore({ id: doc.id, ...doc.data() });
}