/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = {
    // other Next.js configurations go here

    // Fix for the first warning
    experimental: {
        images: true,
        // other experimental features go here
    },

    // Fix for the second warning
    output: "export",

    // other Next.js configurations go here
};