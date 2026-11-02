import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // В разработке запросы к API уходят на сервер Express.
    proxy: { '/api': 'http://localhost:3001' },
  },
  test: { environment: 'node' },
});
