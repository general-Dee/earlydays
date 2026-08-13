import { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import FeesTable from "@/components/FeesTable";
import ProspectusCard from "@/components/ProspectusCard";
import PayPanel from "@/components/PayPanel";

export const metadata: Metadata = {
  title: "Admissions & Fees — Earlydays",
  description: "Termly fees by stage, prospectus download, and online fee payment.",
};

export default function AdmissionsPage() {
  return (
    <main>
      <section className="py-20">
        <div className="wrap">
          <SectionHeader
            eyebrow="Admissions"
            title="Fees by stage"
            desc="Sample termly figures shown in Naira — replace with your confirmed fee schedule."
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
