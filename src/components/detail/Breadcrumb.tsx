import Link from "next/link";
import { ChevronRight, Home, User } from "lucide-react";

interface Props {
  name: string;
  npub: string;
}

export default function Breadcrumb({ name, npub }: Props) {
  const truncatedName = name.length > 24 ? `${name.slice(0, 24)}...` : name;

  return (
    <nav className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
      <Link href="/" className="hover:text-slate-900 flex items-center gap-1 transition-colors font-medium">
        <Home className="w-3.5 h-3.5" /> Home
      </Link>

      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

      <span className="text-slate-400 font-medium">Creators</span>

      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

      <span className="font-bold text-slate-900 flex items-center gap-1">
        <User className="w-3 h-3 text-purple-600" /> {truncatedName}
      </span>
    </nav>
  );
}