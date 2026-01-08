import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    price: { type: Number, required: true, default: 0 },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    seat: {
        type: String,
        default: 'General Admission',
    },
    type: {
        type: String,
        default: 'Standard',
    },
    qrCode: {
        type: String,
        unique: true
    },
    status: {
        type: String,
        enum: ['Confirmed', 'Used', 'Refunded'],
        default: 'Confirmed'
    },
    bgImage: {
        type: String,
    }
}, { timestamps: true });

export default mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);