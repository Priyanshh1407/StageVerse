import { verifyAuth } from '@/lib/auth';
import { requireRole } from '@/lib/authz';
import { rateLimit, LIMITS } from '@/lib/rateLimit';
import { ValidationError } from '@/lib/errors';

export const GEMINI_MODEL = 'gemini-2.5-flash';
// Passed as RequestOptions to getGenerativeModel so a hung upstream call can't hold the request open
export const GEMINI_REQUEST_OPTIONS = { timeout: 15000 };
export const MAX_PROMPT_CHARS = 1000;

/**
 * Every LLM endpoint costs money per call: require a session with an allowed role,
 * and spend from a per-user token bucket before calling the model.
 */
export async function guardLlmRequest(req, roles) {
    const user = await verifyAuth(req);
    requireRole(user, ...roles);
    rateLimit(`llm:${user.userId}`, LIMITS.llm);
    return user;
}

/** Trim and length-check a free-text field that will be placed in a prompt. */
export function promptText(value, field, { required = false, max = MAX_PROMPT_CHARS } = {}) {
    const text = String(value ?? '').trim();
    if (required && !text) throw new ValidationError(`Missing ${field}`);
    if (text.length > max) throw new ValidationError(`${field} is too long (max ${max} characters)`);
    return text;
}
