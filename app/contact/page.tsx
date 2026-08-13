import { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import Button from "@/components/Button";
import { site, waLink } from "@/lib/data";

export const metadata: Metadata = {
  title: "Contact — Earlydays",
  description: "Reach Earlydays Nursery & Primary School in Kaduna by WhatsApp, phone, or email.",
};

export default function ContactPage() {
  return (
    <main className="py-20">
      <div className="wrap max-w-[640px]">
        <SectionHeader
          eyebrow="Get in Touch"
          title="We'd love to show you around"
          desc="The fastest way to reach us is WhatsApp — most inquiries get a same-day reply."
        />

        <div className="card p-8 space-y-5">
          <div>
            <span className="font-mono text-[0.7rem] uppercase text-slate">WhatsApp</span>
            <p className="text-lg font-semibold mb-0">{site.phone}</p>
          </div>
          <div>
            <span className="font-mono text-[0.7rem] uppercase text-slate">Phone</span>
            <p className="text-lg font-semibold mb-0">{site.phone}</p>
          </div>
          <div>
            <span className="font-mono text-[0.7rem] uppercase text-slate">Email</span>
            <p className="text-lg font-semibold mb-0">{site.email}</p>
          </div>
          <div>
            <span className="font-mono text-[0.7rem] uppercase text-slate">Location</span>
            <p className="text-lg font-semibold mb-0">{site.location}</p>
          </div>

          <div className="flex gap-3 flex-wrap pt-2">
            <Button href={waLink("Hi, I'd like to book a tour for my child")} external>
              📲 Chat on WhatsApp
            </Button>
            <Button href={`tel:${site.phone.replace(/\s/g, "")}`} variant="ghost">
              Call the Office
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
