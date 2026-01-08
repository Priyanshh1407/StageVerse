import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String, // Cached for easier display
  ticketType: String,
  comment: String,
  sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
  tags: [String], // e.g. ["#Sound", "#Parking"]
}, { timestamps: true });

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);