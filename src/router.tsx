import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function RouteSpinner() {
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-primary/20 overflow-hidden">
        <div className="h-full w-1/3 bg-primary route-loader-bar" />
      </div>
      <style>{`@keyframes route-loader { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } } .route-loader-bar { animation: route-loader 1s ease-in-out infinite; }`}</style>
    </>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 50,
    defaultPendingMinMs: 200,
    defaultPendingComponent: RouteSpinner,
  });

  return router;
};
