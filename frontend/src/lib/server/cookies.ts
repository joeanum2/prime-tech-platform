import { cookies } from "next/headers";

export function getRequestCookiesHeader() {
  const store = cookies();
  const all = store.getAll();
  if (all.length === 0) return "";
  return all.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}
