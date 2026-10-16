import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({ base: '/md-multi-format/', plugins: [vue()], build: { sourcemap: false, chunkSizeWarningLimit: 1200 }, test: { environment: 'node' } })
