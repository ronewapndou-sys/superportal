import { existsSync, readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const cxo = (p: string) => fileURLToPath(new URL(`./src/cxo/${p}`, import.meta.url));
const publicDir = fileURLToPath(new URL('./public', import.meta.url));

/**
 * The dev server treats every .html address as a page of this app and answers with the app shell, so a static page in
 * public/ (the onboarding dashboard the Onboarding screen embeds) came back as the portal inside itself. Serve those
 * files as they are. A production build copies public/ as is, so this only matters in development.
 */
const servePublicHtml = {
  name: 'serve-public-html',
  configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (b: Buffer) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      const path = decodeURIComponent((req.url ?? '').split('?')[0]);
      const file = normalize(join(publicDir, path));
      if (path.endsWith('.html') && file.startsWith(publicDir) && existsSync(file)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(readFileSync(file));
        return;
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [servePublicHtml, react(), tailwindcss()],
  resolve: {
    alias: [
      // The CXO client-portal pages were written for Next.js; these map its imports onto this app.
      { find: 'next/link', replacement: cxo('shims/next-link.tsx') },
      { find: 'next/navigation', replacement: cxo('shims/next-navigation.ts') },
      { find: 'next/image', replacement: cxo('shims/next-image.tsx') },
      { find: /^@\/(.*)$/, replacement: cxo('$1') },
    ],
  },
  server: {
    // Other teams' source folders and older versions live next to the app; don't watch them.
    watch: { ignored: ['**/Mettus-Client-Portal/**', '**/xds-portal/**', '**/static-wireframe/**', '**/*.html'] },
  },
  define: {
    // Mock API (MSW) stays on until a real backend URL is configured.
    'process.env.NEXT_PUBLIC_API_URL': 'undefined',
    'process.env.NEXT_PUBLIC_DEMO_MOCKS': JSON.stringify('true'),
  },
});
