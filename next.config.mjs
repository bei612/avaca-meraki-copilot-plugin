/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: [],
  // Reduce file watchers usage in dev to avoid ENOSPC on WSL/Docker
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      ...(config.watchOptions || {}),
      // Enable polling to avoid exhausting inotify watchers
      poll: 1000,
      aggregateTimeout: 300,
      // Ignore heavy directories
      ignored: [
        ...(config.watchOptions?.ignored || []),
        '**/.git/**',
        '**/.next/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.turbo/**',
        '**/coverage/**',
      ],
    };
    return config;
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
