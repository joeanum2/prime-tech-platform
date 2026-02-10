export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getMailConfig(): MailConfig {
  const isDev = (process.env.NODE_ENV ?? "development") !== "production";
  const host = process.env.SMTP_HOST || (isDev ? "localhost" : requireEnv("SMTP_HOST"));
  const port = Number(process.env.SMTP_PORT || (isDev ? "1025" : requireEnv("SMTP_PORT")));
  const secure = (process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const user = process.env.SMTP_USER || (isDev ? "dev@localhost" : requireEnv("SMTP_USER"));
  const pass = process.env.SMTP_PASS || (isDev ? "dev" : requireEnv("SMTP_PASS"));
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || user;

  if (!Number.isFinite(port)) throw new Error("SMTP_PORT must be a number");
  return { host, port, secure, user, pass, from };
}
