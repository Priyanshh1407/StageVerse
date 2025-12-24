/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http', // Note: Google user content sometimes uses http or https
        hostname: '*.googleusercontent.com', // Wildcard handles lh3, lh4, etc.
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https', 
        hostname: '*.googleusercontent.com', 
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
