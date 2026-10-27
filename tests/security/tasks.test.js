import { describe, it, expect, beforeEach } from 'vitest';
import { req, json, makeWorld } from '../helpers';
import * as tasks from '@/app/api/production/tasks/route';
import Task from '@/models/Task';

let w, other;
beforeEach(async () => {
    w = await makeWorld();
    other = await makeWorld();
});

const create = async (as, body) => json(await tasks.POST(await req('POST', '/api/production/tasks', { as, body })));

describe('BUG-08: production tasks', () => {
    it('crew can create a task for their show (used to always fail validation)', async () => {
        const { status, body } = await create(w.crew, { title: 'Truck pack', eventId: String(w.event._id), priority: 'High' });
        expect(status).toBe(201);
        expect(String(body.data.eventId)).toBe(String(w.event._id));
    });

    it('a task needs a show', async () => {
        const { status } = await create(w.crew, { title: 'Orphan' });
        expect(status).toBe(400);
    });

    it('crew cannot create tasks on someone else\'s show', async () => {
        const { status } = await create(w.crew, { title: 'x', eventId: String(other.event._id) });
        expect(status).toBe(403);
    });

    it('the list shows only my shows\' tasks, with the show name from the event', async () => {
        await create(w.crew, { title: 'Mine', eventId: String(w.event._id) });
        await create(other.crew, { title: 'Theirs', eventId: String(other.event._id) });

        const { body } = await json(await tasks.GET(await req('GET', '/api/production/tasks', { as: w.crew })));
        expect(body.data.map((t) => t.title)).toEqual(['Mine']);
        expect(body.data[0].show).toBe('Test Show');
    });

    it('a task cannot be moved to another show via PUT', async () => {
        const { body } = await create(w.crew, { title: 'Mine', eventId: String(w.event._id) });
        await tasks.PUT(await req('PUT', '/api/production/tasks', { as: w.crew, body: { id: String(body.data._id), eventId: String(other.event._id) } }));
        expect(String((await Task.findById(body.data._id)).eventId)).toBe(String(w.event._id));
    });

    it('completing a task round-trips through the stored status', async () => {
        const { body } = await create(w.crew, { title: 'Mine', eventId: String(w.event._id) });
        await tasks.PUT(await req('PUT', '/api/production/tasks', { as: w.crew, body: { id: String(body.data._id), status: 'completed' } }));
        expect((await Task.findById(body.data._id)).status).toBe('Done');
        const list = await json(await tasks.GET(await req('GET', '/api/production/tasks', { as: w.crew })));
        expect(list.body.data[0].status).toBe('completed');
    });
});
