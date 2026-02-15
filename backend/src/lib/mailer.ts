import nodemailer, { type SentMessageInfo, type Transporter } from "nodemailer";
import { getMailConfig } from "../config/mail";

export type SendMailArgs = {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html?: string;
};

export type MailSendResult = {
  messageId?: string;
  response?: string;
  accepted?: string[];
  rejected?: string[];
};

let transporter: Transporter | null = null;
let verifyPromise: Promise<void> | null = null;
let cachedConfig: ReturnType<typeof getMailConfig> | null = null;

function startVerify(nextTransporter: Transporter, cfg: ReturnType<typeof getMailConfig>) {
  if (verifyPromise) return verifyPromise;
  verifyPromise = nextTransporter
    .verify()
    .then(() => {
      console.log(`[SMTP VERIFY OK] host=${cfg.host} port=${cfg.port} secure=${cfg.secure}`);
    })
    .catch((err: unknown) => {
      console.error(`[SMTP VERIFY FAIL] host=${cfg.host} port=${cfg.port} secure=${cfg.secure}`);
      console.error(err);
    });
  return verifyPromise;
}

function getTransporter() {
  if (!transporter) {
    const cfg = getMailConfig();
    cachedConfig = cfg;
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass }
    });
    startVerify(transporter, cfg);
  }
  return transporter;
}

function sanitizeInfo(info: SentMessageInfo): MailSendResult {
  const anyInfo = info as any;
  const accepted = Array.isArray(anyInfo.accepted) ? anyInfo.accepted.map(String) : undefined;
  const rejected = Array.isArray(anyInfo.rejected) ? anyInfo.rejected.map(String) : undefined;
  return {
    messageId: anyInfo.messageId ? String(anyInfo.messageId) : undefined,
    response: anyInfo.response ? String(anyInfo.response) : undefined,
    accepted,
    rejected
  };
}

export async function sendMail(args: SendMailArgs): Promise<MailSendResult> {
  const cfg = cachedConfig ?? getMailConfig();
  const ts = new Date().toISOString();
  console.log(`[SMTP SEND] ts=${ts} to=${args.to} subject="${args.subject}"`);

  // Keep existing dev behaviour unless you explicitly run NODE_ENV=production.
  if ((process.env.NODE_ENV ?? "development") !== "production") {
    console.log(`[SMTP SEND SKIP] ts=${ts} to=${args.to} subject="${args.subject}"`);
    return { messageId: `dev-noop-${Date.now()}`, accepted: [args.to], rejected: [] };
  }

  const mailer = getTransporter();
  if (verifyPromise) await verifyPromise;

  try {
    const info = await mailer.sendMail({
      from: args.from ?? cfg.from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html
    });

    const result = sanitizeInfo(info);
    console.log(
      `[SMTP SENT] messageId=${result.messageId ?? ""} response=${result.response ?? ""} accepted=${(result.accepted ?? []).join(",")} rejected=${(result.rejected ?? []).join(",")}`
    );
    return result;
  } catch (err) {
    console.error(`[SMTP ERROR] to=${args.to} subject="${args.subject}"`);
    console.error(err);
    throw err;
  }
}
