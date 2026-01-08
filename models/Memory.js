import mongoose from "mongoose";

const memorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['photo', 'video', 'ticket', 'album'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    subtitle: {
        type: String,
    },
    date: {
        type: Date,
    },
    location: {
        type: String,
    },
    venue: {
        type: String,
    },
    artist: {
        type: String,
    },
    image: { type: String },    // URL for photos/thumbnails
    videoSrc: { type: String }, // URL for video files

    featured: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Memory || mongoose.model('Memory', memorySchema);