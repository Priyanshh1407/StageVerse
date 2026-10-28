import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { AuthError } from '@/lib/errors';

function secretKey() {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
    return new TextEncoder().encode(process.env.JWT_SECRET);
}

/** Verify a raw JWT string. Returns { userId, role } or throws AuthError. */
export async function verifyToken(token) {
    if (!token) throw new AuthError('Unauthorized: No token provided');
    try {
        const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
        if (!payload.userId || !payload.role) throw new AuthError('Unauthorized: Invalid token');
        return { userId: String(payload.userId), role: payload.role };
    } catch (error) {
        if (error instanceof AuthError) throw error;
        throw new AuthError('Unauthorized: Invalid token');
    }
}

/**
 * Authenticate the request from its `token` cookie.
 * Always returns a user or throws AuthError (401); it never returns null.
 */
export async function verifyAuth(req) {
    let token = req?.cookies?.get?.('token')?.value;
    if (!token) {
        const cookieStore = await cookies();
        token = cookieStore.get('token')?.value;
    }
    return verifyToken(token);
}
