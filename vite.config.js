import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: [
      '4a1c81dc-68cb-4e4f-b3d5-87af3d912c04-00-3mqcl53zl3uat.sisko.replit.dev'
    ],
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    hmr: {
      clientPort: 443 // Forces Vite to use Replit's secure tunnel
    }
  }
});