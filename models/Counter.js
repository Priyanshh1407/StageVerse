import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g., "eventId"
  seq: { type: Number, default: 1000 }   // Start counting from 1000
});

export default mongoose.models.Counter || mongoose.model('Counter', CounterSchema);