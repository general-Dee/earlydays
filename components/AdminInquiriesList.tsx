"use client";

import { useEffect, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { Inquiry } from "@/lib/firebase/types";

type LoadState = "loading" | "forbidden" | "error" | "ready";

export default function AdminInquiriesList({ user }: { user: User }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/inquiries", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (cancelled) return;

        if (res.status === 403) {
          setState("forbidden");
          return;
        }
        if (!res.ok) {
          setState("error");
          return;
        }

        const data = (await res.json()) as { inquiries: Inquiry[] };
        setInquiries(data.inquiries);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="card p-8 md:p-9 shadow-[0_20px_50px_-30px_rgba(22,33,62,0.3)]">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h4 className="font-display text-xl mb-0.5">Inquiries</h4>
          <p className="text-[0.85rem] text-slate">{user.email}</p>
        </div>
        <button onClick={() => signOut(getFirebaseAuth())} className="btn btn-ghost btn-sm">
          Log Out
        </button>
      </div>

      {state === "loading" && <p className="text-sm text-slate mt-5">Loading inquiries…</p>}

      {state === "forbidden" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-sun-soft text-clay text-[0.85rem] font-semibold">
          You&rsquo;re logged in, but this account isn&rsquo;t authorized to view inquiries.
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
          Couldn&rsquo;t load inquiries. Please try again.
        </div>
      )}

      {state === "ready" && inquiries.length === 0 && (
        <p className="text-sm text-slate mt-5">No inquiries yet.</p>
      )}

      {state === "ready" && inquiries.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-5">
          {inquiries.map((inquiry) => (
            <li key={inquiry.id} className="px-3.5 py-3 rounded-lg bg-chalk">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{inquiry.name}</span>
                <span className="text-xs text-slate">{new Date(inquiry.createdAt).toLocaleString("en-NG")}</span>
              </div>
              <div className="text-xs text-slate mt-0.5">
                {[inquiry.email, inquiry.phone].filter(Boolean).join(" · ") || "No contact info given"}
              </div>
              <p className="text-sm mt-2 mb-0">{inquiry.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
