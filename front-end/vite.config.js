import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// BASE lets the GitHub Pages build live in a sub-folder:
//   BASE=/Databases-and-Supabase/task-manager/ npm run build
// `npm run dev` leaves it unset, so the app runs at /
export default defineConfig({
  base: process.env.BASE || '/',
  plugins: [react()],
})
