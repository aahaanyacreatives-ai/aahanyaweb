/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  
  // ✅ ENVIRONMENT-AWARE HEADERS
  async headers() {
    // Only apply CORS headers in production
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'Access-Control-Allow-Origin',
              value: 'https://www.aahaanyacreatives.in',
            },
            {
              key: 'Access-Control-Allow-Credentials',
              value: 'true',
            },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
            },
            {
              key: 'Access-Control-Allow-Headers',
              value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
            },
          ],
        },
      ];
    }
    // No headers in development - keeps it clean
    return [];
  },

  // ✅ ENVIRONMENT-AWARE ENV VARIABLES
  env: {
    NEXTAUTH_URL: process.env.NODE_ENV === 'production' 
      ? (process.env.NEXTAUTH_URL || 'https://www.aahaanyacreatives.in')
      : 'http://localhost:3000',
    NEXTAUTH_SITE_URL: process.env.NODE_ENV === 'production'
      ? 'https://www.aahaanyacreatives.in'
      : 'http://localhost:3000',
  },

  // ✅ REMOVED PROBLEMATIC REWRITES
  // The rewrites that were causing auth requests to proxy to production
  // are completely removed for clean development experience
  
  // ✅ OPTIONAL: Add production-only redirects if needed
  async redirects() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/admin',
          destination: '/admin/dashboard',
          permanent: false,
        },
      ];
    }
    return [];
  },

  // ✅ EXPERIMENTAL FEATURES (optional)
  experimental: {
    // Enable if you're using Server Actions
    serverActions: true,
  },
}

export default nextConfig;
