import { Metadata } from "next";
import PortalReceiptPanel from "@/components/PortalReceiptPanel";

export const metadata: Metadata = {
  title: "Receipt — Earlydays Portal",
  description: "View or print your fee payment receipt.",
};

export default function PortalReceiptPage({ params }: { params: { reference: string } }) {
  return (
    <main className="py-20">
      <div className="wrap">
        <span className="eyebrow">Parent Portal</span>
        <h1 className="font-display font-medium text-3xl md:text-4xl text-ink mb-6">Payment Receipt</h1>
        <PortalReceiptPanel reference={params.reference} />
      </div>
    </main>
  );
}
