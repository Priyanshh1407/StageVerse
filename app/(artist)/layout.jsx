import RoleShell from '@/components/shell/RoleShell';

// every artist page: the shared menu on the left (components/shell/RoleSidebar.jsx)
export default function Layout({ children }) {
    return <RoleShell role="artist">{children}</RoleShell>;
}
