const mongoose = require('mongoose');
const { Schema } = mongoose;

// MOCKED MODELS to avoid import issues in standalone script
const PollSchema = new Schema({ eventId: Schema.Types.ObjectId, question: String, isActive: Boolean, options: [Object] });
const EventSchema = new Schema({ title: String });
const TicketSchema = new Schema({ userId: Schema.Types.ObjectId, eventId: Schema.Types.ObjectId });
const UserSchema = new Schema({ name: String, email: String });

const Poll = mongoose.model('Poll', PollSchema);
const Event = mongoose.model('Event', EventSchema);
const Ticket = mongoose.model('Ticket', TicketSchema);
const User = mongoose.model('User', UserSchema);

const fs = require('fs');
const path = require('path');

// Manually parse .env.local
try {
    const envPath = path.resolve(__dirname, '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/"/g, ''); // Basic cleanup
        }
    });
} catch (e) {
    console.warn("Could not read .env.local");
}

async function check() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("Missing MONGODB_URI");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const polls = await Poll.find({});
        console.log(`Found ${polls.length} polls.`);

        for (const p of polls) {
            console.log(`Poll: ${p._id} | Question: ${p.question} | Active: ${p.isActive} | EventId: ${p.eventId}`);
            const event = await Event.findById(p.eventId);
            console.log(` -> Linked Event: ${event ? event.title : 'NOT FOUND'}`);

            // Check tickets for this event
            const tickets = await Ticket.find({ eventId: p.eventId });
            console.log(` -> Tickets sold for this event: ${tickets.length}`);
            if (tickets.length > 0) {
                const user = await User.findById(tickets[0].userId);
                console.log(` -> Sample Ticket Holder: ${user ? user.email : 'Unknown'}`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

check();
