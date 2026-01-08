import mongoose from 'mongoose';

// 1. Ticket Tier Sub-Schema
const TicketTierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  capacity: { type: Number, required: true },
  sold: { type: Number, default: 0 },
  status: { type: String, default: 'Active' }
});

// 2. Discount Sub-Schema
const DiscountSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true },
  type: { type: String, enum: ['Percentage', 'Fixed Amount'], required: true },
  value: { type: Number, required: true }, // e.g. 20
  uses: { type: Number, default: 0 },
  status: { type: String, default: 'Active' }
});

// 3. Image Assets Sub-Schema (Hero, Artist, Venue)
const ImageAssetsSchema = new mongoose.Schema({
  hero: { type: String },   // Main banner
  artist: { type: String }, // Circular artist profile
  venue: { type: String }   // Venue map/photo
}, { _id: false });

// 4. Lineup Member Sub-Schema
const LineupMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String },   // e.g. "Support Act"
  image: { type: String }
});

// 5. Main Event Schema
const EventSchema = new mongoose.Schema({
  eventId: { type: Number, unique: true }, // Short ID (e.g. 1001)
  
  title: { type: String, required: true },
  
  // 📝 This acts as the "About The Event" section
  description: { type: String, required: true }, 
  
  date: { type: Date, required: true },
  time: { type: String, required: true },
  
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  city: { type: String, required: true },
  
  artist: { type: String, required: true }, // Headliner Name
  lineup: [LineupMemberSchema], // Support Acts
  
  genre: { type: String },
  vibe: { type: String },
  
  images: ImageAssetsSchema, // Stores hero, artist, venue URLs
  
  ticketTiers: [TicketTierSchema],
  discounts: [DiscountSchema], // Renamed to plural for consistency
  
  status: { type: String, default: 'Scheduled' },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { 
  timestamps: true 
});

// Check if model exists to prevent "OverwriteModelError" in dev mode
const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);

export default Event;