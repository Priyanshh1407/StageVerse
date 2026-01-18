// models/Task.js
import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },

  // Who is doing it?
  assignee: { type: String }, // "Alex M." (Or link to User ID if they have an account)

  title: { type: String, required: true }, // "Finalize Truck Pack"
  description: { type: String }, // detailed message content

  // Kanban Info
  columnId: {
    type: String,
    enum: ['preprod', 'loadin', 'show', 'loadout', 'maintenance'],
    default: 'preprod'
  },

  // Visual Tags (matches your mock colors)
  tag: { type: String },       // "Rigging", "Electric"
  tagColor: { type: String },  // "bg-amber-500/10..."

  // Details
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  urgent: { type: Boolean, default: false }, // Adds the red flag

  dueDate: { type: String },   // "Tomorrow", "08:00 AM"

  // System field
  status: { type: String, default: 'pending' }
}, { timestamps: true });

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);