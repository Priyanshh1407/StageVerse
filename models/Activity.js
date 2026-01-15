
import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // 'create', 'update', 'delete', 'patch'
    entityType: { type: String, required: true }, // 'Event', 'Patch', 'Task'
    entityId: { type: String }, // Flexible ID (ObjectId or custom string)
    details: { type: String }, // Human readable text (e.g. "Updated patch for Show 13")
    type: { type: String, default: 'general' }, // 'success', 'warning', 'document', 'system'
    timestamp: { type: Date, default: Date.now },
    link: { type: String } // Optional deep link
});

export default mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
