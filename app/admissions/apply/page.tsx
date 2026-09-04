import { Metadata } from "next";
import Link from "next/link";
import SectionHeader from "@/components/SectionHeader";
import ApplicationForm from "@/components/ApplicationForm";

export const metadata: Metadata = {
  title: "Apply for Admission — Earlydays",
  description: "Start your child's admission application to Earlydays Nursery & Primary School.",
};

export default function ApplyPage() {
  return (
    <main className="py-20">
      <div className="wrap max-w-[640px]">
        <SectionHeader
          level={1}
          eyebrow="Admissions"
          title="Apply for admission"
          desc="Fill in a few details about your child and we'll follow up within a school day."
        />
        <ApplicationForm />
        <p className="text-[0.85rem] text-slate mt-5">
          Already applied?{" "}
          <Link href="/admissions/status" className="font-medium underline">
            Check your status
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
