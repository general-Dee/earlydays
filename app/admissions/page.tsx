import { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import FeesTable from "@/components/FeesTable";
import ProspectusCard from "@/components/ProspectusCard";
import PayPanel from "@/components/PayPanel";
import Button from "@/components/Button";
import { waLink } from "@/lib/data";

export const metadata: Metadata = {
  title: "Admissions & Fees — Earlydays",
  description: "Termly fees by stage, prospectus download, and online fee payment.",
};

// Fees are admin-editable (see AdminDashboardOverview) — revalidate
// periodically so a price change shows up here without a redeploy.
export const revalidate = 300;

export default function AdmissionsPage() {
  return (
    <main>
      <section className="py-20 pb-0">
        <div className="wrap">
          <SectionHeader
            level={1}
            eyebrow="Admissions"
            title="Start your child's journey at Earlydays"
            desc="Apply online in a few minutes — we'll follow up within a school day."
          />
          <div className="flex gap-3.5 flex-wrap">
            <Button href="/admissions/apply">Start Application →</Button>
            <Button href={waLink("Hi, I'd like to ask a few questions before applying")} variant="ghost" external>
              Ask on WhatsApp First
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="wrap">
          <SectionHeader
            eyebrow="Admissions"
            title="Fees by stage"
            desc="Termly figures shown in Naira."
          />
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.8fr] gap-10">
            <FeesTable />
            <ProspectusCard />
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="wrap">
          <PayPanel />
        </div>
      </section>
    </main>
  );
}
