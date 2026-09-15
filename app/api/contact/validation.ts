import { z } from "zod";

export const MAX_MESSAGE_LENGTH = 2000;

const trimmed = () =>
  z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim());

export const contactSchema = z
  .object({
    name: trimmed(),
    email: trimmed(),
    phone: trimmed(),
    message: trimmed(),
  })
  .superRefine((data, ctx) => {
    if (!data.name || !data.message) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Name and message are required", path: ["name"] });
      return;
    }
    if (data.message.length > MAX_MESSAGE_LENGTH) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Message is too long", path: ["message"] });
      return;
    }
    if (!data.email && !data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide an email or phone number so we can reply",
        path: ["email"],
      });
    }
  });

export type ContactInput = z.infer<typeof contactSchema>;
