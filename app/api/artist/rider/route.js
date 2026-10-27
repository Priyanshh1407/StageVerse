import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import { verifyAuth } from '@/lib/auth';
import Task from '@/models/Task';
import User from '@/models/User'; // Ensure User model is registered
import { riderTemplates } from '@/lib/riderTemplates'; // Import the new templates
export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        const event = await Event.findById(eventId).populate('assignedTo', 'name email role');
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        return NextResponse.json({
            success: true,
            data: event.rider || {},
            assignedTo: event.assignedTo
        });

    } catch (error) {
        console.error("Rider Fetch Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

function generateDiff(oldRider, newPayload) {
    const changes = [];
    if (!oldRider || !oldRider.gear) return ["Initial Rider Created"];
    const oldGear = oldRider.gear || [];
    const newGear = newPayload.gear || [];
    const oldMap = new Map(oldGear.map(g => [g.id, g]));
    const newMap = new Map(newGear.map(g => [g.id, g]));
    newGear.forEach(newItem => {
        const oldItem = oldMap.get(newItem.id);
        if (!oldItem) {
            changes.push(`• Added: ${newItem.count}x ${newItem.name}`);
        } else {
            if (oldItem.count !== newItem.count) {
                changes.push(`• Changed ${newItem.name}: ${oldItem.count} ➝ ${newItem.count}`);
            }
        }
    });
    oldGear.forEach(oldItem => {
        if (!newMap.has(oldItem.id)) {
            changes.push(`• Removed: ${oldItem.name}`);
        }
    });
    if (newPayload.stageLocation && newPayload.stageLocation !== oldRider.stageLocation) {
        changes.push(`• Stage Location: ${oldRider.stageLocation || 'None'} ➝ ${newPayload.stageLocation}`);
    }
    if (newPayload.mountingPreference && newPayload.mountingPreference !== oldRider.mountingPreference) {
        changes.push(`• Mounting: ${oldRider.mountingPreference || 'Default'} ➝ ${newPayload.mountingPreference}`);
    }
    if (newPayload.hazer !== undefined && newPayload.hazer !== oldRider.hazer) {
        changes.push(`• Hazer: ${oldRider.hazer ? 'Yes' : 'No'} ➝ ${newPayload.hazer ? 'Yes' : 'No'}`);
    }

    return changes;
}
export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { eventId, gear, stageLocation, mountingPreference, placementNotes, hazer, assigneeId, assigneeName } = body;

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }
        const oldEvent = await Event.findById(eventId);
        if (!oldEvent) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        const oldRider = oldEvent.rider ? oldEvent.rider.toObject() : {};
        const updateData = {};
        if (gear) updateData['rider.gear'] = gear;
        if (stageLocation !== undefined) updateData['rider.stageLocation'] = stageLocation;
        if (mountingPreference !== undefined) updateData['rider.mountingPreference'] = mountingPreference;
        if (placementNotes !== undefined) updateData['rider.placementNotes'] = placementNotes;
        if (hazer !== undefined) updateData['rider.hazer'] = hazer;
        if (assigneeId) {
            updateData['assignedTo'] = assigneeId;
            updateData['status'] = 'requested';
        }
        const changes = generateDiff(oldRider, { gear, stageLocation, mountingPreference, placementNotes, hazer });
        const updatedEvent = await Event.findByIdAndUpdate(
            eventId,
            { $set: updateData },
            { new: true }
        ).populate('assignedTo', 'name role');
        const isNewAssignment = assigneeId && (!oldEvent.assignedTo || oldEvent.assignedTo.toString() !== assigneeId);

        if (changes.length > 0 || isNewAssignment) {
            const lang = 'English';
            if (isNewAssignment) {
                const title = riderTemplates.new_assignment[lang]();
                await Task.create({
                    eventId: eventId,
                    title: title,
                    description: 'Artist has assigned this event to you.',
                    assignee: assigneeName || 'Production Crew',
                    assigneeId: assigneeId,
                    columnId: 'preprod',
                    priority: 'High',
                    urgent: true,
                    tag: 'Rider',
                    tagColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                    dueDate: 'Review ASAP',
                    status: 'pending'
                });
            }
            for (const change of changes) {
                let title = '';
                let description = change; // The specific change line

                if (change.startsWith('• Added:')) {
                    const parts = change.split('x ');
                    const fixtureName = parts.length > 1 ? parts[1] : 'Fixture';
                    title = riderTemplates.fixture_added[lang](fixtureName);
                }
                else if (change.startsWith('• Removed:')) {
                    const parts = change.split(': ');
                    const fixtureName = parts.length > 1 ? parts[1] : 'Fixture';
                    title = riderTemplates.fixture_removed[lang](fixtureName);
                }
                else if (change.includes('➝') && change.includes('Changed')) {
                    const parts = change.split('Changed ');
                    if (parts.length > 1) {
                        const [name, valueStr] = parts[1].split(': ');
                        const [oldVal, newVal] = valueStr ? valueStr.split(' ➝ ') : ['?', '?'];
                        title = riderTemplates.count_updated[lang](name, oldVal, newVal);
                    } else {
                        title = riderTemplates.count_updated[lang]('Item', '?', '?');
                    }
                }
                else if (change.startsWith('• Stage Location:') || change.startsWith('• Mounting:')) {
                    const [feature, values] = change.replace('• ', '').split(': ');
                    const [oldVal, newVal] = values ? values.split(' ➝ ') : ['?', '?'];
                    title = riderTemplates.stage_plot_updated[lang](feature, oldVal, newVal);
                }
                else if (change.startsWith('• Hazer:')) {
                    const parts = change.split(': ');
                    const [oldVal, newVal] = parts.length > 1 ? parts[1].split(' ➝ ') : ['?', '?'];
                    title = riderTemplates.hazer_updated[lang](oldVal, newVal);
                }
                else title = riderTemplates.general_update[lang](1); // Fallback
                await Task.create({
                    eventId: eventId,
                    title: title,
                    description: description,
                    assignee: assigneeName || 'Production Crew',
                    assigneeId: assigneeId,
                    columnId: 'preprod',
                    priority: 'Medium', // Individual updates might be medium priority
                    urgent: true, // Keep it urgent so it shows in header
                    tag: 'Rider',
                    tagColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                    dueDate: 'Review',
                    status: 'pending'
                });
                console.log("Crew Notification Created (Sequential):", title);
            }
        }

        return NextResponse.json({ success: true, data: updatedEvent.rider, changes, assignedTo: updatedEvent.assignedTo });

    } catch (error) {
        console.error("Rider Update Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
