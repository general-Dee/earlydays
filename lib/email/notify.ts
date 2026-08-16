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

type ApplicationSubmission = {
  childName: string;
  childDob: string;
  desiredStage: string;
  guardianName: string;
  email: string | null;
  phone: string | null;
  notes: string;
};

export async function sendApplicationNotification(application: ApplicationSubmission) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFY_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) return;

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to,
    subject: `New admission application: ${application.childName}`,
    text: [
      `Child: ${application.childName} (DOB: ${application.childDob})`,
      `Desired stage: ${application.desiredStage}`,
      `Guardian: ${application.guardianName}`,
      `Email: ${application.email ?? "—"}`,
      `Phone: ${application.phone ?? "—"}`,
      "",
      application.notes || "(no additional notes)",
    ].join("\n"),
  });
}

type ParentInvite = {
  guardianName: string;
  email: string;
};

export async function sendParentInviteEmail(parent: ParentInvite, resetLink: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !from) return false;

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: parent.email,
    subject: "Your Earlydays parent portal account",
    text: [
      `Hi ${parent.guardianName},`,
      "",
      "The school has set up your Earlydays parent portal account. Use the link below to set your password and log in:",
      "",
      resetLink,
      "",
      "This link expires in 1 hour. If it has expired, use \"Forgot password\" on the portal login page instead.",
    ].join("\n"),
  });

  return true;
}
