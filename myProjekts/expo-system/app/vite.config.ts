import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The engine is a sibling workspace, imported as source.
export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
});
