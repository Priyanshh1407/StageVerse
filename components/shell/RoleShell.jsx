'use client';

import { usePathname } from 'next/navigation';
import RoleSidebar from './RoleSidebar';

// the dense editors and consoles keep their room: the menu is a rail of icons there (bigger screens)
const RAIL = /^\/(patch-studio|patch-sheet|logistics|live|live-show)\/[^/]+/;

/** A role's pages with the shared menu on the left (a bar and a drawer on phones). */
export default function RoleShell({ role, children }) {
    const pathname = usePathname() ?? '';
    return (
        <div className="md:flex">
            <RoleSidebar role={role} variant="shell" rail={RAIL.test(pathname)} />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
