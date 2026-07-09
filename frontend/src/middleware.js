// src/middleware.js
import { NextResponse } from 'next/server';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-this-secret-in-production';

function base64UrlToBytes(base64Url) {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function isValidAdminToken(token) {
    if (!token) return false;

    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, signatureB64] = parts;

    let payload;
    try {
        payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64)));
    } catch {
        return false;
    }
    if (!payload?.exp || payload.exp * 1000 < Date.now()) return false;

    try {
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(ADMIN_JWT_SECRET),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
        return await crypto.subtle.verify(
            'HMAC',
            key,
            base64UrlToBytes(signatureB64),
            new TextEncoder().encode(`${headerB64}.${payloadB64}`)
        );
    } catch {
        return false;
    }
}

export async function middleware(req) {
    const { pathname } = req.nextUrl;

    if (pathname.startsWith('/admin')) {
        const adminToken = req.cookies.get('admin_token')?.value;
        if (!(await isValidAdminToken(adminToken))) {
            return NextResponse.redirect(new URL('/login', req.url));
        }
        return NextResponse.next();
    }

    const token = req.cookies.get('auth_token');
    if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/profile/:path*', '/orders/:path*', '/checkout', '/admin/:path*'],
};