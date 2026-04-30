import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { githubPagesSpa } from "@sctg/vite-plugin-github-pages-spa"

export default defineConfig({
  plugins: [
    vue(),
    githubPagesSpa({
      verbose: true,   // Показывает логи при сборке
    }),
  ],
  base: '/todo-voice-app/',
})