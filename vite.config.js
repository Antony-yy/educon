import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        login: fileURLToPath(new URL('./src/pages/login.html', import.meta.url)),
        coord: fileURLToPath(new URL('./src/pages/coord.html', import.meta.url)),
        professores: fileURLToPath(new URL('./src/pages/professores.html', import.meta.url)),
        aluno: fileURLToPath(new URL('./src/pages/aluno.html', import.meta.url)),
      },
    },
  },
});