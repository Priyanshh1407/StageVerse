import { RateLimitError } from '@/lib/errors';

// In-memory token bucket per key (e.g. "llm:<userId>", "login:<ip>:<email>").
// Good enough for a single Node process. With several instances each would keep
// its own buckets, so a shared store (Redis INCR + TTL) would be needed.

const buckets = new Map();
let calls = 0;

/**
 * Take one token from `key`'s bucket or throw RateLimitError (429).
 * @param {string} key
 * @param {{ capacity: number, refillPerMinute: number }} limits
 * @param {number} now  injectable clock for tests
 */
export function rateLimit(key, { capacity, refillPerMinute }, now = Date.now()) {
    const refillPerMs = refillPerMinute / 60000;
    const bucket = buckets.get(key) ?? { tokens: capacity, updated: now };

    bucket.tokens = Math.min(capacity, bucket.tokens + (now - bucket.updated) * refillPerMs);
    bucket.updated = now;

    if (bucket.tokens < 1) {
        buckets.set(key, bucket);
        const retryAfterSeconds = Math.ceil((1 - bucket.tokens) / refillPerMs / 1000);
        throw new RateLimitError('Too many requests, please slow down', retryAfterSeconds);
    }

    bucket.tokens -= 1;
    buckets.set(key, bucket);

    // Occasionally drop buckets that have refilled completely, so memory stays bounded
    if (++calls % 1000 === 0) {
        for (const [k, b] of buckets) {
            if (b.tokens + (now - b.updated) * refillPerMs >= capacity) buckets.delete(k);
        }
    }
}

export function clientIp(req) {
    return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

export const LIMITS = {
    llm: { capacity: 10, refillPerMinute: 10 },     // AI generation: 10 per minute per user
    login: { capacity: 5, refillPerMinute: 5 },     // 5 attempts per minute per IP+email
    signup: { capacity: 5, refillPerMinute: 1 },    // bursts of 5, then 1 per minute per IP
};

/** Test helper */
export function resetRateLimits() {
    buckets.clear();
}
