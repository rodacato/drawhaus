import { config } from "../../infrastructure/config";
import { prepareTestDatabase } from "./test-database";

prepareTestDatabase(config.databaseUrl).catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
