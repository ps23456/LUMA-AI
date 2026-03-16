"use client";

import { useState, useEffect } from "react";
import type { NavbarProps } from "@/types/blocks";

function proxyUrl(src: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

interface NavbarBlockProps extends NavbarProps {
  onNavigate?: (href: string) => void;
}

function NavLink({
  link,
  onNavigate,
  handleClick,
  isCentered,
}: {
  link: { label: string; href: string; children?: Array<{ label: string; href: string }> };
  onNavigate?: (href: string) => void;
  handleClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
  isCentered: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasDropdown = link.children && link.children.length > 0;
  const baseClass = isCentered
    ? "cursor-pointer uppercase opacity-70 transition-opacity hover:opacity-100"
    : "cursor-pointer uppercase opacity-70 transition-opacity hover:opacity-100";

  if (hasDropdown) {
    return (
      <div
        className="relative"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <span
          className={`inline-flex items-center gap-1 ${baseClass}`}
          style={{
            fontSize: "var(--body-size, 0.875rem)",
            fontWeight: "var(--nav-weight, 500)",
            letterSpacing: "var(--nav-letter-spacing, 0.1em)",
          }}
        >
          {link.label}
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white py-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            {link.children!.map((child, i) => (
              <a
                key={`${child.label}-${child.href}-${i}`}
                href={child.href}
                onClick={(e) => handleClick(e, child.href)}
                className="block px-4 py-2 text-xs font-medium uppercase text-gray-900 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                {child.label}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={link.href}
      onClick={(e) => handleClick(e, link.href)}
      className={baseClass}
      style={{
        fontSize: "var(--body-size, 0.875rem)",
        fontWeight: "var(--nav-weight, 500)",
        letterSpacing: isCentered ? "var(--nav-letter-spacing, 0.1em)" : "var(--nav-letter-spacing, 0)",
      }}
    >
      {link.label}
    </a>
  );
}

const CartIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);
const SearchIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const AccountIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const SIDEBAR_ICONS: Record<string, React.FC<{ className?: string }>> = {
  hamburger: () => (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  dots: () => (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  ),
  grid: () => (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 14a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 14a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  menu: () => (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  list: () => (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  kebab: () => (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  ),
  plus: () => (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16M4 12h16" />
    </svg>
  ),
};

const MenuIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function NavbarBlock({
  brand,
  links,
  ctaText,
  ctaHref,
  navStyle = "default",
  logoStyle = "icon",
  logoImage,
  logoHeight,
  logoWidth,
  hasCart,
  hasSearch,
  hasAccount,
  currencySelector,
  showBorder = true,
  showLogoDivider = false,
  headerOrder,
  sidebarPosition = "left",
  logoPosition = "left",
  sidebarIcon = "hamburger",
  onNavigate,
}: NavbarBlockProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);
  const isInternal = (href: string) =>
    href.startsWith("#") ||
    href.startsWith("/") ||
    (!href.startsWith("http") && !href.startsWith("mailto:"));

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (onNavigate && isInternal(href)) {
      e.preventDefault();
      const normalized = href.replace(/^[#/]+/, "");
      onNavigate(`#${normalized || "home"}`);
    }
  };

  const navBorderClass = showBorder !== false ? "border-b border-current/10" : "";
  const centeredBrandBorder = showBorder !== false ? "border-b border-current/5" : "";
  const showLogoIcon = (logoStyle === "icon_only" || logoStyle === "icon") && !logoImage;

  const LogoContent = () => {
    if (logoStyle === "image") {
      const h = logoHeight ?? 32;
      const w = logoWidth ?? 140;
      return logoImage ? (
        <img
          src={proxyUrl(logoImage)}
          alt={brand}
          className="shrink-0 object-contain object-center"
          style={{ height: h, width: w, maxWidth: w }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="shrink-0 rounded bg-white/10" style={{ height: h, width: w }} aria-label="Logo placeholder" />
      );
    }
    if (logoStyle === "icon_only") {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
          {brand.charAt(0).toUpperCase()}
        </div>
      );
    }
    return (
      <>
        {showLogoIcon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
            {brand.charAt(0).toUpperCase()}
          </div>
        )}
        <span
          className="uppercase"
          style={{
            fontSize: "var(--heading-size, 1.125rem)",
            fontFamily: "var(--font-logo, var(--font-theme, inherit))",
            fontWeight: "var(--logo-weight, 700)",
            letterSpacing: "var(--logo-letter-spacing, 0.05em)",
          }}
        >
          {brand}
        </span>
      </>
    );
  };

  const SidebarTrigger = () => {
    const Icon = SIDEBAR_ICONS[sidebarIcon] ?? SIDEBAR_ICONS.hamburger;
    return (
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-current/80 transition-colors hover:bg-white/10 hover:text-current"
        aria-label="Open menu"
      >
        <Icon />
      </button>
    );
  };

  const order = headerOrder ?? (navStyle === "sidebar" ? ["logo", "sidebar", "cta"] : ["logo", "nav", "cta"]);

  const renderHeaderRow = (items: ("logo" | "nav" | "sidebar" | "cta")[]) => {
    const navIdx = items.indexOf("nav");
    const navAlign = navIdx < 0 ? "center" : navIdx === 0 ? "justify-start" : navIdx === items.length - 1 ? "justify-end" : "justify-center";
    return (
    <div className="mx-auto flex h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      {items.map((key) => {
        if (key === "logo") {
          return (
            <div key="logo" className="flex shrink-0 items-center gap-4">
              <a href="#home" onClick={(e) => { handleClick(e, "#home"); setSidebarOpen(false); }} className="flex cursor-pointer items-center gap-2">
                <LogoContent />
              </a>
              {showLogoDivider && items.indexOf("nav") > items.indexOf("logo") && (
                <div className="h-8 w-px shrink-0 bg-current/20" aria-hidden="true" />
              )}
            </div>
          );
        }
        if (key === "nav") {
          return (
            <div key="nav" className={`flex min-w-0 flex-1 flex-wrap items-center gap-4 sm:gap-6 md:gap-8 ${navAlign}`}>
              {links.map((link, i) => (
                <NavLink key={`${link.label}-${link.href}-${i}`} link={link} onNavigate={onNavigate} handleClick={handleClick} isCentered={false} />
              ))}
              {(hasSearch || hasCart || hasAccount || currencySelector) && (
                <div className="flex items-center gap-4">
                  {currencySelector && (
                    <span className="uppercase opacity-70" style={{ fontSize: "var(--body-size, 0.75rem)" }}>{currencySelector}</span>
                  )}
                  {hasSearch && (
                    <button type="button" className="opacity-70 transition-opacity hover:opacity-100" aria-label="Search">
                      <SearchIcon />
                    </button>
                  )}
                  {hasAccount && (
                    <a href="#account" onClick={(e) => handleClick(e, "#account")} className="opacity-70 transition-opacity hover:opacity-100" aria-label="Account">
                      <AccountIcon />
                    </a>
                  )}
                  {hasCart && (
                    <a href="#cart" onClick={(e) => handleClick(e, "#cart")} className="flex items-center gap-1 opacity-70 transition-opacity hover:opacity-100" aria-label="Cart">
                      <CartIcon />
                      <span className="text-xs">Rs. 0.00</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        }
        if (key === "sidebar") {
          return (
            <div key="sidebar" className="flex shrink-0">
              <SidebarTrigger />
            </div>
          );
        }
        if (key === "cta" && ctaText && ctaHref) {
          return (
            <a
              key="cta"
              href={ctaHref}
              onClick={(e) => handleClick(e, ctaHref)}
              className="shrink-0 rounded-full bg-[var(--accent)] px-5 py-2 font-semibold text-white transition-transform hover:scale-105"
              style={{ fontSize: "var(--body-size, 0.875rem)" }}
            >
              {ctaText}
            </a>
          );
        }
        return null;
      })}
    </div>
  );
  };

  if (navStyle === "sidebar") {
    const LogoLink = () => (
      <a href="#home" onClick={(e) => { handleClick(e, "#home"); setSidebarOpen(false); }} className="flex cursor-pointer items-center gap-2">
        <LogoContent />
      </a>
    );
    return (
      <>
        <nav className={`sticky top-0 z-40 bg-inherit backdrop-blur-md ${navBorderClass}`}>
          <div className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            {/* Left section: sidebar (if left) + logo (if left) */}
            <div className="flex shrink-0 items-center gap-4">
              {sidebarPosition === "left" && (
                <div className="flex shrink-0">
                  <SidebarTrigger />
                </div>
              )}
              {logoPosition === "left" && (
                <div className="flex shrink-0">
                  <LogoLink />
                </div>
              )}
            </div>
            {/* Center: logo (if center) - absolutely positioned */}
            {logoPosition === "center" && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <LogoLink />
              </div>
            )}
            {/* Right section: logo (if right) + CTA + sidebar (if right) */}
            <div className="flex shrink-0 items-center gap-4">
              {logoPosition === "right" && (
                <div className="flex shrink-0">
                  <LogoLink />
                </div>
              )}
              {order.includes("cta") && ctaText && ctaHref && (
                <a
                  href={ctaHref}
                  onClick={(e) => handleClick(e, ctaHref)}
                  className="shrink-0 rounded-full bg-[var(--accent)] px-5 py-2 font-semibold text-white transition-transform hover:scale-105"
                  style={{ fontSize: "var(--body-size, 0.875rem)" }}
                >
                  {ctaText}
                </a>
              )}
              {sidebarPosition === "right" && (
                <div className="flex shrink-0">
                  <SidebarTrigger />
                </div>
              )}
            </div>
          </div>
        </nav>
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] border-r border-current/10 bg-inherit shadow-2xl">
              <div className="flex h-16 items-center justify-between border-b border-current/10 px-4">
                <a href="#home" onClick={(e) => { handleClick(e, "#home"); setSidebarOpen(false); }} className="flex items-center gap-2">
                  <LogoContent />
                </a>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-current/80 transition-colors hover:bg-white/10"
                  aria-label="Close menu"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="flex flex-col gap-1 p-4">
                {links.map((link, i) => (
                  <a
                    key={`${link.label}-${link.href}-${i}`}
                    href={link.href}
                    onClick={(e) => { handleClick(e, link.href); setSidebarOpen(false); }}
                    className="flex items-center rounded-lg px-4 py-3 text-sm font-medium uppercase transition-colors hover:bg-white/10"
                    style={{
                      fontSize: "var(--body-size, 0.875rem)",
                      fontWeight: "var(--nav-weight, 500)",
                      letterSpacing: "var(--nav-letter-spacing, 0.05em)",
                    }}
                  >
                    {link.label}
                  </a>
                ))}
                {ctaText && ctaHref && (
                  <a
                    href={ctaHref}
                    onClick={(e) => { handleClick(e, ctaHref); setSidebarOpen(false); }}
                    className="mt-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-center font-semibold text-white transition-transform hover:scale-[1.02]"
                    style={{ fontSize: "var(--body-size, 0.875rem)" }}
                  >
                    {ctaText}
                  </a>
                )}
              </div>
            </aside>
          </>
        )}
      </>
    );
  }

  if (navStyle === "centered") {
    return (
      <nav className={`sticky top-0 z-50 bg-inherit backdrop-blur-md ${navBorderClass}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Centered brand - uses LogoContent for all logo styles */}
          <div className={`flex items-center justify-center py-4 ${centeredBrandBorder}`}>
            <a
              href="#home"
              onClick={(e) => handleClick(e, "#home")}
              className="flex cursor-pointer items-center justify-center gap-2 text-center"
            >
              <LogoContent />
            </a>
          </div>
          {/* Links row - all pages visible */}
          <div className="flex items-center justify-center gap-8 py-3">
            {links.map((link, i) => (
              <NavLink
                key={`${link.label}-${link.href}-${i}`}
                link={link}
                onNavigate={onNavigate}
                handleClick={handleClick}
                isCentered
              />
            ))}
          {ctaText && ctaHref && (
            <a
              href={ctaHref}
              onClick={(e) => handleClick(e, ctaHref)}
              className="font-medium uppercase tracking-widest text-[var(--accent)] transition-opacity hover:opacity-80"
              style={{ fontSize: "var(--body-size, 0.875rem)" }}
            >
              {ctaText}
            </a>
          )}
          {(hasSearch || hasCart || hasAccount || currencySelector) && (
            <div className="ml-4 flex items-center gap-4 border-l border-current/10 pl-4">
              {currencySelector && (
                <span className="uppercase opacity-70" style={{ fontSize: "var(--body-size, 0.75rem)" }}>{currencySelector}</span>
              )}
              {hasSearch && (
                <button type="button" className="opacity-70 transition-opacity hover:opacity-100" aria-label="Search">
                  <SearchIcon />
                </button>
              )}
              {hasAccount && (
                <a href="#account" onClick={(e) => handleClick(e, "#account")} className="opacity-70 transition-opacity hover:opacity-100" aria-label="Account">
                  <AccountIcon />
                </a>
              )}
              {hasCart && (
                <a href="#cart" onClick={(e) => handleClick(e, "#cart")} className="opacity-70 transition-opacity hover:opacity-100" aria-label="Cart">
                  <CartIcon />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

  const defaultItems = order.filter((k) => k === "logo" || k === "nav" || k === "cta");
  return (
    <nav className={`sticky top-0 z-50 bg-inherit backdrop-blur-md ${navBorderClass}`}>
      {renderHeaderRow(defaultItems)}
    </nav>
  );
}
