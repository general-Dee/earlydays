import { teachers } from "@/lib/data";

export default function TeacherGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {teachers.map((t) => {
        const initials = t.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
        return (
          <div key={t.name} className="text-center">
            <div
              className="w-full aspect-square rounded-2xl flex items-center justify-center font-display font-semibold text-4xl text-white mb-3.5"
              style={{ background: t.color }}
            >
              {initials}
            </div>
            <h4 className="font-display text-base mb-0.5">{t.name}</h4>
            <span className="text-sm text-slate">{t.role}</span>
          </div>
        );
      })}
    </div>
  );
}
