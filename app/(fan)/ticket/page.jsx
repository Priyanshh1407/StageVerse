import { redirect } from 'next/navigation';

// StageVerse doesn't sell tickets (an event page says where they are sold): the fan's tickets page goes to their dashboard
export default function Page() {
    redirect('/dashboard');
}
