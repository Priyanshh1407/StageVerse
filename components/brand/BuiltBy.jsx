// The author credit: StageVerse is designed and built by Priyansh Waghela. Shown in the site footer
// and on the loading screen, and set as the site's author in the page metadata (app/layout.js).
export const AUTHOR = { name: 'Priyansh Waghela', url: 'https://www.linkedin.com/in/priyansh-waghela-3b754b282/' };

export default function BuiltBy({ className = '' }) {
    return (
        <span className={className}>
            Designed and built by{' '}
            <a href={AUTHOR.url} target="_blank" rel="noopener noreferrer author"
                className="font-bold bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                {AUTHOR.name}
            </a>
        </span>
    );
}
