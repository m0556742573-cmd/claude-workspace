import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The admin platform: its own page and its own build, deployed to its own address (expo-admin).
// The same sources as the booth, the same .env; no service worker, nothing kept offline.
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  root: here('./admin'),
  envDir: here('.'),
  publicDir: false,
  plugins: [react()],
  server: { port: 5175, strictPort: true, fs: { allow: [here('..')] } },
  build: { outDir: here('./dist-admin'), emptyOutDir: true },
});
