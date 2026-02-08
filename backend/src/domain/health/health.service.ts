import { isoNow } from "../../lib";

export function buildAdminHealth() {
  return { ok: true, scope: "admin", ts: isoNow() };
}
