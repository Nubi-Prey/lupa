import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  test: {
    include: ['src/main/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000
  }
})
