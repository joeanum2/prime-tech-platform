import "dotenv/config";
import { sendMail } from "../lib/mailer";

async function main() {
  const to = process.env.CONTACT_TO || "bookings@joetechx.co.uk";
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "bookings@joetechx.co.uk";

  const info = await sendMail({
    to,
    from: `Prime Tech Services <${from}>`,
    subject: "[TEST] Contact mail routing check",
    text: "If you received this, CONTACT_TO routing is working."
  });

  console.log("OK", info);
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
