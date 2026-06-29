import { defineConfig } from 'vite';
import { resolve } from 'path';

const root = __dirname;

/** Multi-page entries — paths must match runtime redirects (/src/pages/...) */
const pageInputs = {
  main: resolve(root, 'index.html'),
  login: resolve(root, 'src/pages/share/login/login.html'),
  listUser: resolve(root, 'src/pages/users/list/ListUser.html'),
  listCustomer: resolve(root, 'src/pages/customers/list/ListCustomer.html'),
  listPrediction: resolve(root, 'src/pages/analytics/predictions/list/ListPrediction.html'),
  listLoan: resolve(root, 'src/pages/loan/list/ListLoan.html'),
};

export default defineConfig({
  root,
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: pageInputs,
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
