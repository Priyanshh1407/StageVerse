// models/Guest.js
import mongoose from 'mongoose';

const GuestSchema = new mongoose.Schema({
  // Which event is this guest for?
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  
  // Basic Info
  name: { type: String, required: true },
  email: { type: String },
  
  // Access Level (Matches your 'tier')
  tier: { 
    type: String, 
    enum: ['VIP', 'All Access', 'Afterparty', 'Guest'], 
    default: 'Guest' 
  },
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['Pending', 'Checked In'], 
    default: 'Pending' 
  },
  
  // UI Helpers (Initials/Colors can be calculated on frontend, but we can store them if you prefer)
  initials: { type: String }, 
  color: { type: String },    // "indigo", "purple"
  
  addedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Guest || mongoose.model('Guest', GuestSchema);