const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stage-verse.vercel.app';

// The public pages (everything else needs a login)
export default function sitemap() {
    const pages = [['/', 'weekly', 1], ['/events', 'daily', 0.8], ['/explore', 'weekly', 0.6], ['/about', 'monthly', 0.5], ['/contact', 'monthly', 0.4], ['/login', 'yearly', 0.3], ['/signup', 'yearly', 0.3]];
    return pages.map(([path, changeFrequency, priority]) => ({ url: `${SITE_URL}${path}`, lastModified: new Date(), changeFrequency, priority }));
}
