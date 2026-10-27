// Setlist prediction scoring.
// +10 for each predicted song that is in the real setlist, +5 more if it's in the
// same position. Every real song can be matched at most once, so repeating a
// correct song in a prediction doesn't multiply the points.

export const POINTS_IN_SETLIST = 10;
export const POINTS_RIGHT_POSITION = 5;

const normalize = (title) => String(title ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * @param {Array<{id?: string, title?: string}>} predicted  fan's songs, in order
 * @param {Array<{songId?: any, title?: string}>} actual    the artist's setlist, in order
 * @returns {number}
 */
export function scorePrediction(predicted = [], actual = []) {
    const used = new Set(); // indexes of real songs already matched
    let score = 0;

    predicted.forEach((p, position) => {
        const pTitle = normalize(p.title);
        const matchIndex = actual.findIndex((a, i) => {
            if (used.has(i)) return false;
            if (p.id && a.songId && String(p.id) === String(a.songId)) return true;
            return pTitle !== '' && pTitle === normalize(a.title);
        });
        if (matchIndex === -1) return;

        used.add(matchIndex);
        score += POINTS_IN_SETLIST;
        if (matchIndex === position) score += POINTS_RIGHT_POSITION;
    });

    return score;
}

/** Standard competition ranking ("1, 1, 3") over items already sorted by score desc. */
export function rankByScore(sorted) {
    let rank = 1;
    return sorted.map((item, i) => {
        if (i > 0 && item.score < sorted[i - 1].score) rank = i + 1;
        return { item, rank };
    });
}
