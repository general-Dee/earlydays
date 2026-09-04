export default function SectionHeader({
  eyebrow,
  title,
  desc,
  center = false,
  level = 2,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  center?: boolean;
  // Pages where this is the sole top-of-page heading should pass level={1}
  // so the page has a real <h1> — defaults to 2 for secondary sections.
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";

  return (
    <div className={`section-head ${center ? "mx-auto text-center" : ""}`}>
      <span className="eyebrow">{eyebrow}</span>
      <Heading className="font-display font-semibold text-3xl md:text-4xl leading-tight text-ink">
        {title}
      </Heading>
      {desc && <p className="mt-3 text-ink-soft">{desc}</p>}
    </div>
  );
}
