import Event from '@/models/Event';
import Task from '@/models/Task';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { resolveEvent } from '@/lib/events';

/** Throw 403 unless the user has one of the given account roles. */
export function requireRole(user, ...roles) {
    if (!roles.includes(user.role)) {
        throw new ForbiddenError(`This action requires role: ${roles.join(' or ')}`);
    }
}

const sameId = (a, b) => a != null && b != null && String(a._id ?? a) === String(b);

/**
 * How a user relates to an event: any of 'organizer', 'artist', 'crew'.
 * Relations come from the event document, not from the account role,
 * so an artist only controls events they're actually linked to.
 */
export function eventRelations(user, event) {
    const relations = new Set();
    if (sameId(event.organizerId, user.userId)) relations.add('organizer');
    if (sameId(event.artistId, user.userId)) relations.add('artist');
    if (sameId(event.assignedTo, user.userId)) relations.add('crew');
    return relations;
}

export function hasEventRelation(user, event, allowed) {
    const relations = eventRelations(user, event);
    return allowed.some((r) => relations.has(r));
}

export function assertEventRelation(user, event, allowed) {
    if (!hasEventRelation(user, event, allowed)) {
        throw new ForbiddenError('You do not have access to this event');
    }
}

/**
 * Load an event and check the user is one of `allowed` relations on it.
 * Throws 404 if the event doesn't exist and 403 if the user isn't allowed.
 */
export async function loadEventFor(user, id, allowed, options) {
    const event = await resolveEvent(id, options);
    assertEventRelation(user, event, allowed);
    return event;
}

// Relation sets used across routes
export const EVENT_TEAM = ['organizer', 'artist', 'crew'];
export const SHOW_CONTROL = ['artist', 'crew'];

/** Load a Task and check the user belongs to its event's team. */
export async function loadTaskFor(user, taskId, allowed = EVENT_TEAM) {
    const task = await Task.findById(taskId);
    if (!task) throw new NotFoundError('Task not found');
    await loadEventFor(user, task.eventId, allowed);
    return task;
}

/** Ids of every event the user organizes, performs at, or crews. */
export async function myEventIds(user) {
    const events = await Event.find({
        $or: [{ organizerId: user.userId }, { artistId: user.userId }, { assignedTo: user.userId }],
    }).select('_id');
    return events.map((e) => e._id);
}
