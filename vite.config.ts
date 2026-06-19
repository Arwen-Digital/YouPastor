import { defineConfig } from 'vite'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'

const disableElectron = process.env.DISABLE_ELECTRON === '1'
const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as { version: string }
const appVersion = process.env.npm_package_version ?? packageJson.version

export default defineConfig({
  plugins: [
    vue(),
    ...(disableElectron
      ? []
      : [
        electron({
          main: {
            entry: 'electron/main.ts',
          },
          preload: {
            input: path.join(__dirname, 'electron/preload.ts'),
            vite: {
              build: {
                rollupOptions: {
                  output: {
                    format: 'es',
                  },
                },
              },
            },
          },
          renderer: process.env.NODE_ENV === 'test'
            ? undefined
            : {},
        }),
      ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    sourcemap: process.env.POSTHOG_SOURCEMAPS === 'true',
  },
})


/*
import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: process.env.NODE_ENV === 'test'
        ? undefined
        : {},
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
*/