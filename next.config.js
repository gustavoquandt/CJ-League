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
    domains: ['avatars.faceit.com', 'cdn.faceit.com', 'distribution.faceit-cdn.net', 'assets.faceit-cdn.net']
  },
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone'
};

module.exports = nextConfig;