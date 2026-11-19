import { redirect } from 'next/navigation';

// StageVerse doesn't sell tickets: the event page says where they are sold
export default async function EventTicketsPage({ params }) {
    const { id } = await params;
    redirect(`/events/${id}`);
}
