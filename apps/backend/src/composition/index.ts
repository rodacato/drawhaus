import { createRepositories } from "./repositories";
import { createServices } from "./services";
import { createUseCases } from "./use-cases";

export { createRepositories, type Repositories } from "./repositories";
export { createServices, type Services } from "./services";
export { createUseCases, type UseCases } from "./use-cases";

export function createCompositionRoot() {
  const repos = createRepositories();
  const services = createServices(repos);
  const useCases = createUseCases(repos, services);
  return { repos, services, useCases };
}
