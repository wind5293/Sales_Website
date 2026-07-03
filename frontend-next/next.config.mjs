// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return {
            beforeFiles: [],
            afterFiles: [],
            fallback: [
                {
                    source: '/api/:path*',
                    destination: `${process.env.BACKEND_URL}/api/:path*`,
                },
            ],
        };
    },
};

export default nextConfig;