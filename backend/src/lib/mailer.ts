import { getMailConfig } from "../config/mail";

export async function sendMail(args: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const cfg = getMailConfig();

  if ((process.env.NODE_ENV ?? "development") !== "production") {
    return { messageId: `dev-noop-${Date.now()}` };
  }

  throw new Error(`SMTP transport is not available. Failed to send to ${args.to} from ${cfg.from}`);
}
