import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function verifyAuth(req) {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');

    if (!token) {
        throw new Error('Unauthorized: No token provided');
    }

    try {
        const decoded = jwt.verify(token.value, process.env.JWT_SECRET);
        // Returns { userId: '...', role: '...' }
        return decoded;
    } catch (error) {
        throw new Error('Unauthorized: Invalid token');
    }
}
