import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import viteReact from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  server: {
    port: 3000
  },
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  plugins: [
    tsConfigPaths(),
    mode === 'test'
      ? null
      : cloudflare({
          viteEnvironment: {
            name: 'ssr'
          }
        }),
    mode === 'test' ? null : tanstackStart(),
    viteReact(),
  ].filter(Boolean),
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test/setup.ts']
  }
}));
