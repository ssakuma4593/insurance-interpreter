/** @type {import('next').NextConfig} */
const nextConfig = {
  // Base path for deployment at satoesakuma.com/insurance-interpreter
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/insurance-interpreter',
  // Ensure output is standalone for better deployment compatibility
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
