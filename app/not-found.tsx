import Link from "next/link";

export default function NotFound() {
  return (
    <main className="py-24 md:py-32 bg-paper">
      <div className="wrap text-center max-w-xl">
        <span className="eyebrow">404</span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink mb-4">
          This page wandered off
        </h1>
        <p className="text-slate mb-8">
          The page you&rsquo;re looking for doesn&rsquo;t exist, or it&rsquo;s moved. Let&rsquo;s get you back to somewhere useful.
        </p>
        <Link href="/" className="btn btn-primary justify-center">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
