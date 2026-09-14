"use client";

export default function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!message) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 px-4"
    >
      <div className="card p-6 max-w-sm w-full">
        <p className="text-sm mb-5">{message}</p>
        <div className="flex justify-end gap-2.5">
          <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="btn btn-clay btn-sm">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
