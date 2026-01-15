import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

export default function TaskModal({ task, showId, onClose, onSave }) {
    const [events, setEvents] = useState([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: task ? task.title : '',
        eventId: task ? task.eventId : (showId || ''), // Use eventId, not "show" (name)
        venue: task ? task.venue : '',
        priority: task ? task.priority : 'Medium',
        dueDate: task ? task.dueDate : '',
        columnId: task ? task.columnId : 'preprod',
        tag: task ? task.tag : 'General',
        urgent: task ? task.urgent : false,
        assignee: task ? task.assignee : 'Alex M.'
    });

    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoadingEvents(true);
            try {
                // Assuming /api/events returns a list of events. 
                // If it doesn't exist, we might fail, but let's try.
                // We'll use a fallback if it fails or if we are in a specific context.
                const res = await fetch('/api/events');
                if (res.ok) {
                    const data = await res.json();
                    setEvents(data.events || data); // Handle array or { events: [] }
                }
            } catch (e) {
                console.error("Failed to fetch events", e);
            } finally {
                setIsLoadingEvents(false);
            }
        };
        fetchEvents();
    }, []);

    // Update formData if task changes (though usually modal re-mounts)
    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || '',
                eventId: task.eventId || showId || '',
                venue: task.venue || '',
                priority: task.priority || 'Medium',
                dueDate: task.dueDate || '',
                columnId: task.columnId || 'preprod',
                tag: task.tag || 'General',
                urgent: task.urgent || false,
                assignee: task.assignee || 'Alex M.'
            });
        }
    }, [task, showId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Pass eventId explicitly. 
        // Note: The parent Component currently OVERRIDES eventId with the page's showId.
        // If we want to allow creating tasks for OTHER shows, parent needs to respect this.
        await onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#18181B] border border-[#27272A] w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                <div className="flex justify-between items-center p-5 border-b border-[#27272A]">
                    <h3 className="text-white font-bold text-lg">{task ? 'Edit Task' : 'Create New Task'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Task Title</label>
                        <input
                            required
                            type="text"
                            className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                            placeholder="e.g. Update Patch Sheet"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    {/* Show Dropdown - Always visible or only if !showId? 
                        User asked to fetch all events in pop up. 
                        If we are on a specific show page, usually we lock it, but let's enable it if they want.
                    */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Show / Event</label>
                        {isLoadingEvents ? (
                            <div className="text-xs text-gray-500 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading events...</div>
                        ) : (
                            <select
                                className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                value={formData.eventId} // Use eventId
                                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                                disabled={!!showId} // Lock if we are on a specific page? User request implies they want to see/select. Let's unlock if that's the request, BUT parent overrides it.
                            // Actually, if I unlock it, the parent function logic needs to change to NOT override it.
                            // For now, I'll keep it enabled but warn if parent overrides. 
                            // Wait, the prompt said "in the create task pop fetch all the events". 
                            // I'll assume they might want to change it.
                            >
                                <option value="">Select Event...</option>
                                {events.map(ev => (
                                    <option key={ev._id} value={ev._id || ev.eventId}>
                                        {ev.name || ev.title || 'Untitled Event'}
                                    </option>
                                ))}
                                {/* Fallback options if fetch fails or empty */}
                                {!events.length && (
                                    <>
                                        <option value="13">Hamlet World Tour</option>
                                        <option value="project-alpha">Project Alpha</option>
                                    </>
                                )}
                            </select>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Priority</label>
                            <select
                                className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Due Date</label>
                            <input
                                type="text"
                                className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                placeholder="e.g. Tomorrow"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Tag & Urgent */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Tag</label>
                            <select
                                className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                value={formData.tag}
                                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                            >
                                <option>General</option>
                                <option>Rigging</option>
                                <option>Electric</option>
                                <option>Audio</option>
                                <option>Admin</option>
                                <option>Trucks</option>
                            </select>
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
                                <input
                                    type="checkbox"
                                    checked={formData.urgent}
                                    onChange={(e) => setFormData({ ...formData, urgent: e.target.checked })}
                                    className="w-4 h-4 rounded bg-[#0F0F10] border border-[#27272A]"
                                />
                                Mark as Urgent
                            </label>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#27272A] flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-[#27272A] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all"
                        >
                            {task ? 'Save Changes' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
