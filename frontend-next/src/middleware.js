// src/middleware.js
import { NextResponse } from 'next/server';

export function middleware(req) {
    const token = req.cookies.get('auth_token');
    if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/profile/:path*', '/orders/:path*', '/checkout'],
};