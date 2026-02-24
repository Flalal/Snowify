import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
  plugins: [preact()],
  root: '.',
  build: {
    outDir: 'www',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      // Share renderer code from desktop
      '@renderer': path.resolve(__dirname, '../src/renderer'),
      '@state': path.resolve(__dirname, '../src/renderer/state'),
      '@components': path.resolve(__dirname, '../src/renderer/components'),
      '@shared': path.resolve(__dirname, '../src/shared'),
      // Ensure shared code resolves deps from mobile/node_modules
      'preact': path.resolve(__dirname, 'node_modules/preact'),
      '@preact/signals': path.resolve(__dirname, 'node_modules/@preact/signals')
    }
  }
});
