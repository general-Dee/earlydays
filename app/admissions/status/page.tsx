import { Metadata } from "next";
import Link from "next/link";
import SectionHeader from "@/components/SectionHeader";
import ApplicationStatusForm from "@/components/ApplicationStatusForm";

export const metadata: Metadata = {
  title: "Check Application Status — Earlydays",
  description: "Look up the status of your child's admission application to Earlydays.",
};

export default function ApplicationStatusPage() {
  return (
    <main className="py-20">
      <div className="wrap max-w-[640px]">
        <SectionHeader
          eyebrow="Admissions"
          title="Check your application status"
          desc="Enter the reference code from your application confirmation."
        />
        <ApplicationStatusForm />
        <p className="text-[0.85rem] text-slate mt-5">
          Haven&rsquo;t applied yet?{" "}
          <Link href="/admissions/apply" className="font-medium underline">
            Apply here
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
