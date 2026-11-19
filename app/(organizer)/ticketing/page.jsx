import { redirect } from 'next/navigation';

// StageVerse doesn't sell tickets (an event page says where they are sold): the organizer's ticketing goes to their events
export default function Page() {
    redirect('/events');
}
