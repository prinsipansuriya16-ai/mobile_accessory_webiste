import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import { Container } from "./Container";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <Container className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-display text-base font-semibold">Kisaan Accessories</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Mobile and computer accessories, available with Cash on Delivery across Surat.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="transition-colors hover:text-foreground">
                Home
              </Link>
            </li>
            <li>
              <Link to="/categories" className="transition-colors hover:text-foreground">
                Categories
              </Link>
            </li>
            <li>
              <Link to="/cart" className="transition-colors hover:text-foreground">
                Cart
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Store</p>
          <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>204, AR Mall, Surat, Gujarat, India</span>
          </p>
        </div>
      </Container>

      <div className="border-t border-border">
        <Container className="flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Kisaan Accessories. All rights reserved.</span>
          <Link to="/admin/login" className="transition-colors hover:text-foreground">
            Admin
          </Link>
        </Container>
      </div>
    </footer>
  );
}
