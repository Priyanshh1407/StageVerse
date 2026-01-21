// models/Guest.js
import mongoose from 'mongoose';

const GuestSchema = new mongoose.Schema({
  // Which event is this guest for?
  // Which event is this guest for?
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Added for filtering

  // Basic Info
  name: { type: String, required: true },
  email: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional, but good for linking

  // Access Level (Matches your 'tier')
  tier: {
    type: String,
    enum: ['VIP', 'All Access', 'Afterparty', 'Guest'],
    default: 'Guest'
  },

  // Status tracking
  status: {
    type: String,
    enum: ['Pending', 'Checked In', 'approved'], // Added 'approved'
    default: 'Pending'
  },

  plusOnes: { type: Number, default: 0 },
  notes: { type: String },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // UI Helpers (Initials/Colors can be calculated on frontend, but we can store them if you prefer)
  initials: { type: String },
  color: { type: String },    // "indigo", "purple"

  addedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Guest || mongoose.model('Guest', GuestSchema);