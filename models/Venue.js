// models/Venue.js
import mongoose from 'mongoose';

const VenueSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // "Hollywood Bowl"
  address: { type: String, required: true },
  city: { type: String, required: true },
  
  // Details for the specific "Event Page" view
  capacity: { type: String }, // "17,500"
  type: { type: String },     // "Outdoor Amphitheater"
  
  policies: {
    parking: { type: Boolean, default: false },
    bagPolicy: { type: String, default: "Standard" } // "Clear Bags Only"
  },
  
  description: { type: String }, // The long text about the venue history
  image: { type: String }        // The photo of the venue itself
});

export default mongoose.models.Venue || mongoose.model('Venue', VenueSchema);