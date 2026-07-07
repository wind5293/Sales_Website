// src/lib/firebaseAdmin.js

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function loadServiceAccount() {
    const {
        FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY,
    } = process.env;

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
        throw new Error(
            'Thiếu biến môi trường Firebase Admin: FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY. ' +
            'Kiểm tra lại .env.local (xem .env.local.example).'
        );
    }

    return {
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
}

function getFirebaseAdminApp() {
    const existingApps = getApps();
    if (existingApps.length > 0) return existingApps[0];

    return initializeApp({
        credential: cert(loadServiceAccount()),
    });
}

const app = getFirebaseAdminApp();

export const dbAdmin = getFirestore(app);
export const authAdmin = getAuth(app);