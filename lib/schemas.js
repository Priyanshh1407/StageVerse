import { z } from 'zod';
import { ValidationError } from '@/lib/errors';

// Request-body schemas. Unknown keys are stripped (zod's default), which is what
// stops mass assignment: a client can't sneak in organizerId, sold, _id, etc.

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be an id');
const text = (max) => z.string().trim().max(max);
const optionalText = (max) => text(max).optional();

/** Parse `body` with `schema` or throw a 400 listing the bad fields. */
export function parseBody(schema, body) {
    const result = schema.safeParse(body ?? {});
    if (!result.success) {
        const details = result.error.issues.map((i) => ({ field: i.path.join('.') || '(body)', message: i.message }));
        throw new ValidationError(`Invalid ${details[0].field}: ${details[0].message}`, details);
    }
    return result.data;
}

const ticketTier = z.object({
    name: text(100).min(1),
    price: z.coerce.number().min(0).max(100000),
    capacity: z.coerce.number().int().min(0).max(1000000),
    status: z.enum(['Active', 'Paused', 'Sold Out']).optional(),
});

const eventFields = {
    title: text(200).min(1),
    description: text(10000).min(1),
    date: z.coerce.date(),
    time: text(50).min(1),
    doorsOpen: optionalText(50),
    venue: objectId,
    city: text(100).min(1),
    artist: text(200).min(1),
    artistId: objectId.nullable().optional(),
    lineup: z.array(z.object({ name: text(200).min(1), role: optionalText(100), image: optionalText(2000) })).max(50).optional(),
    genre: optionalText(100),
    vibe: optionalText(500),
    status: optionalText(50),
    images: z.object({ hero: optionalText(2000), artist: optionalText(2000), venue: optionalText(2000) }).optional(),
};

// Create: ticket tiers start at sold = 0 (the schema default); 'sold' from the client is dropped
export const eventCreateSchema = z.object({
    ...eventFields,
    ticketTiers: z.array(ticketTier).max(20).optional(),
});

// Update: every field optional; tiers and discounts are managed by the ticketing endpoint
export const eventUpdateSchema = z.object(eventFields).partial();

export const setlistSaveSchema = z.object({
    eventId: z.union([z.string(), z.number()]),
    items: z.array(z.object({
        title: text(200).min(1),
        duration: optionalText(20),
        bpm: z.union([z.string(), z.number()]).optional(),
        key: optionalText(20),
        notes: optionalText(1000),
        tags: z.array(z.union([z.string(), z.object({ label: optionalText(50), color: optionalText(30) })])).max(20).optional(),
        interaction: z.object({ type: z.enum(['none', 'poll', 'trivia']).optional(), question: optionalText(300) }).optional(),
    })).max(100),
});

export const pollCreateSchema = z.object({
    eventId: z.union([z.string(), z.number()]),
    question: text(300).min(1),
    options: z.array(text(200).min(1)).min(2).max(10),
});

export const venueCreateSchema = z.object({
    name: text(200).min(1),
    city: text(100).min(1),
    address: text(300).min(1),
    capacity: z.union([z.string(), z.number()]).transform(String).optional(),
    type: optionalText(100),
    policies: z.object({ parking: z.boolean().optional(), bagPolicy: optionalText(100) }).optional(),
    description: optionalText(5000),
    image: optionalText(2000),
});

const daySheetItem = z.object({
    id: z.any().optional(),
    _id: z.any().optional(),
    time: text(20).min(1),
    title: text(200).min(1),
    sub: optionalText(300),
    type: z.enum(['travel', 'work', 'sound', 'doors', 'show', 'other']).optional(),
    details: optionalText(2000),
    status: optionalText(20),
    isHeadline: z.boolean().optional(),
    tasks: z.array(z.object({ label: text(200), done: z.boolean().optional() })).max(50).optional(),
});

export const daySheetUpdateSchema = z.object({
    schedule: z.array(daySheetItem).max(100).optional(),
    venueIntel: z.object({
        wifiName: optionalText(100), wifiPass: optionalText(100), greenRoomCode: optionalText(50),
        distance: optionalText(50), coffeeName: optionalText(100), coffeeDesc: optionalText(300),
    }).optional(),
    notifyTeam: z.boolean().optional(),
});

export const riderUpdateSchema = z.object({
    eventId: z.union([z.string(), z.number()]),
    gear: z.array(z.object({
        id: z.number().optional(),
        name: optionalText(200),
        type: optionalText(100),
        count: z.coerce.number().int().min(0).max(1000).optional(),
        iconKey: optionalText(50),
    })).max(200).optional(),
    stageLocation: optionalText(100),
    mountingPreference: optionalText(100),
    placementNotes: optionalText(2000),
    hazer: z.boolean().optional(),
    assigneeId: objectId.optional(),
    assigneeName: optionalText(100),
});
