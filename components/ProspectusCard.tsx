import { waLink } from "@/lib/data";

export default function ProspectusCard() {
  return (
    <div className="bg-ground-card border border-line rounded-card p-8 flex flex-col justify-between">
      <div>
        <h4 className="font-display font-medium text-ink text-xl mb-1.5">Get the full prospectus</h4>
        <p className="text-ink/[0.72] text-sm mb-0">
          Curriculum, daily schedule, uniform list, and full fee breakdown in one PDF.
        </p>
      </div>
      {/* TODO: replace href with a real prospectus PDF, e.g. /prospectus.pdf in /public */}
      <a href="/prospectus.pdf" className="btn btn-primary btn-sm mt-5 justify-center">
        Download Prospectus
      </a>
      <a
        href={waLink("Hi, I'd like to start an admission inquiry")}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost btn-sm mt-2.5 justify-center"
      >
        Start Inquiry on WhatsApp
      </a>
    </div>
  );
}
