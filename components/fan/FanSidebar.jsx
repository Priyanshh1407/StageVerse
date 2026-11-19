'use client';

import RoleSidebar from '@/components/shell/RoleSidebar';

// (the shared menu: components/shell/RoleSidebar.jsx)
export default function FanSidebar({ isOpen, onClose, onOpenNotifications }) {
  return <RoleSidebar role="fan" variant="inline" isOpen={isOpen} onClose={onClose} onOpenNotifications={onOpenNotifications} />;
}
