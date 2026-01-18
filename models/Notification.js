import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String, // 'guestlist', 'system', 'winner'
        default: 'system'
    },
    title: String,
    message: String,
    link: String,
    read: {
        type: Boolean,
        default: false
    },
    // Optional link for specific deletions/actions
    metadata: {
        eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
        guestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest' }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
