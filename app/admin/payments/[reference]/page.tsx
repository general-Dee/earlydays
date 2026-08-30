import { Metadata } from "next";
import AdminReceiptPanel from "@/components/AdminReceiptPanel";

export const metadata: Metadata = {
  title: "Receipt — Earlydays Admin",
  description: "Staff view of a parent's fee payment receipt.",
};

export default function AdminPaymentReceiptPage({
  params,
  searchParams,
}: {
  params: { reference: string };
  searchParams: { uid?: string };
}) {
  return (
    <main className="py-20 bg-paper">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-6">Payment Receipt</h1>
        <AdminReceiptPanel reference={params.reference} uid={searchParams.uid ?? ""} />
      </div>
    </main>
  );
}
