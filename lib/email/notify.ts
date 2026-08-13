import { Resend } from "resend";

type ContactInquiry = {
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
};

// Lazy on purpose, same reasoning as lib/firebase/admin.ts: constructing the
// client eagerly at module load would run during Next.js's build-time route
// collection, which shouldn't depend on runtime secrets being present.
export async function sendContactNotification(inquiry: ContactInquiry) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFY_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) return;

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to,
    subject: `New inquiry from ${inquiry.name}`,
    text: [
      `Name: ${inquiry.name}`,
      `Email: ${inquiry.email ?? "—"}`,
      `Phone: ${inquiry.phone ?? "—"}`,
      "",
      inquiry.message,
    ].join("\n"),
  });
}
