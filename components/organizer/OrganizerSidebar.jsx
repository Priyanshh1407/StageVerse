'use client';

import RoleSidebar from '@/components/shell/RoleSidebar';

// (the shared menu: components/shell/RoleSidebar.jsx)
export default function OrganizerSidebar({ isOpen, onClose }) {
  return <RoleSidebar role="organizer" variant="inline" isOpen={isOpen} onClose={onClose} />;
}
