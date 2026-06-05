"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  Header,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  HeaderGlobalBar,
  HeaderGlobalAction,
} from "@carbon/react";
import {
  UserAvatar, ChartLine, Map, Catalog, Compare,
  Logout, Menu, Close, Search,
} from "@carbon/icons-react";
import { Logo } from "./Logo";

const NAV_LINKS = [
  { href: "/analyse",            label: "Analyseer perceel",  icon: ChartLine },
  { href: "/kansrijke-percelen", label: "Kansrijke percelen", icon: Search },
  { href: "/vergelijker",        label: "Vergelijker",        icon: Compare },
  { href: "/kaart",              label: "Kaart",              icon: Map },
  { href: "/dashboard",          label: "Mijn percelen",      icon: Catalog },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("percelo-menu-open", mobileOpen);
    return () => document.body.classList.remove("percelo-menu-open");
  }, [mobileOpen]);

  function sluit() { setMobileOpen(false); }

  return (
    <>
      <Header aria-label="Percelo">
        <HeaderName href="/" prefix="" onClick={sluit}>
          <Logo height={28} />
        </HeaderName>

        {/* Desktop navigatie (verborgen onder 1056px via Carbon CSS) */}
        <HeaderNavigation aria-label="Navigatie">
          {NAV_LINKS.slice(0, 4).map(({ href, label }) => (
            <HeaderMenuItem key={href} href={href} isCurrentPage={pathname === href}>
              {label}
            </HeaderMenuItem>
          ))}
        </HeaderNavigation>

        <HeaderGlobalBar>
          {/* Hamburger: alleen zichtbaar op mobiel via CSS */}
          <HeaderGlobalAction
            aria-label={mobileOpen ? "Menu sluiten" : "Menu openen"}
            className="percelo-hamburger"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <Close size={20} /> : <Menu size={20} />}
          </HeaderGlobalAction>

          {/* Desktop: account-acties (verborgen op mobiel, staan in mobiel menu) */}
          {isSignedIn ? (
            <>
              <HeaderGlobalAction
                aria-label="Mijn account"
                tooltipAlignment="end"
                className="percelo-desktop-only"
                onClick={() => router.push("/dashboard")}
              >
                <UserAvatar size={20} />
              </HeaderGlobalAction>
              <HeaderGlobalAction
                aria-label="Uitloggen"
                tooltipAlignment="end"
                className="percelo-desktop-only"
                onClick={() => signOut({ redirectUrl: "/" })}
              >
                <Logout size={20} />
              </HeaderGlobalAction>
            </>
          ) : (
            <HeaderGlobalAction
              aria-label="Inloggen"
              tooltipAlignment="end"
              className="percelo-desktop-only"
              onClick={() => router.push("/login")}
            >
              <UserAvatar size={20} />
            </HeaderGlobalAction>
          )}
        </HeaderGlobalBar>
      </Header>

      {/* Mobiel navigatiemenu */}
      {mobileOpen && (
        <div className="percelo-mobile-backdrop" onClick={sluit} aria-hidden="true" />
      )}
      {mobileOpen && (
        <nav className="percelo-mobile-menu" aria-label="Mobiele navigatie">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`percelo-mobile-menu__item${pathname === href ? " percelo-mobile-menu__item--active" : ""}`}
              onClick={sluit}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}

          <div className="percelo-mobile-menu__footer">
            {isSignedIn ? (
              <>
                <button
                  onClick={() => { sluit(); router.push("/dashboard"); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9375rem", fontWeight: 500, color: "var(--cds-link-primary, #0f62fe)", padding: 0 }}
                >
                  Mijn account
                </button>
                <button
                  onClick={() => { sluit(); signOut({ redirectUrl: "/" }); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9375rem", color: "var(--cds-text-secondary, #525252)", padding: 0 }}
                >
                  Uitloggen
                </button>
              </>
            ) : (
              <button
                onClick={() => { sluit(); router.push("/login"); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9375rem", fontWeight: 500, color: "var(--cds-link-primary, #0f62fe)", padding: 0 }}
              >
                Inloggen
              </button>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
