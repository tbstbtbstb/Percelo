"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Header,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  HeaderGlobalBar,
  HeaderGlobalAction,
} from "@carbon/react";
import { UserAvatar, ChartLine, Map, Catalog } from "@carbon/icons-react";

const NAV_LINKS = [
  { href: "/analyse", label: "Analyseer", icon: ChartLine },
  { href: "/kaart", label: "Kaart", icon: Map },
  { href: "/dashboard", label: "Mijn percelen", icon: Catalog },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <Header aria-label="BestemmingsWijziging.nl">
      <HeaderName href="/" prefix="">
        BestemmingsWijziging<span style={{ color: "var(--cds-link-primary, #0f62fe)" }}>.nl</span>
      </HeaderName>

      <HeaderNavigation aria-label="Navigatie">
        {NAV_LINKS.map(({ href, label }) => (
          <HeaderMenuItem
            key={href}
            href={href}
            isCurrentPage={pathname === href}
          >
            {label}
          </HeaderMenuItem>
        ))}
        <HeaderMenuItem href="/pricing">
          Prijzen
        </HeaderMenuItem>
      </HeaderNavigation>

      <HeaderGlobalBar>
        <HeaderGlobalAction aria-label="Inloggen" tooltipAlignment="end">
          <Link href="/login" style={{ display: "flex", alignItems: "center", color: "inherit" }}>
            <UserAvatar size={20} />
          </Link>
        </HeaderGlobalAction>
      </HeaderGlobalBar>
    </Header>
  );
}
