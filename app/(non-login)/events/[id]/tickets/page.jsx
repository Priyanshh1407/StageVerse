// File: src/app/(fan)/events/[id]/tickets/page.js
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
// Import the UI component that shows the ticket list to fans
import TicketSelection from '@/components/fan/TicketSelection'; 

export default function FanTicketPage() {
  const params = useParams();
  
  // This reads the ID from the URL: /events/9/tickets
  // params.id will be "9"
  const eventId = params.id; 

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Pass the eventId to your component.
         This component will fetch data from your PUBLIC API (GET request).
      */}
      <TicketSelection eventId={eventId} /> 
    </div>
  );
}