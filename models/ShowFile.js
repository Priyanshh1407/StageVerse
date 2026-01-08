// models/ShowFile.js
import mongoose from 'mongoose';

const CueSchema = new mongoose.Schema({
  cueId: { type: String }, // "Q-105"
  
  // Timing
  songTitle: { type: String },    // "Midnight Rain"
  section: { type: String },      // "Bridge • Build Up"
  
  // The Action
  type: { type: String, enum: ['Critical', 'Standard', 'Visual'], default: 'Standard' },
  triggerAction: { type: String }, // "+ Spotlight Center"
  
  // Technical Details (The LD's notes)
  technical: {
    visual: { type: String },       // "Deep Blue Wash"
    spots: { type: String },        // "Hold Center"
    haze: { type: String },         // "Haze @ 60%"
    notes: { type: String }         // "No Fan"
  },
  
  notes: { type: String } // General notes for the operator
});

const ShowFileSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  
  name: { type: String, default: 'Master Show File' },
  bpm: { type: Number, default: 128 },
  
  // The Run of Show (Setlist + Status)
  runOfShow: [{
    title: { type: String },
    duration: { type: String },
    status: { type: String, enum: ['completed', 'live', 'pending'], default: 'pending' },
    notes: { type: String }
  }],
  
  // The Cues
  cues: [CueSchema]
  
}, { timestamps: true });

export default mongoose.models.ShowFile || mongoose.model('ShowFile', ShowFileSchema);