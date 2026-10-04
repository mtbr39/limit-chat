import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const demo = (file: string) => fileURLToPath(new URL(`./src/demo/${file}`, import.meta.url))

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // `--mode demo` のときは Firebase をブラウザ内で完結する代替実装に差し替える（src/demo/）
  resolve:
    mode === 'demo'
      ? {
          alias: {
            'firebase/app': demo('app.ts'),
            'firebase/auth': demo('auth.ts'),
            'firebase/firestore': demo('firestore.ts'),
          },
        }
      : {},
}))
