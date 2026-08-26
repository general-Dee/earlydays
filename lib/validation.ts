export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

type RequiredStringOptions = {
  label: string;
  maxLength: number;
  pattern?: { regex: RegExp; message: string };
};

export function validateRequiredString(
  value: string | undefined,
  options: RequiredStringOptions
): ValidationResult<string> {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { ok: false, error: `${options.label} is required` };
  if (trimmed.length > options.maxLength) return { ok: false, error: `${options.label} is too long` };
  if (options.pattern && !options.pattern.regex.test(trimmed)) {
    return { ok: false, error: options.pattern.message };
  }
  return { ok: true, value: trimmed };
}
