import mongoose from 'mongoose';

// 1. Ticket Tier Sub-Schema
const TicketTierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  capacity: { type: Number, required: true },
  sold: { type: Number, default: 0 },
  status: { type: String, default: 'Active' }
}, { _id: false });

// 2. Discount Sub-Schema
const DiscountSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true },
  type: { type: String, enum: ['Percentage', 'Fixed Amount'], required: true },
  value: { type: Number, required: true }, // e.g. 20
  uses: { type: Number, default: 0 },
  status: { type: String, default: 'Active' }
}, { _id: false });

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
}, { _id: false });

// 6. Day Sheet Item Schema (Custom Timeline)
const DaySheetItemSchema = new mongoose.Schema({
  time: { type: String, required: true },
  title: { type: String, required: true },
  sub: { type: String },
  type: { type: String, enum: ['travel', 'work', 'sound', 'doors', 'show', 'other'], default: 'other' },
  details: { type: String },
  status: { type: String, default: 'future' }, // future, active, completed
  tasks: [{ label: String, done: Boolean }]
});

// 7. Venue Intel Schema (Wifi, Green Room, Local Info)
const VenueIntelSchema = new mongoose.Schema({
  wifiName: { type: String },
  wifiPass: { type: String },
  greenRoomCode: { type: String },
  distance: { type: String }, // e.g. "0.2 mi"
  coffeeName: { type: String },
  coffeeDesc: { type: String }
}, { _id: false });

// 8. Tech Rider Schemas (Explicit Definition)
const GearItemSchema = new mongoose.Schema({
  id: { type: Number },
  name: { type: String },
  type: { type: String },
  count: { type: Number },
  iconKey: { type: String }
}, { _id: false });

const RiderSchema = new mongoose.Schema({
  gear: [GearItemSchema],
  stageLocation: { type: String },
  mountingPreference: { type: String },
  placementNotes: { type: String },
  hazer: { type: Boolean, default: false }
}, { _id: false });


// 5. Main Event Schema
const EventSchema = new mongoose.Schema({
  eventId: { type: Number, unique: true }, // Short ID (e.g. 1001)

  title: { type: String, required: true },

  // 📝 This acts as the "About The Event" section
  description: { type: String, required: true },

  date: { type: Date, required: true },
  time: { type: String, required: true },
  doorsOpen: { type: String },

  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  city: { type: String, required: true },

  artist: { type: String, required: true }, // Headliner Name
  lineup: [LineupMemberSchema], // Support Acts

  genre: { type: String },
  vibe: { type: String },

  images: ImageAssetsSchema, // Stores hero, artist, venue URLs

  ticketTiers: [TicketTierSchema],
  discounts: [DiscountSchema], // Renamed to plural for consistency

  status: { type: String, default: 'Scheduled' }, // 'requested', 'active', 'archived'
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Production Crew assigned by Artist

  // NEW: Day Sheet & Logistics
  daySheet: [DaySheetItemSchema],
  venueIntel: VenueIntelSchema,

  // NEW: Tech Rider (Event Specific)
  rider: { type: RiderSchema, default: () => ({}) }

}, {
  timestamps: true
});

// Check if model exists to prevent "OverwriteModelError" in dev mode
// FORCE RECOMPILE for Dev (to pick up new Schema fields)
if (process.env.NODE_ENV === 'development') delete mongoose.models.Event;

const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);

export default Event;