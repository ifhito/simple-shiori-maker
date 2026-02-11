import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

function createAppRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true
  });
}

export function getRouter() {
  return createAppRouter();
}

type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
