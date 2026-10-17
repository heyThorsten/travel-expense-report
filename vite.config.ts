import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/travel-expense-report/',
  plugins: [vue(), vuetify({ autoImport: true })],
})
