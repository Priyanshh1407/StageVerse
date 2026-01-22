'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import { MapPin, FileText, Download, Search, Layout, Table, Loader2, Map, Grid, Cable, Clipboard, Box, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

import StudioNavbar from '@/components/production/StudioNavbar';

import KanbanBoard from '@/components/production/logistics/KanbanBoard';
import TaskModal from '@/components/production/tasks/TaskModal';

export default function LogisticsPage(props) {
    const params = use(props.params);
    const showId = params.id;
    const [isLoading, setIsLoading] = useState(true);
    const [showData, setShowData] = useState(null);    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban', 'table'
    const [isReportOpen, setIsReportOpen] = useState(false);    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'user', 'urgent'

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/production/logistics/${showId}`);
                if (!res.ok) throw new Error('Failed to load');
                const data = await res.json();
                setShowData(data);
            } catch (error) {
                console.error("Error loading logistics:", error);
                toast.error("Could not load production data");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [showId]);

    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const startColumnId = source.droppableId;
        const endColumnId = destination.droppableId;        const newData = { ...showData };
        const startColumnFn = newData.kanban.find(c => c.id === startColumnId);
        const endColumnFn = newData.kanban.find(c => c.id === endColumnId);        const [movedCard] = startColumnFn.cards.splice(source.index, 1);        endColumnFn.cards.splice(destination.index, 0, movedCard);        startColumnFn.count = startColumnFn.cards.length;
        endColumnFn.count = endColumnFn.cards.length;        setShowData(newData);        if (startColumnId !== endColumnId) {
            try {                let newStatus = 'pending';
                if (endColumnId === 'loadout' || endColumnId === 'done') newStatus = 'completed'; // basic logic

                await fetch('/api/production/logistics', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: movedCard.id,
                        columnId: endColumnId,
                        status: newStatus
                    })
                });
                toast.success('Task moved');
            } catch (error) {
                console.error("Failed to move task", error);
                toast.error('Failed to save move');
            }
        }
    };

    const handleCreateTask = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleDeleteTask = async (task) => {
        if (!confirm('Are you sure you want to delete this task?')) return;        const newData = { ...showData };
        newData.kanban.forEach(col => {
            col.cards = col.cards.filter(c => c.id !== task.id);
            col.count = col.cards.length;
        });
        setShowData(newData);

        try {
            await fetch('/api/production/logistics', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: task.id })
            });
            toast.success("Task deleted");
        } catch (e) {
            console.error(e);        }
    };

    const handleSaveTask = async (taskData) => {
        try {
            const isEditing = !!editingTask;
            const method = isEditing ? 'PUT' : 'POST';

            console.log("Saving task...", taskData);

            const payload = {
                ...taskData,
                eventId: showId,
                id: editingTask ? editingTask.id : undefined,
                assignee: taskData.assignee || 'Alex M.'
            };

            const res = await fetch('/api/production/logistics', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            let data;
            try {
                data = await res.json();
            } catch (err) {
                console.error("Failed to parse JSON", err);
                toast.error("Server error");
                return;
            }

            if (data.success || res.ok) {
                toast.success(isEditing ? 'Task updated' : 'Task created');
                setIsModalOpen(false);                const res2 = await fetch(`/api/production/logistics/${showId}`);
                const refreshedData = await res2.json();
                setShowData(refreshedData);
            } else {
                console.error("Save failed", data);
                toast.error(data.error || 'Error saving task');
            }
        } catch (e) {
            console.error("System error saving task", e);
            toast.error('System error');
        }
    };

    const handleReport = () => {
        setIsReportOpen(true);
    };

    const handleExport = () => {
        setIsReportOpen(true);
    };    const handleDownloadPDF = () => {
        if (!showData) return;
        try {
            toast.info("Generating PDF...");
            const doc = new jsPDF();            doc.setFontSize(22);
            doc.setTextColor(40);
            doc.text("Logistics Task Report", 14, 20);

            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text(`Show: ${showData.showName}`, 14, 30);
            doc.text(`Venue: ${showData.venue} | Phase: ${showData.phase}`, 14, 36);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);            const tasksToExport = filteredKanban.flatMap(col => col.cards);

            const tableHeaders = [['Title', 'Status', 'Tag', 'Priority', 'Assignee', 'Date']];
            const tableData = tasksToExport.map(task => [
                task.title + (task.urgent ? ' (URGENT)' : ''),
                task.status || task.columnId,
                task.tag || '',
                task.priority || 'Medium',
                task.assignee || '',
                task.date || ''
            ]);

            autoTable(doc, {
                startY: 50,
                head: tableHeaders,
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [40, 40, 40] },
                styles: { fontSize: 10, cellPadding: 3 },
            });

            doc.save(`logistics_report_${showData?.showName || 'production'}.pdf`);
            toast.success("PDF Downloaded");
        } catch (e) {
            console.error("PDF Fail", e);
            toast.error("Export failed");
        }
    };

    const filteredKanban = useMemo(() => {
        if (!showData) return [];
        let cols = showData.kanban.map(col => ({ ...col, cards: [...col.cards] })); // Deep Copy for filtering

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            cols.forEach(col => {
                col.cards = col.cards.filter(c =>
                    c.title.toLowerCase().includes(q) ||
                    c.tag.toLowerCase().includes(q)
                );
            });
        }

        if (filterType === 'urgent') {
            cols.forEach(col => {
                col.cards = col.cards.filter(c => c.urgent);
            });
        }

        if (filterType === 'user') {
            cols.forEach(col => {                col.cards = col.cards.filter(c => c.assignee === 'Alex M.' || c.assignee === 'Alex Morrison');
            });
        }

        return cols;
    }, [showData, searchQuery, filterType]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full bg-[#0F0F10] items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!showData) return <div className="text-white p-10">Data not found. Try seeding /api/seed/logistics</div>;

    const allTasksFlat = filteredKanban.flatMap(col => col.cards);

    return (        <div className="flex flex-col h-screen w-full bg-[#0F0F10] font-sans text-slate-300 overflow-hidden">

            {}
            <style jsx global>{`
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: #0F0F10; }
                ::-webkit-scrollbar-thumb { background: #27272A; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
                * { scrollbar-width: thin; scrollbar-color: #27272A #0F0F10; }
                
                @media print {
                    @page { margin: 0; size: landscape; }
                    body { background: white; color: black; }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                }
            `}</style>

            {}
            {isReportOpen && (
                <div className="fixed inset-0 z-[200] bg-white text-black overflow-y-auto print-only">
                    <div id="report-content" className="p-8 max-w-5xl mx-auto bg-white min-h-screen">
                        <div className="flex justify-between items-start mb-8 border-b pb-4">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">Logistics Report</h1>
                                <h2 className="text-xl text-gray-600">{showData.showName}</h2>
                                <p className="text-gray-500">{showData.venue}</p>
                            </div>
                            <div className="text-right no-print" data-html2canvas-ignore="true">
                                <button onClick={handleDownloadPDF} className="bg-green-600 text-white px-4 py-2 rounded mr-2 font-bold hover:bg-green-700 inline-flex items-center gap-2">
                                    <Download className="w-4 h-4" /> Download PDF
                                </button>
                                <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded mr-2 font-bold hover:bg-blue-700">Print</button>
                                <button onClick={() => setIsReportOpen(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-bold hover:bg-gray-300">Close</button>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h3 className="font-bold border-b mb-4 pb-2">Task Summary</h3>
                            <div className="grid grid-cols-4 gap-4">
                                {showData.kanban.map(col => (
                                    <div key={col.id} className="p-4 bg-gray-50 border rounded-lg">
                                        <div className="font-bold text-gray-700">{col.title}</div>
                                        <div className="text-2xl font-bold">{col.cards.length}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="p-3">Task</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Tag</th>
                                    <th className="p-3">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allTasksFlat.map(task => (
                                    <tr key={task.id} className="border-b">
                                        <td className="p-3 font-medium">{task.title}{task.urgent && <span className="ml-2 text-red-500 text-xs font-bold">(URGENT)</span>}</td>
                                        <td className="p-3 capitalize">{task.status || 'Active'}</td>
                                        <td className="p-3">{task.tag}</td>
                                        <td className="p-3">{task.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <StudioNavbar className="no-print" />

            <div className={`flex flex-1 overflow-hidden relative no-print ${isReportOpen ? 'hidden' : ''}`}>

                {}
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0F0F10] relative">

                    {}
                    {}
                    <div className="flex flex-col gap-0 border-b border-[#27272A] bg-[#0F0F10] z-10 shadow-sm">
                        <div className="px-6 py-5 flex flex-wrap justify-between items-end gap-4">
                            <div className="flex min-w-72 flex-col gap-2">
                                <div className="flex items-center gap-2 text-blue-500 text-sm font-bold uppercase tracking-wider">
                                    <MapPin className="w-4 h-4" />
                                    {showData.venue}
                                </div>
                                <h1 className="text-white text-4xl font-bold leading-tight tracking-tight">Logistics: {showData.showName}</h1>
                                <p className="text-gray-500 text-base font-normal leading-normal">Production Phase: <span className="text-white font-medium">{showData.phase}</span></p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleReport}
                                    className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#27272A] hover:bg-[#3F3F46] text-white gap-2 text-xs font-bold uppercase leading-normal tracking-wide transition-all border border-[#3F3F46]">
                                    <FileText className="w-4 h-4" />
                                    <span>Report</span>
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-blue-600 hover:bg-blue-500 text-white gap-2 text-xs font-bold uppercase leading-normal tracking-wide shadow-lg shadow-blue-500/20 transition-all">
                                    <Download className="w-4 h-4" />
                                    <span>Export</span>
                                </button>
                                <button
                                    onClick={handleCreateTask}
                                    className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-green-600 hover:bg-green-500 text-white gap-2 text-xs font-bold uppercase leading-normal tracking-wide shadow-lg shadow-green-500/20 transition-all">
                                    <Plus className="w-4 h-4" />
                                    <span>New Task</span>
                                </button>
                            </div>
                        </div>

                        {}
                        <div className="px-6 pb-4 pt-2 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                            <div className="flex flex-1 w-full max-w-xl items-center gap-4">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                        <Search className="w-4 h-4" />
                                    </div>
                                    <input
                                        className="block w-full rounded-lg border-none bg-[#18181B] py-2.5 pl-10 pr-3 text-sm placeholder:text-gray-600 focus:ring-1 focus:ring-blue-500 text-white"
                                        placeholder="Search tasks..."
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex bg-[#18181B] rounded-lg p-1 border border-[#27272A] hidden md:flex">
                                    <button
                                        onClick={() => setViewMode('kanban')}
                                        className={`p-1.5 rounded transition-colors ${viewMode === 'kanban' ? 'bg-[#27272A] text-white border border-[#3F3F46]' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        <Layout className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-[#27272A] text-white border border-[#3F3F46]' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        <Table className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2 xl:pb-0 scrollbar-hide w-full xl:w-auto">
                                <FilterButton
                                    label="All Tasks"
                                    active={filterType === 'all'}
                                    onClick={() => setFilterType('all')}
                                />
                                <FilterButton
                                    label="My Tasks"
                                    active={filterType === 'user'}
                                    onClick={() => setFilterType('user')}
                                />
                                <FilterButton
                                    label="Urgent"
                                    active={filterType === 'urgent'}
                                    color="text-red-400"
                                    onClick={() => setFilterType('urgent')}
                                />
                            </div>
                        </div>
                    </div>

                    {viewMode === 'kanban' ? (
                        <KanbanBoard
                            columns={filteredKanban}
                            onDragEnd={handleDragEnd}
                            onEditTask={handleEditTask}
                            onDeleteTask={handleDeleteTask}
                        />
                    ) : (
                        <div className="flex-1 overflow-auto p-6">
                            <div className="max-w-6xl mx-auto bg-[#18181B] rounded-xl border border-[#27272A]">
                                <table className="w-full text-left">
                                    <thead className="bg-[#121214] border-b border-[#27272A] text-xs uppercase text-gray-500">
                                        <tr>
                                            <th className="p-4">Title</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Tag</th>
                                            <th className="p-4">Priority</th>
                                            <th className="p-4">Date</th>
                                            <th className="p-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#27272A]">
                                        {allTasksFlat.map(task => (
                                            <TaskTableRow
                                                key={task.id}
                                                task={task}
                                                onEdit={() => handleEditTask(task)}
                                                onDelete={() => handleDeleteTask(task)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </main>

            </div >

            {isModalOpen && (
                <TaskModal
                    task={editingTask}
                    showId={showData.showName}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveTask}
                />
            )}
        </div >
    );
}

function TaskTableRow({ task, onEdit, onDelete }) {
    return (
        <tr className="hover:bg-[#222] group">
            <td className="p-4 font-medium text-white">{task.title}</td>
            <td className="p-4 text-gray-400">{task.status || task.columnId}</td>
            <td className="p-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${task.tagColor}`}>{task.tag}</span>
            </td>
            <td className="p-4 text-gray-400">{task.urgent ? 'Urgent' : 'Normal'}</td>
            <td className="p-4 text-gray-500">{task.date}</td>
            <td className="p-4 text-right">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-1.5 rounded hover:bg-[#3F3F46] text-gray-400 hover:text-white"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1.5 rounded hover:bg-[#3F3F46] text-gray-400 hover:text-red-400"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

function FilterButton({ label, active, color, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg border px-3 transition-colors ${active
                ? 'bg-[#18181B] border-blue-500/50 text-blue-400'
                : 'bg-[#18181B] border-[#27272A] hover:border-[#3F3F46] ' + (color || 'text-gray-400')
                }`}>
            <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </button>
    )
}