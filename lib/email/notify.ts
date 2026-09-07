import { Resend } from "resend";
import { site, stages } from "@/lib/data";
import type { ApplicationStatus, EventRsvp } from "@/lib/firebase/types";

function stageLabel(code: string): string {
  return stages.find((s) => s.code === code)?.name ?? code;
}

// Lazy on purpose: constructing the Resend client eagerly at module load
// would run during Next.js's build-time route collection, which shouldn't
// depend on runtime secrets being present.
//
// Shared core for every outbound email below. Returns false (a no-op, not a
// throw) when Resend isn't configured, so every caller's existing "did this
// actually send" checks keep working unchanged.
async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !from) return false;

  const resend = new Resend(apiKey);
  await resend.emails.send({ from, to, subject, text });

  return true;
}

// Same as sendEmail, but for the three "notify the school" senders below,
// whose recipient is CONTACT_NOTIFY_EMAIL rather than a parent's address.
async function sendSchoolNotification(subject: string, text: string): Promise<void> {
  const to = process.env.CONTACT_NOTIFY_EMAIL;
  if (!to) return;

  await sendEmail(to, subject, text);
}

type ContactInquiry = {
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
};

export async function sendContactNotification(inquiry: ContactInquiry) {
  await sendSchoolNotification(
    `New inquiry from ${inquiry.name}`,
    [
      `Name: ${inquiry.name}`,
      `Email: ${inquiry.email ?? "—"}`,
      `Phone: ${inquiry.phone ?? "—"}`,
      "",
      inquiry.message,
    ].join("\n")
  );
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
  await sendSchoolNotification(
    `New admission application: ${application.childName}`,
    [
      `Child: ${application.childName} (DOB: ${application.childDob})`,
      `Desired stage: ${application.desiredStage}`,
      `Guardian: ${application.guardianName}`,
      `Email: ${application.email ?? "—"}`,
      `Phone: ${application.phone ?? "—"}`,
      "",
      application.notes || "(no additional notes)",
    ].join("\n")
  );
}

export async function sendRsvpNotification(eventTitle: string, rsvp: EventRsvp) {
  await sendSchoolNotification(
    `New RSVP for ${eventTitle}`,
    [
      `Event: ${eventTitle}`,
      `Name: ${rsvp.name}`,
      `Email: ${rsvp.email}`,
      `Phone: ${rsvp.phone ?? "—"}`,
      `Guests: ${rsvp.guestCount}`,
    ].join("\n")
  );
}

type ParentInvite = {
  guardianName: string;
  email: string;
};

export async function sendParentInviteEmail(parent: ParentInvite, resetLink: string): Promise<boolean> {
  return sendEmail(
    parent.email,
    "Your Earlydays parent portal account",
    [
      `Hi ${parent.guardianName},`,
      "",
      "The school has set up your Earlydays parent portal account. Use the link below to set your password and log in:",
      "",
      resetLink,
      "",
      "This link expires in 1 hour. If it has expired, use \"Forgot password\" on the portal login page instead.",
    ].join("\n")
  );
}

type AdminInvite = { displayName: string; email: string };

export async function sendAdminInviteEmail(admin: AdminInvite, resetLink: string): Promise<boolean> {
  return sendEmail(
    admin.email,
    "Your Earlydays admin account",
    [
      `Hi ${admin.displayName},`,
      "",
      "You've been added as an Earlydays admin. Use the link below to set your password and log in:",
      "",
      resetLink,
      "",
      "This link expires in 1 hour. If it has expired, use \"Forgot password\" on the admin login page instead.",
    ].join("\n")
  );
}

type ApplicationStatusUpdate = {
  guardianName: string;
  childName: string;
  desiredStage: string;
  email: string | null;
};

function statusEmailContent(
  status: ApplicationStatus,
  application: ApplicationStatusUpdate
): { subject: string; text: string } | null {
  const stage = stageLabel(application.desiredStage);

  switch (status) {
    case "accepted":
      return {
        subject: `Great news about ${application.childName}'s application`,
        text: [
          `Hi ${application.guardianName},`,
          "",
          `We're delighted to let you know that ${application.childName}'s application for ${stage} at Earlydays has been accepted.`,
          "",
          "Our admissions team will be in touch shortly with next steps, including enrollment paperwork and payment details.",
          "",
          "Warmly,",
          "The Earlydays Admissions Team",
        ].join("\n"),
      };
    case "waitlisted":
      return {
        subject: `Update on ${application.childName}'s application`,
        text: [
          `Hi ${application.guardianName},`,
          "",
          `Thank you for your patience while we reviewed ${application.childName}'s application for ${stage}.`,
          "",
          `At this time, ${application.childName} has been placed on our waitlist. We'll reach out as soon as a place becomes available.`,
          "",
          "Warmly,",
          "The Earlydays Admissions Team",
        ].join("\n"),
      };
    case "declined":
      return {
        subject: `Update on ${application.childName}'s application`,
        text: [
          `Hi ${application.guardianName},`,
          "",
          `Thank you for your interest in Earlydays and for applying for ${application.childName} to join our ${stage} program.`,
          "",
          "After careful review, we're unable to offer a place at this time. We appreciate your interest and wish your family all the best.",
          "",
          "Warmly,",
          "The Earlydays Admissions Team",
        ].join("\n"),
      };
    default:
      return null;
  }
}

