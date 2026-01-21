/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.faceit.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.faceit.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'distribution.faceit-cdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.faceit-cdn.net',
        pathname: '/**',
      }
    ],
  },
  reactStrictMode: true,
  // swcMinify removido - não é mais necessário no Next.js 15
};

module.exports = nextConfig;