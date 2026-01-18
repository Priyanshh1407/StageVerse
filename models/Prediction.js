import mongoose from 'mongoose';

const PredictionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    songs: [{
        id: String, // Or ObjectId if strict
        title: String,
        // We store the title for easy comparison/display if song is deleted or changed
    }],
    score: { type: Number, default: 0 },
    rank: { type: Number }, // Populated after results are declared
    status: { type: String, enum: ['submitted', 'graded'], default: 'submitted' }
}, { timestamps: true });

// Prevent duplicate predictions per user per event
PredictionSchema.index({ userId: 1, eventId: 1 }, { unique: true });

export default mongoose.models.Prediction || mongoose.model('Prediction', PredictionSchema);
