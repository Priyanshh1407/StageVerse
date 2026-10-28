import { inject, vi, beforeAll, afterEach, afterAll } from 'vitest';

// Must be set before any route module imports lib/db.js
process.env.MONGODB_URI = inject('mongoUri');
process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';
process.env.GEMINI_API_KEY = 'test-key';

// next/headers only works inside a real Next request. Route handlers that call
// cookies() read the cookie of the request most recently built by tests/helpers.js.
vi.mock('next/headers', () => ({
    cookies: async () => ({
        get: (name) => {
            const value = globalThis.__testCookies?.[name];
            return value === undefined ? undefined : { name, value };
        },
    }),
}));

const { default: mongoose } = await import('mongoose');
const { default: dbConnect } = await import('@/lib/db');

beforeAll(async () => {
    await dbConnect();
});

afterEach(async () => {
    globalThis.__testCookies = {};
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
    await mongoose.disconnect();
    global.mongoose = { conn: null, promise: null };
});
