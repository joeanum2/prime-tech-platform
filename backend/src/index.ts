import { buildApp } from "./app";
import { loadEnv } from "./config/env";

const env = loadEnv();
const app = buildApp();

app.listen(env.PORT, () => {
  console.log(`backend listening on :${env.PORT}`);
});
