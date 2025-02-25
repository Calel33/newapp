/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  reactStrictMode: true,
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  },
  images: {
    domains: ['html2me.netlify.app'],
  },
}

module.exports = nextConfig
