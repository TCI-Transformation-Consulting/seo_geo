declare module "lucide-react" {
  import * as React from "react";

  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    absoluteStrokeWidth?: boolean;
  }
  export type LucideIcon = (props: LucideProps) => JSX.Element;

  // Icons used in the project
  export const Search: LucideIcon;
  export const Loader2: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const Globe: LucideIcon;
  export const Package: LucideIcon;
  export const Sparkles: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const Zap: LucideIcon;
  export const Briefcase: LucideIcon;
  export const Bot: LucideIcon;
  export const FileCode: LucideIcon;
  export const Shield: LucideIcon;
  export const Rss: LucideIcon;
  export const Settings: LucideIcon;
  export const FileJson: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const XCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const Download: LucideIcon;
  export const Copy: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Users: LucideIcon;
  export const Trophy: LucideIcon;
  export const Target: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Swords: LucideIcon;
  export const Crown: LucideIcon;
  export const Play: LucideIcon;
  export const Eye: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Brain: LucideIcon;
  export const MessageCircleQuestion: LucideIcon;
  export const MapPin: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Lightbulb: LucideIcon;
  export const Hash: LucideIcon;
  export const Building: LucideIcon;
  export const Phone: LucideIcon;
  export const Mail: LucideIcon;
  export const Tag: LucideIcon;
  export const Award: LucideIcon;
  export const Info: LucideIcon;
  export const ArrowUp: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowDown: LucideIcon;
  export const Layers: LucideIcon;
}
