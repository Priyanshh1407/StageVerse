/**
 * Escape a user-supplied string so it matches literally inside a RegExp / Mongo $regex.
 * Without this, input like "(" throws and ".*" or "(a+)+$" match everything or hang (ReDoS).
 */
export function escapeRegex(input) {
    return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive "contains" filter for a search box, length-capped. */
export function containsRegex(input, maxLength = 100) {
    return { $regex: escapeRegex(String(input).slice(0, maxLength)), $options: 'i' };
}
