'use client';
import Link from "next/link";

export function Footer() {
    return (
      <footer className="w-full border-t border-brand-beige/40 bg-brand-off-white py-8 text-center text-xs text-brand-dark-purple/60 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            ✦ FASTVOXA — La facturation B2B agile et instantanée.
          </div>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-brand-mauve transition-colors">Conditions</Link>
            <Link href="#" className="hover:text-brand-mauve transition-colors">Confidentialité</Link>
            <Link href="#" className="hover:text-brand-mauve transition-colors">Support</Link>
          </div>
          <div>
            © 2026 fastvoxa. Tous droits réservés.
          </div>
        </div>
      </footer>
    )
}