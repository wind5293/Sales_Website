// test-firestore-latency.mjs
// Chạy: node test-firestore-latency.mjs
// (đặt trong thư mục frontend/, cần có .env.local với FIREBASE_* vars)

import { config } from 'dotenv';
config({ path: '.env.local' });

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
});
const db = getFirestore(app);

async function timeIt(label, fn) {
    const start = Date.now();
    await fn();
    console.log(`${label}: ${Date.now() - start}ms`);
}

console.log('--- Đo độ trễ Firestore (5 lần liên tiếp) ---');
for (let i = 1; i <= 5; i++) {
    await timeIt(`Lần ${i} - lấy 1 document`, async () => {
        await db.collection('products').limit(1).get();
    });
}
process.exit(0);