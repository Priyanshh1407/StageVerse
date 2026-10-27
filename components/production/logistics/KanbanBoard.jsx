'use client';

import { Plus, MoreHorizontal, Clock, AlertCircle, Trash2, Pencil } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useState, useRef, useEffect } from 'react';

export default function KanbanBoard({ columns = [], onDragEnd, onEditTask, onDeleteTask }) {
  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-[#0F0F10]">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full gap-6 min-w-max pb-4">
          {columns.map((col) => (
            <KanbanColumn key={col.id} data={col} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

function KanbanColumn({ data, onEditTask, onDeleteTask }) {
  return (
    <div className={`flex flex-col w-80 bg-[#121214] rounded-xl border border-[#27272A] h-full max-h-full ${data.isGhost ? 'opacity-60' : ''}`}>

      <div className="p-4 flex items-center justify-between border-b border-[#27272A]">
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${data.dotColor}`}></div>
          <h3 className="font-bold text-white text-sm">{data.title}</h3>
          <span className="bg-[#27272A] text-gray-400 text-[10px] px-1.5 py-0.5 rounded font-mono">{data.count}</span>
        </div>
        <button className="text-gray-500 hover:text-white"><Plus className="w-5 h-5" /></button>
      </div>

      <Droppable droppableId={data.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar ${snapshot.isDraggingOver ? 'bg-[#27272A]/50' : ''}`}
          >
            {data.cards.length > 0 ? (
              data.cards.map((card, index) => (
                <KanbanCard
                  key={card.id}
                  card={card}
                  index={index}
                  onEdit={() => onEditTask && onEditTask(card)}
                  onDelete={() => onDeleteTask && onDeleteTask(card)}
                />
              ))
            ) : (
              <>
                {}
                {}
                {provided.placeholder}
                {data.cards.length === 0 && !snapshot.isDraggingOver && (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-600 h-32">
                    <div className="opacity-50 mb-2 border-2 border-dashed border-[#27272A] rounded-lg p-3">
                      <Plus className="w-6 h-6" />
                    </div>
                    <p className="text-sm">No tasks yet</p>
                  </div>
                )}
              </>
            )}
            {data.cards.length > 0 && provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function KanbanCard({ card, index, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Draggable draggableId={String(card.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{ ...provided.draggableProps.style }}
          className={`bg-[#18181B] p-3 rounded-lg border border-[#27272A] shadow-sm group hover:border-blue-500/50 transition-colors ${card.urgent ? 'border-l-4 border-l-red-500' : ''} ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-500/50 rotate-2' : ''}`}
        >

          <div className="flex justify-between items-start mb-2 relative">
            <span className={`${card.tagColor} text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide`}>{card.tag}</span>
            <div ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="text-gray-600 hover:text-white p-1 rounded hover:bg-[#27272A] transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-6 w-32 bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl z-50 overflow-hidden text-left flex flex-col">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-[#27272A] w-full text-left"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 w-full text-left"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm font-medium text-gray-200 mb-3">{card.title}</p>

          <div className="flex justify-between items-center">
            <div className="flex -space-x-2">
              {card.unassigned ? (
                <div className="size-6 rounded-full bg-[#27272A] flex items-center justify-center text-[10px] font-bold border border-[#18181B] text-gray-400">?</div>
              ) : (
                <div className="size-6 rounded-full bg-gray-600 border border-[#18181B]"></div>
              )}
            </div>
            <div className="flex items-center gap-1 text-gray-500 text-xs">
              <Clock className="w-3 h-3" />
              <span>{card.date}</span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