export async function sendApplicationStatusEmail(
  application: ApplicationStatusUpdate,
  status: ApplicationStatus
): Promise<boolean> {
  const content = statusEmailContent(status, application);
  if (!content || !application.email) return false;

  return sendEmail(application.email, content.subject, content.text);
}

type ApplicationConfirmation = {
  guardianName: string;
  email: string;
  childName: string;
};

export async function sendApplicationConfirmationEmail(
  application: ApplicationConfirmation,
  referenceCode: string
): Promise<boolean> {
  return sendEmail(
    application.email,
    `Application received for ${application.childName}`,
    [
      `Hi ${application.guardianName},`,
      "",
      `We've received ${application.childName}'s application. Our admissions team will follow up within a school day.`,
      "",
      `Your reference code: ${referenceCode}`,
      "",
      `Check your application status anytime at: ${site.url}/admissions/status`,
      "",
      "Keep this email for your records.",
      "",
      "Warmly,",
      "The Earlydays Admissions Team",
    ].join("\n")
  );
}

function formatNaira(amountKobo: number): string {
  return `₦${(amountKobo / 100).toLocaleString("en-NG")}`;
}

type PaymentReceipt = {
  childName: string;
  term: string;
  amountKobo: number;
  reference: string;
};

export async function sendPaymentReceiptEmail(
  parent: { guardianName: string; email: string },
  payment: PaymentReceipt
): Promise<boolean> {
  return sendEmail(
    parent.email,
    `Payment received for ${payment.childName}`,
    [
      `Hi ${parent.guardianName},`,
      "",
      `We've received your ${payment.term} fee payment of ${formatNaira(payment.amountKobo)} for ${payment.childName}. Thank you!`,
      "",
      `Reference: ${payment.reference}`,
      "",
      `View or print your receipt: ${site.url}/portal/receipts/${payment.reference}`,
      "",
      "Keep this email for your records.",
      "",
      "Warmly,",
      "The Earlydays Team",
    ].join("\n")
  );
}

type UnpaidChild = {
  name: string;
  stage: string;
};

export async function sendFeeReminderEmail(
  parent: { guardianName: string; email: string },
  unpaidChildren: UnpaidChild[],
  term: string,
  feesByStage: Record<string, number>
): Promise<boolean> {
  if (unpaidChildren.length === 0) return false;

  const childList = unpaidChildren
    .map((c) => {
      const amountKobo = feesByStage[c.stage];
      const amount = typeof amountKobo === "number" ? formatNaira(amountKobo) : "contact the school for the fee amount";
      return `- ${c.name} (${stageLabel(c.stage)}): ${amount}`;
    })
    .join("\n");

  return sendEmail(
    parent.email,
    `${term} fee reminder`,
    [
      `Hi ${parent.guardianName},`,
      "",
      `This is a friendly reminder that ${term} fees are still outstanding for:`,
      "",
      childList,
      "",
      "You can pay securely through the parent portal.",
      "",
      "If you've already paid, please disregard this message.",
      "",
      "Warmly,",
      "The Earlydays Team",
    ].join("\n")
  );
}

export async function sendNewReportEmail(
  parent: { guardianName: string; email: string },
  report: { childName: string; term: string }
): Promise<boolean> {
  return sendEmail(
    parent.email,
    `New ${report.term} report for ${report.childName}`,
    [
      `Hi ${parent.guardianName},`,
      "",
      `A new ${report.term} progress report for ${report.childName} is now available in the parent portal.`,
      "",
      `View it here: ${site.url}/portal`,
      "",
      "Warmly,",
      "The Earlydays Team",
    ].join("\n")
  );
}

export async function sendNewAnnouncementEmail(
  parent: { guardianName: string; email: string },
  announcement: { title: string; body: string }
): Promise<boolean> {
  return sendEmail(
    parent.email,
    `New announcement: ${announcement.title}`,
    [
      `Hi ${parent.guardianName},`,
      "",
      announcement.title,
      "",
      announcement.body,
      "",
      `View it in the parent portal: ${site.url}/portal`,
      "",
      "Warmly,",
      "The Earlydays Team",
    ].join("\n")
  );
}
