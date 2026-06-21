import { defineConfig } from 'vite'
import react from '@react-tailwind/plugin-vite'

export default defineConfig({
  base: '/ayur_lens/',
  plugins: [react()],
})
