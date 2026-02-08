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
  const host = requireEnv("SMTP_HOST");
  const port = Number(requireEnv("SMTP_PORT"));
  const secure = (process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || user;

  if (!Number.isFinite(port)) throw new Error("SMTP_PORT must be a number");
  return { host, port, secure, user, pass, from };
}
