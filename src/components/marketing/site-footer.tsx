import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/logo";
import { BRAND } from "@/lib/brand";
import { Mail, MapPin, Phone } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/10 px-3 pb-3 sm:px-4">
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl">
        <div className="grid gap-10 px-6 py-12 sm:px-8 md:grid-cols-4">
          <div className="space-y-3 md:col-span-1">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              Building intelligent systems that move businesses forward — AI automation,
              chatbots, and custom platforms.
            </p>
            <ul className="space-y-2 pt-2 text-sm text-muted-foreground">
              <li>
                <a
                  href={BRAND.phoneHref}
                  dir="ltr"
                  className="flex items-center gap-2 transition-colors hover:text-aurora-cyan"
                >
                  <Phone className="h-4 w-4 text-aurora-cyan" /> {BRAND.phone}
                </a>
              </li>
              <li>
                <a
                  href={BRAND.emailHref}
                  className="flex items-center gap-2 transition-colors hover:text-aurora-cyan"
                >
                  <Mail className="h-4 w-4 text-aurora-cyan" /> {BRAND.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-aurora-cyan" /> {BRAND.location}
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold tracking-wide text-foreground/90">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/services" className="hover:text-foreground">Services</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
              <li><Link to="/case-studies" className="hover:text-foreground">Case Studies</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold tracking-wide text-foreground/90">
              Company
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground">About</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold tracking-wide text-foreground/90">
              Account
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
              <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {BRAND.name} — All rights reserved.
        </div>
      </div>
    </footer>
  );
}
