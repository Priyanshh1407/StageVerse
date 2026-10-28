/**
 * Pick the winning option of a poll from its vote counts.
 * Ties go to the option listed first and are flagged with `tie: true`.
 * Returns null when nobody voted.
 */
export function pickWinner(options = []) {
    let best = null;
    let tie = false;
    for (const option of options) {
        const votes = option.votes || 0;
        if (!best || votes > best.votes) {
            best = { optionId: String(option._id), text: option.text, votes };
            tie = false;
        } else if (votes === best.votes) {
            tie = true;
        }
    }
    if (!best || best.votes === 0) return null;
    return { ...best, tie };
}
