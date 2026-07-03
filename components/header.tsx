
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="w-full flex flex-col relative z-50">
      

      {/* 2. Barre de navigation principale */}
      <div className="w-full bg-brand-dark-purple text-brand-off-white shadow-md border-b border-brand-dark-purple/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Section Gauche : Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-heading font-bold tracking-wider text-brand-beige">
                FASTVOXA
              </span>
            </Link>
          </div>

          {/* Section Centre : Liens de Navigation Desktop */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#features" className="text-brand-off-white/80 hover:text-brand-beige transition-colors">
              Fonctionnalités
            </Link>
            <Link href="#pricing" className="text-brand-off-white/80 hover:text-brand-beige transition-colors">
              Tarifs
            </Link>
            <Link href="#support" className="text-brand-off-white/80 hover:text-brand-beige transition-colors">
              Aide & Contact
            </Link>
          </nav>

          {/* Section Droite : Boutons Connexion / Inscription */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="text-brand-off-white hover:text-brand-beige text-sm font-semibold px-4 py-2 cursor-pointer"
              >
                Se connecter
              </motion.button>
            </Link>
            <Link href="/register">
              <motion.button
                whileHover={{ scale: 1.03, backgroundColor: "#7B4BB7" }}
                whileTap={{ scale: 0.97 }}
                className="bg-brand-mauve text-white font-heading font-semibold text-sm px-5 py-2.5 rounded-lg shadow-lg transition-all cursor-pointer"
              >
                Créer un compte
              </motion.button>
            </Link>
          </div>

          {/* Bouton Menu Hamburger Mobile */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-brand-off-white hover:text-brand-beige focus:outline-none p-2 cursor-pointer"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* 3. Menu Déroulant Mobile avec Animation Framer Motion */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden w-full bg-brand-dark-purple border-b border-brand-mauve/20 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-4 flex flex-col">
              <Link href="#features" onClick={() => setIsOpen(false)} className="text-brand-off-white/90 font-medium py-1">
                Fonctionnalités
              </Link>
              <Link href="#pricing" onClick={() => setIsOpen(false)} className="text-brand-off-white/90 font-medium py-1">
                Tarifs
              </Link>
              <Link href="#support" onClick={() => setIsOpen(false)} className="text-brand-off-white/90 font-medium py-1">
                Aide & Contact
              </Link>

              <hr className="border-brand-beige/10" />

              <div className="flex flex-col gap-3">
                <Link href="/login" onClick={() => setIsOpen(false)} className="w-full">
                  <button className="w-full text-center py-2.5 text-brand-off-white font-semibold border border-brand-off-white/20 rounded-lg cursor-pointer">
                    Se connecter
                  </button>
                </Link>
                <Link href="/register" onClick={() => setIsOpen(false)} className="w-full">
                  <button className="w-full text-center py-2.5 bg-brand-mauve text-white font-heading font-semibold rounded-lg cursor-pointer">
                    Créer un compte
                  </button>
                </Link>

                
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      
    </header>
  );
}