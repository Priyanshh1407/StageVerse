// models/FixtureProfile.js
import mongoose from 'mongoose';

const FixtureProfileSchema = new mongoose.Schema({
  manufacturer: { type: String, required: true }, // "Robe"
  model: { type: String, required: true },        // "BMFL Blade"
  type: { type: String },                         // "Moving Head Spot"
  
  // Different modes have different channel counts
  modes: [{
    name: { type: String, default: 'Standard' },  // "Mode 1"
    channels: { type: Number, required: true },   // 49
    
    // Advanced: What does each channel do? (For your AI Patching later)
    channelMap: [{
      index: Number, // 1
      function: String // "Pan"
    }]
  }],
  
  powerConsumption: { type: Number }, // Watts (Good for power calculations!)
  weight: { type: Number }            // kg (Good for rigging calcs!)

}, { timestamps: true });

export default mongoose.models.FixtureProfile || mongoose.model('FixtureProfile', FixtureProfileSchema);