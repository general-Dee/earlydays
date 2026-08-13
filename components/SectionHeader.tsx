export default function SectionHeader({
  eyebrow,
  title,
  desc,
  center = false,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  center?: boolean;
}) {
  return (
    <div className={`section-head ${center ? "mx-auto text-center" : ""}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="font-display font-semibold text-3xl md:text-4xl leading-tight text-ink">
        {title}
      </h2>
      {desc && <p className="mt-3 text-ink-soft">{desc}</p>}
    </div>
  );
}
