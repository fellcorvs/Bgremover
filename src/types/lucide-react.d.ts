declare module "lucide-react" {
  import { FC, SVGProps, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface LucideProps extends Partial<SVGProps<SVGSVGElement>> {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  }

  export type LucideIcon = ForwardRefExoticComponent<
    LucideProps & RefAttributes<SVGSVGElement>
  >;

  export const Sparkles: LucideIcon;
  export const Zap: LucideIcon;
  export const Shield: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Upload: LucideIcon;
  export const Image: LucideIcon;
  export const X: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const XCircle: LucideIcon;
  export const Loader2: LucideIcon;
  export const Download: LucideIcon;
  export const Layers: LucideIcon;
  export const Menu: LucideIcon;
  export const Sun: LucideIcon;
  export const Moon: LucideIcon;
  export const User: LucideIcon;
  export const Settings: LucideIcon;
  export const LogOut: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const CreditCard: LucideIcon;
  export const Mail: LucideIcon;
  export const Lock: LucideIcon;
  export const Github: LucideIcon;
  export const Eye: LucideIcon;
  export const Droplets: LucideIcon;
  export const ImageIcon: LucideIcon;
  export const Clock: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Activity: LucideIcon;
  export const HardDrive: LucideIcon;
  export const Home: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Star: LucideIcon;
  export const Crop: LucideIcon;
  export const Palette: LucideIcon;
  export const Check: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const SparklesIcon: LucideIcon;
  export const Users: LucideIcon;
  export const Plus: LucideIcon;
  export const Search: LucideIcon;
  export const Trash2: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const Globe: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const Info: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
}
