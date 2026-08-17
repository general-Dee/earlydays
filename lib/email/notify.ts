import { Resend } from "resend";
import { stages } from "@/lib/data";
import { getFeeKobo } from "@/lib/fees";
import type { ApplicationStatus } from "@/lib/firebase/types";

function stageLabel(code: string): string {
  return stages.find((s) => s.code === code)?.name ?? code;
}

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

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !from) return false;

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: application.email,
    subject: content.subject,
    text: content.text,
  });

  return true;
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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !from) return false;

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: parent.email,
    subject: `Payment received for ${payment.childName}`,
    text: [
      `Hi ${parent.guardianName},`,
      "",
      `We've received your ${payment.term} fee payment of ${formatNaira(payment.amountKobo)} for ${payment.childName}. Thank you!`,
      "",
      `Reference: ${payment.reference}`,
      "",
      "Keep this email for your records.",
      "",
      "Warmly,",
      "The Earlydays Team",
    ].join("\n"),
  });

  return true;
}

type UnpaidChild = {
  name: string;
  stage: string;
};

export async function sendFeeReminderEmail(
  parent: { guardianName: string; email: string },
  unpaidChildren: UnpaidChild[],
  term: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !from || unpaidChildren.length === 0) return false;

  const resend = new Resend(apiKey);

  const childList = unpaidChildren
    .map((c) => {
      let amount: string;
      try {
        amount = formatNaira(getFeeKobo(c.stage));
      } catch {
        amount = "contact the school for the fee amount";
      }
      return `- ${c.name} (${stageLabel(c.stage)}): ${amount}`;
    })
    .join("\n");

  await resend.emails.send({
    from,
    to: parent.email,
    subject: `${term} fee reminder`,
    text: [
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
    ].join("\n"),
  });

  return true;
}
