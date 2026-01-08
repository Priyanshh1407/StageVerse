// models/Song.js
import mongoose from 'mongoose';

const SongSchema = new mongoose.Schema({
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  title: { type: String, required: true },  // "Midnight City"
  
  // Technicals
  duration: { type: String },               // "04:03"
  bpm: { type: Number },                    // 128
  key: { type: String },                    // "F#m"
  
  // Vibe / Meta
  tags: [{ type: String }],                 // ["High Energy", "Encore"]
  color: { type: String, default: 'blue' }, // For the UI buttons
  
  // Optional: Lyrics, Links to backing tracks, etc.
  lyrics: { type: String },
  audioUrl: { type: String }
  
}, { timestamps: true });

export default mongoose.models.Song || mongoose.model('Song', SongSchema);