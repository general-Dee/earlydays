"use client";

import { useCallback, useState } from "react";

type ConfirmRequest = {
  message: string;
  resolve: (value: boolean) => void;
} | null;

// Promise-based confirmation, paired with <ConfirmDialog /> for the actual
// modal markup. Lets a delete handler do `if (!(await confirm("..."))) return;`
// instead of the browser's unstyleable window.confirm.
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest>(null);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ message, resolve });
    });
  }, []);

  function respond(value: boolean) {
    request?.resolve(value);
    setRequest(null);
  }

  return { confirmMessage: request?.message ?? null, confirm, respond };
}
