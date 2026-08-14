"use client";

import { useEffect, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { Inquiry, InquiryStatus } from "@/lib/firebase/types";

type LoadState = "loading" | "forbidden" | "error" | "ready";

const STATUS_OPTIONS: InquiryStatus[] = ["new", "contacted", "resolved"];

const statusStyle: Record<InquiryStatus, string> = {
  new: "bg-sun-soft text-clay",
  contacted: "bg-leaf-soft text-leaf",
  resolved: "bg-chalk text-slate",
};

export default function AdminInquiriesList({ user }: { user: User }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateStatus(id: string, status: InquiryStatus) {
    const previous = inquiries;
    setUpdatingId(id);
    setInquiries((current) => current.map((inquiry) => (inquiry.id === id ? { ...inquiry, status } : inquiry)));

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        setInquiries(previous);
      }
    } catch {
      setInquiries(previous);
    } finally {
      setUpdatingId(null);
    }
  }

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
              <div className="flex items-center gap-2.5 mt-2.5">
                <span className={`text-[0.7rem] font-bold px-2.5 py-1 rounded-full ${statusStyle[inquiry.status]}`}>
                  {inquiry.status}
                </span>
                <select
                  aria-label={`Status for ${inquiry.name}`}
                  value={inquiry.status}
                  disabled={updatingId === inquiry.id}
                  onChange={(e) => updateStatus(inquiry.id, e.target.value as InquiryStatus)}
                  className="text-xs rounded-md border border-slate/20 bg-white px-2 py-1"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
