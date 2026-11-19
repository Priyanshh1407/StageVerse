import { redirect } from 'next/navigation';

// StageVerse doesn't sell tickets (an event page says where they are sold): an event's ticketing goes to the organizer's events
export default function Page() {
    redirect('/events');
}
