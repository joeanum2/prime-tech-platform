import "dotenv/config";
import { buildApp } from "./app";
import { loadEnv } from "./config/env";

const env = loadEnv();
if (env.NODE_ENV !== "production") {
  const adminToken = process.env.ADMIN_TOKEN ?? "";
  const status = adminToken ? `present (len=${adminToken.length})` : "missing";
  console.log(`dev: ADMIN_TOKEN ${status}`);
}
const app = buildApp();

app.listen(env.PORT, () => {
  console.log(`backend listening on :${env.PORT}`);
});