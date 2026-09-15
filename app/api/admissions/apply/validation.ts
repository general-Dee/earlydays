import { z } from "zod";
import { stages } from "@/lib/data";

export const MAX_NOTES_LENGTH = 2000;
const VALID_STAGE_CODES = stages.map((s) => s.code);

const trimmed = () =>
  z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim());

export const admissionsApplySchema = z
  .object({
    childName: trimmed(),
    childDob: trimmed(),
    desiredStage: trimmed(),
    guardianName: trimmed(),
    email: trimmed(),
    phone: trimmed(),
    notes: trimmed(),
  })
  .superRefine((data, ctx) => {
    if (!data.childName || !data.childDob || !data.guardianName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Child's name, date of birth, and guardian name are required",
        path: ["childName"],
      });
      return;
    }
    if (!VALID_STAGE_CODES.includes(data.desiredStage)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a valid stage", path: ["desiredStage"] });
      return;
    }
    if (!data.email && !data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide an email or phone number so we can reply",
        path: ["email"],
      });
      return;
    }
    if (data.notes.length > MAX_NOTES_LENGTH) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Notes are too long", path: ["notes"] });
    }
  });

export type AdmissionsApplyInput = z.infer<typeof admissionsApplySchema>;
