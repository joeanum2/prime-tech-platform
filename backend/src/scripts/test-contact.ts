type ContactResponse = {
  ok: boolean;
  id?: string;
  status?: string;
};

async function run() {
  const base = (process.env.API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
  const payload = {
    fullName: "Integration Test",
    email: "integration.test@example.com",
    subject: "Contact API integration check",
    message: "This is an automated integration test message."
  };

  const res = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const json = (await res.json()) as ContactResponse;
  if (!res.ok || !json.ok) {
    console.error("Contact integration test failed:", { status: res.status, body: json });
    process.exit(1);
  }

  console.log("Contact integration test passed:", { id: json.id, status: json.status });
}

run().catch((err) => {
  console.error("Contact integration test crashed:", err);
  process.exit(1);
});
