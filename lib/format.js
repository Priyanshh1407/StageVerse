// How the site writes a price (one currency everywhere: the demo data's prices are in US dollars)
export const CURRENCY = '$';

/** 45 -> "$45"; 0 or nothing -> "Free". */
export function formatPrice(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 'Free';
    return `${CURRENCY}${Number.isInteger(n) ? n : n.toFixed(2)}`;
}
