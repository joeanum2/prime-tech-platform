import "dotenv/config";
import { sendMail } from "../lib/mailer";

async function main() {
  const to = process.env.SMTP_TEST_TO || process.env.SMTP_USER;
  if (!to) throw new Error("Set SMTP_TEST_TO or SMTP_USER");

  const result = await sendMail({
    to,
    subject: "Prime Tech SMTP Test",
    text: "SMTP is configured correctly."
  });

  console.log("SMTP OK:", result);
}

main().catch((e) => {
  console.error("SMTP FAIL:", e);
  process.exit(1);
});
