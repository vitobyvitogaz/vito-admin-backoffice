/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lqkqasuotgrlqwokquhy.supabase.co'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@supabase/supabase-js': require.resolve('@supabase/supabase-js'),
    }
    return config
  },
}

module.exports = nextConfig