"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="py-24 md:py-32 bg-paper">
      <div className="wrap text-center max-w-xl">
        <span className="eyebrow">Something went wrong</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-4">
          We hit a snag loading this page
        </h1>
        <p className="text-slate mb-8">
          Try again, or head back to the homepage. If this keeps happening, reach us on WhatsApp.
        </p>
        <button onClick={() => reset()} className="btn btn-primary justify-center">
          Try Again
        </button>
      </div>
    </main>
  );
}
