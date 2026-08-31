/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: ['**/.worktrees/**', '**/dist/**', '**/node_modules/**'],
    setupFiles: './src/test/setup.ts',
  },
})
