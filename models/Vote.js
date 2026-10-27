import mongoose from 'mongoose';

// One document per (poll, user). The unique index is what enforces
// "one fan, one vote": a second insert fails with a duplicate-key error.
const VoteSchema = new mongoose.Schema({
    pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    optionId: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

VoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Vote || mongoose.model('Vote', VoteSchema);
