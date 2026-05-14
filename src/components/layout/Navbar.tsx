"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MapPin, LayoutList, Map, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/analyse", label: "Analyseer", icon: MapPin },
  { href: "/kaart", label: "Kaart", icon: Map },
  { href: "/dashboard", label: "Mijn percelen", icon: LayoutList },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-6xl mx-auto px-4 flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            BW
          </div>
          <span>BestemmingsWijziging<span className="text-primary">.nl</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                pathname === href
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="text-xs">Prijzen</Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="text-xs h-8">
              <User className="h-3.5 w-3.5 mr-1.5" />
              Inloggen
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
