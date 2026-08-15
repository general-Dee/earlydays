import { safetyPoints } from "@/lib/data";
import type { Icon } from "@phosphor-icons/react";
import { VideoCamera, CheckCircle, Key, PhoneCall } from "@phosphor-icons/react/ssr";

const ICONS: Record<string, Icon> = {
  "video-camera": VideoCamera,
  "check-circle": CheckCircle,
  key: Key,
  "phone-call": PhoneCall,
};

export default function SafetyGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {safetyPoints.map((s) => {
        const IconComponent = ICONS[s.icon];
        return (
          <div key={s.title} className="card p-7">
            <div className="w-11 h-11 rounded-lg bg-sun-soft text-accent-light flex items-center justify-center mb-4">
              <IconComponent size={22} weight="regular" />
            </div>
            <h4 className="font-display font-medium text-base mb-1.5 text-ink">{s.title}</h4>
            <p className="text-sm mb-0 text-ink/[0.78]">{s.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
