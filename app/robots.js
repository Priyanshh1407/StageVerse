const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stage-verse.vercel.app';

// Search engines may read the public pages; the dashboards, the API and the test pages are left out
export default function robots() {
    return {
        rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/lab/', '/test-3d/', '/manage/', '/patch-studio/', '/tasks'] },
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
