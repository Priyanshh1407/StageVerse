// models/Rider.js
import mongoose from 'mongoose';

const RiderSchema = new mongoose.Schema({
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Matches your 'dbData' exactly
  gear: [{
    id: { type: Number },          // Keep your frontend ID if needed for sorting
    name: { type: String },        // "Moving Head"
    type: { type: String },        // "Beam / Hybrid"
    count: { type: Number, default: 0 },
    iconKey: { type: String }      // "Scan", "Zap", "Waves" (Crucial for UI)
  }],

  notes: { type: String, default: '' },
  fileUrl: { type: String }
}, { timestamps: true });

export default mongoose.models.Rider || mongoose.model('Rider', RiderSchema);