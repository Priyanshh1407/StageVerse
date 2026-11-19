// Event photos rendered from StageVerse's own 3D stages (public/images/events): the stage that suits the event's genre
// (EDM on the mainstage, pop and Bollywood on the desert stage, rap in the warehouse), lit and filmed a different way
// for each event. An event's own picture always wins; a stock placeholder (or none) gets one of these instead.

const PHOTOS = {
    // (the photos facing the stage: not the two filmed from the stage, mainstage-5 and warehouse-4)
    mainstage: [1, 2, 3, 4],
    desert: [1, 2, 3, 4],
    warehouse: [1, 2, 3],
};
const ALL = Object.entries(PHOTOS).flatMap(([stage, ns]) => ns.map((n) => `/images/events/${stage}-${n}.jpg`));

/** The stage whose photos suit a genre (null: any stage). */
export function stageForGenre(genre = '') {
    const g = String(genre).toLowerCase();
    if (/edm|electro|techno|house|trance|dance|dubstep/.test(g)) return 'mainstage';
    if (/rap|hip.?hop|trap|grime|drill/.test(g)) return 'warehouse';
    if (/pop|bollywood|festival|indie|rock|acoustic|folk|punjabi|r&b|soul|jazz/.test(g)) return 'desert';
    return null;
}

// a stable number for an event (its id, else its title), so it always gets the same photo
function seedOf(event) {
    const key = String(event?._id ?? event?.id ?? event?.eventId ?? event?.title ?? event?.name ?? '');
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
    return h >>> 0;
}

/** One of the stage photos for this event (`slot` picks another for a second picture of the same event). */
export function eventPhoto(event, slot = 0) {
    const stage = stageForGenre(event?.genre);
    const list = stage ? PHOTOS[stage].map((n) => `/images/events/${stage}-${n}.jpg`) : ALL;
    return list[(seedOf(event) + slot) % list.length];
}

/** A stock placeholder rather than the event's own picture (the demo data's and the old fallbacks' stock photos). */
export const isStockPhoto = (url) => !url || /images\.unsplash\.com/.test(String(url));

/**
 * The picture to show for an event: its own hero picture when it has one, otherwise one of the stage photos.
 * Takes an event ({ _id, genre, images: { hero } }) or a card ({ id, genre, image }).
 */
export function eventImage(event, slot = 0) {
    const own = event?.images?.hero ?? event?.images?.cover ?? event?.image ?? null;
    return isStockPhoto(own) ? eventPhoto(event, slot) : own;
}
