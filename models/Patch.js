// models/Patch.js
import mongoose from 'mongoose';

const PatchSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },

  // Optional: Production specific meta-data
  version: { type: String, default: '1.0' }, // "1.4"
  showName: { type: String }, // "WorldTour_Arena_vFinal.shw"

  fixtures: [{
    // The "User ID" for the light (e.g., 101, 201)
    fixtureId: { type: Number, required: true },

    // Technical Specs
    profile: { type: String, required: true }, // "Robe BMFL Blade"
    mode: { type: String },                    // "Mode 3"
    channels: { type: Number, required: true },// 49

    // DMX Addressing
    universe: { type: Number, required: true },
    address: { type: Number, required: true },

    // Status for the "Patch Studio" UI
    status: {
      type: String,
      enum: ['ok', 'conflict', 'warning', 'broken', 'error', 'collision'],
      default: 'ok'
    },

    // Creative Data - CRITICAL FOR GROUPING
    cue: { type: String },        // e.g. "Intro Sequence"
    cueColor: { type: String },   // e.g. "blue"

    // Notes or Errors (e.g., "Overlaps with Fixture 102")
    notes: { type: String }
  }]
}, { timestamps: true });

export default mongoose.models.Patch || mongoose.model('Patch', PatchSchema);