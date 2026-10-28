import mongoose from 'mongoose';

const PollSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    question: {
        type: String,
        required: true,
        default: "Which song should we play next?"
    },
    options: [{
        text: { type: String, required: true },
        votes: { type: Number, default: 0 }
    }],
    isActive: {
        type: Boolean,
        default: false
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Set by the server when the poll closes
    winner: {
        optionId: { type: mongoose.Schema.Types.ObjectId },
        text: { type: String },
        votes: { type: Number },
        tie: { type: Boolean },
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

PollSchema.index({ eventId: 1, isActive: 1 });

export default mongoose.models.Poll || mongoose.model('Poll', PollSchema);
