
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/create-payment-intent": {
        target: "http://localhost:4242",
        changeOrigin: true,
        secure: false
      }
    },
  },
});