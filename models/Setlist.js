// models/Setlist.js
import mongoose from 'mongoose';

// The Schema for a single item in the list
const SetlistItemSchema = new mongoose.Schema({
  // 1. Link to the Master Song Library
  songId: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },

  // 2. Snapshot Fields (We copy these from Song.js so we don't have to look them up every time)
  title: { type: String, required: true },
  duration: { type: String },
  bpm: { type: String },
  key: { type: String },

  // 3. Show-Specific Details (Data that only applies to THIS concert)
  notes: { type: String }, // "Quick Change", "Confetti here"
  status: { type: String, enum: ['pending', 'live', 'completed'], default: 'pending' },

  // 4. Visual Tags (Matches your INITIAL_SETLIST mock data)
  tags: [{
    label: { type: String }, // "High Energy"
    color: { type: String }  // "orange"
  }],

  // 5. Interactivity (Trinity Features)
  interaction: {
    type: { type: String, enum: ['none', 'poll', 'trivia'], default: 'none' },
    question: { type: String }
  }
});

const SetlistSchema = new mongoose.Schema({
  // Who is this for?
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },

  // The Ordered List of Songs
  items: [SetlistItemSchema],

  // The "Run of Show" Logs (System standby, etc.)
  logs: [{
    time: { type: String },
    msg: { type: String },
    sub: { type: String },
    active: { type: Boolean, default: false }
  }],
  // Global Show Status for Persistence
  showStatus: { type: String, enum: ['Standby', 'Live', 'Paused'], default: 'Standby' },
  // Feature: Last Song Warning Persistence
  showWarning: { type: Boolean, default: false }
}, { timestamps: true });

// Every live-show read and write looks a setlist up by its event
SetlistSchema.index({ eventId: 1 });

export default mongoose.models.Setlist || mongoose.model('Setlist', SetlistSchema);