'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import TicketSelection from '@/components/fan/TicketSelection'; 

export default function FanTicketPage() {
  const params = useParams();
  const eventId = params.id; 

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {}
      <TicketSelection eventId={eventId} /> 
    </div>
  );
}