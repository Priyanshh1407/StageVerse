// models/Logistics.js
import mongoose from 'mongoose';

const LogisticsSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, unique: true },
  
  // The current phase of the show
  phase: { 
    type: String, 
    enum: ['Pre-Production', 'Load-In', 'Rehearsal', 'Show', 'Load-Out'], 
    default: 'Pre-Production' 
  },
  
  // Who is working?
  crew: [{
    name: { type: String },   // "James Hold"
    role: { type: String },   // "ME" (Master Electrician)
    status: { type: String }, // "Updating Patch"
    color: { type: String }   // "bg-green-500" (Avatar color)
  }],
  
  // Uploaded Files
  documents: [{
    title: { type: String },  // "Light Plot v4.2"
    type: { type: String },   // "Map", "Grid", "Box" (Icon type)
    url: { type: String },    // Link to file
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.models.Logistics || mongoose.model('Logistics', LogisticsSchema);