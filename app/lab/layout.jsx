// Internal test pages: not for search engines
export const metadata = {
    title: 'StageVerse Lab',
    robots: { index: false, follow: false },
};

export default function LabLayout({ children }) {
    return children;
}
