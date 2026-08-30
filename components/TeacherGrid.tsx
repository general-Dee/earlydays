"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Staff } from "@/lib/firebase/types";

type LoadState = "loading" | "error" | "ready";

const AVATAR_COLORS = ["#423a6a", "#8a5a44", "#2f6b5e", "#a5473a"];

export default function TeacherGrid() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const snap = await getDocs(query(collection(getFirebaseDb(), COLLECTIONS.staff), orderBy("order", "asc")));

        if (cancelled) return;

        setStaff(snap.docs.map((d) => d.data() as Staff));
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return <p className="text-sm text-slate">Loading our team…</p>;
  }

  if (state === "error") {
    return (
      <div className="px-3.5 py-3 rounded-lg bg-clay-soft text-clay text-[0.85rem] font-semibold">
        Couldn&rsquo;t load our team. Please try again.
      </div>
    );
  }

  if (staff.length === 0) {
    return <p className="text-sm text-slate">Team profiles are coming soon.</p>;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {staff.map((member, index) => {
        const initials = member.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
        return (
          <div key={member.id} className="text-center">
            {member.photoUrl ? (
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-3.5">
                <Image src={member.photoUrl} alt={member.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
              </div>
            ) : (
              <div
                className="w-full aspect-square rounded-2xl flex items-center justify-center font-display font-semibold text-4xl text-white mb-3.5"
                style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
              >
                {initials}
              </div>
            )}
            <h4 className="font-display text-base mb-0.5">{member.name}</h4>
            <span className="text-sm text-slate">{member.role}</span>
            {member.bio && <p className="text-sm text-slate mt-1.5 mb-0">{member.bio}</p>}
          </div>
        );
      })}
    </div>
  );
}
