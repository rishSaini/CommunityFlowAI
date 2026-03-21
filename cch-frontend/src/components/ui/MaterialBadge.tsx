import {
  Utensils, ShieldCheck, Heart, Activity, Smile, Leaf, UserCheck, Package,
} from "lucide-react";

/**
 * Canonical material → icon + color mapping.
 * Mirrors the NEEDS list from PartnerIntakeForm so materials look
 * identical everywhere they appear (tasks, briefs, feed, detail modal).
 */
const MATERIAL_MAP: Record<string, { icon: React.ReactNode; color: string }> = {
  "Nutrition Toolkits":       { icon: <Utensils    size={10} />, color: "bg-orange-50  text-orange-700 border-orange-200" },
  "Vaccine Info Packets":     { icon: <ShieldCheck size={10} />, color: "bg-blue-50    text-blue-700   border-blue-200"   },
  "Mental Health Resources":  { icon: <Heart       size={10} />, color: "bg-pink-50    text-pink-700   border-pink-200"   },
  "Diabetes Prevention Kits": { icon: <Activity    size={10} />, color: "bg-red-50     text-red-700    border-red-200"    },
  "Dental Health Kits":       { icon: <Smile       size={10} />, color: "bg-cyan-50    text-cyan-700   border-cyan-200"   },
  "Substance Abuse Toolkits": { icon: <Leaf        size={10} />, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "On-site Staff":            { icon: <UserCheck   size={10} />, color: "bg-violet-50  text-violet-700 border-violet-200" },
};

const FALLBACK = { icon: <Package size={10} />, color: "bg-sage-50 text-sage-700 border-sage-200" };

interface Props {
  name: string;
  size?: "sm" | "md";
}

export default function MaterialBadge({ name, size = "sm" }: Props) {
  const cfg = MATERIAL_MAP[name] ?? FALLBACK;
  const textSize = size === "sm" ? "text-[10px]" : "text-[11px]";
  const padding  = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";

  return (
    <span className={`inline-flex items-center gap-1 ${textSize} ${padding} rounded-full border font-medium ${cfg.color}`}>
      {cfg.icon}
      {name}
    </span>
  );
}

/** Utility: list of all known material names for autocomplete / validation */
export const MATERIAL_NAMES = Object.keys(MATERIAL_MAP);
