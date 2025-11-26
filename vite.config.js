import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'wallet': ['wagmi', 'viem', '@rainbow-me/rainbowkit'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-toast']
        }
      }
    },
    minify: 'esbuild',
    target: 'esnext'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
