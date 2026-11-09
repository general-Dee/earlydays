import { Metadata } from "next";
import SectionHeader from "@/components/SectionHeader";
import Button from "@/components/Button";
import ContactForm from "@/components/ContactForm";
import { site, waLink } from "@/lib/data";
import { getSiteSettings } from "@/lib/siteSettings";

export const metadata: Metadata = {
  title: "Contact — Earlydays",
  description: "Reach Earlydays Nursery & Primary School in Kaduna by WhatsApp, phone, or email.",
};

export default async function ContactPage() {
  const { whatsapp, phone, email } = await getSiteSettings();

  return (
    <main className="py-20">
      <div className="wrap max-w-[640px]">
        <SectionHeader
          level={1}
          eyebrow="Get in Touch"
          title="We'd love to show you around"
          desc={whatsapp ? "The fastest way to reach us is WhatsApp — most inquiries get a same-day reply." : undefined}
        />

        <div className="card p-8 space-y-5">
          {whatsapp && (
            <div>
              <span className="font-mono text-[0.7rem] uppercase text-slate">WhatsApp</span>
              <p className="text-lg font-medium mb-0 text-ink">{phone || `+${whatsapp.replace(/^\+/, "")}`}</p>
            </div>
          )}
          {phone && (
            <div>
              <span className="font-mono text-[0.7rem] uppercase text-slate">Phone</span>
              <p className="text-lg font-medium mb-0 text-ink">{phone}</p>
            </div>
          )}
          {email && (
            <div>
              <span className="font-mono text-[0.7rem] uppercase text-slate">Email</span>
              <p className="text-lg font-medium mb-0 text-ink">
                <a href={`mailto:${email}`}>{email}</a>
              </p>
            </div>
          )}
          <div>
            <span className="font-mono text-[0.7rem] uppercase text-slate">Location</span>
            <p className="text-lg font-medium mb-0 text-ink">{site.location}</p>
          </div>

          {(whatsapp || phone) && (
            <div className="flex gap-3 flex-wrap pt-2">
              {whatsapp && (
                <Button href={waLink(whatsapp, "Hi, I'd like to book a tour for my child")} external>
                  Chat on WhatsApp
                </Button>
              )}
              {phone && (
                <Button href={`tel:${phone.replace(/\s/g, "")}`} variant="ghost">
                  Call the Office
                </Button>
              )}
            </div>
          )}
        </div>

        <ContactForm />
      </div>
    </main>
  );
}
