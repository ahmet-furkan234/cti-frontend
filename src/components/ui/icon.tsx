import type { SVGProps } from 'react';
import {
  Boxes, Bell, Check, ChevronDown, ChevronUp, ChevronsUpDown, ClipboardList, Clock, Cloud, Container, Copy, Database, ExternalLink,
  Eye, EyeOff, FileText, Flame, Funnel, Globe, Inbox, Info, KeyRound, Laptop, LayoutDashboard, Link, LoaderCircle, Lock, LogOut,
  Menu, Minus, Moon, Pencil, Plus, RefreshCw, Search, Server, Settings, Shield, Sun, Trash2, TriangleAlert, Users, X,
  type LucideIcon,
} from 'lucide-react';

/** Lucide icons under the names the app already uses, so call sites never import a vendor icon directly. */
export const ICONS = {
  flame: Flame,
  search: Search,
  copy: Copy,
  check: Check,
  up: ChevronUp,
  down: ChevronDown,
  sort: ChevronsUpDown,
  alert: TriangleAlert,
  info: Info,
  inbox: Inbox,
  lock: Lock,
  eye: Eye,
  'eye-off': EyeOff,
  x: X,
  minus: Minus,
  plus: Plus,
  clock: Clock,
  globe: Globe,
  loader: LoaderCircle,
  // navigation
  dashboard: LayoutDashboard,
  assets: Boxes,
  bell: Bell,
  report: FileText,
  users: Users,
  audit: ClipboardList,
  sync: RefreshCw,
  settings: Settings,
  shield: Shield,
  menu: Menu,
  logout: LogOut,
  sun: Sun,
  moon: Moon,
  server: Server,
  laptop: Laptop,
  container: Container,
  cloud: Cloud,
  db: Database,
  edit: Pencil,
  trash: Trash2,
  refresh: RefreshCw,
  link: Link,
  external: ExternalLink,
  filter: Funnel,
  key: KeyRound,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'ref'> {
  name: IconName;
  size?: number;
  spin?: boolean;
}

export function Icon({ name, size = 16, spin, className, ...rest }: IconProps) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      className={['inline-block shrink-0 align-middle', spin ? 'animate-spin' : '', className ?? ''].filter(Boolean).join(' ')}
      size={size}
      strokeWidth={1.75}
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  );
}
