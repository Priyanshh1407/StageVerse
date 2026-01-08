import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide name'],
        maxLength: [60, 'Name cannot be more than 60 characters']
    },
    email: {
        type: String,
        required: [true, 'Please provide email'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide password'],
        select: false,
    },
    role: {
        type: String,
        enum: ['fan', 'artist', 'organizer', 'production'],
        default: 'fan',
    },
    avatar: { type: String, default: '' },
    level: { type: Number, default: 1 },
    location: { type: String, default: '' },
    bio: { type: String, default: '' },
    visibility: { type: String, enum: ['Public', 'Private'], default: 'Public' },

    socials: {
        instagram: { type: String, default: '' },
        twitter: { type: String, default: '' }
    },
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // --- Fan Stats ---
    stats: {
        showsAttended: { type: Number, default: 0 },
        citiesVisited: { type: Number, default: 0 }
    }
}, {
    timestamps: true,
});

export default mongoose.models.User || mongoose.model('User', UserSchema);