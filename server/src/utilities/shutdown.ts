const shutdownController = new AbortController();

export const shutdownSignal = shutdownController.abort.bind(shutdownController);

export { shutdownController };
