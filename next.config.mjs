/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { dirs: ['app', 'components', 'lib', 'db', 'scripts'] },
  // Replit Autoscale terminates TLS in front of the app and forwards the
  // original host, which is how the tenant is resolved.
  poweredByHeader: false,
};

export default nextConfig;
