import mongoose from 'mongoose';

// A direct message between two people (the fan portal's Messages). Only the sender and the
// recipient can ever read it (app/api/fan/messages).
const MessageSchema = new mongoose.Schema({
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// a conversation, newest last
MessageSchema.index({ from: 1, to: 1, createdAt: 1 });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
