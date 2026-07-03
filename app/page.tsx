"use client";

import { motion, Variants } from "framer-motion";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

const receiptVariants: Variants = {
  hidden: { opacity: 0, y: -30, rotate: -6 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: -3,
    transition: { duration: 0.7, ease: "easeOut", delay: 0.3 },
  },
};

// ---------------------------------------------------------------------------
// Data — types de commerces qui utilisent FastVoxa (preuve sociale sans
// faux témoignages tant qu'on n'a pas de vrais clients à citer)
// ---------------------------------------------------------------------------
const businessTypes = [
  "Boutiques de quartier",
  "Salons de coiffure",
  "Pharmacies",
  "Ateliers de couture",
  "Restaurants & maquis",
  "Vendeurs de pièces détachées",
];

const features = [
  {
    title: "Un reçu en moins de 30 secondes",
    description:
      "Montant, nom du client, article : trois champs suffisent. FastVoxa génère un reçu numéroté et prêt à envoyer, sans formulaire compliqué.",
  },
  {
    title: "Partage WhatsApp en un tap",
    description:
      "Le PDF est généré et envoyé directement dans la conversation WhatsApp du client. Pas d'imprimante, pas de papier à courir après.",
  },
  {
    title: "Pensé pour une connexion faible",
    description:
      "FastVoxa reste utilisable même avec une connexion instable. Vos reçus se synchronisent dès que le réseau revient.",
  },
  {
    title: "Historique et numérotation automatique",
    description:
      "Chaque reçu est archivé et numéroté dans l'ordre. Retrouvez n'importe quelle vente en quelques secondes, sans tableur.",
  },
];

const steps = [
  {
    number: "01",
    title: "Entrez le montant et le client",
    description: "Depuis votre téléphone, en pleine boutique, sans quitter votre client des yeux.",
  },
  {
    number: "02",
    title: "FastVoxa génère le reçu",
    description: "Un reçu professionnel, numéroté et à votre nom, prêt en un instant.",
  },
  {
    number: "03",
    title: "Envoyez-le sur WhatsApp",
    description: "Un tap suffit. Votre client reçoit son reçu avant même de ranger son téléphone.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-off-white text-brand-dark-purple flex flex-col font-sans selection:bg-brand-beige selection:text-brand-dark-purple">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-30 w-full border-b border-brand-beige/50 bg-brand-off-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="font-heading font-extrabold text-lg tracking-tight">
            FastVoxa
          </span>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-brand-dark-purple/70">
            <Link href="#features" className="hover:text-brand-dark-purple transition-colors">
              Fonctionnalités
            </Link>
            <Link href="#how-it-works" className="hover:text-brand-dark-purple transition-colors">
              Comment ça marche
            </Link>
          </nav>
          <Link href="/register">
            <button className="bg-brand-dark-purple text-brand-off-white font-heading font-semibold text-sm px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity cursor-pointer">
              Essayer gratuitement
            </button>
          </Link>
        </div>
      </header>

      {/* 1. HERO */}
      <section className="relative flex-1 px-4 sm:px-6 lg:px-8 pt-16 pb-24 max-w-7xl mx-auto w-full overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Colonne texte */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-start text-left"
          >
            <motion.span
              variants={itemVariants}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest bg-brand-beige/60 text-brand-dark-purple px-4 py-1.5 rounded-full font-semibold border border-brand-beige mb-6"
            >
              Fait pour les commerçants, pas pour les comptables
            </motion.span>

            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-[3.4rem] font-heading font-extrabold tracking-tight mb-6 leading-[1.1]"
            >
              
              Créez un reçu professionnel et{" "} 
              <span className="text-brand-mauve">envoyez-le sur WhatsApp en moins de 30 secondes.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg text-brand-dark-purple/80 mb-10 max-w-lg font-normal leading-relaxed"
            >
              FastVoxa aide les boutiques et petits commerces à délivrer un reçu
              numérique propre, à chaque vente, directement depuis leur téléphone
              et envoyé sur WhatsApp.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto"
            >
              <Link href="/register" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto bg-brand-dark-purple text-brand-off-white font-heading font-bold px-8 py-4 rounded-xl text-base shadow-lg shadow-brand-dark-purple/10 transition-all cursor-pointer"
                >
                  Créer mon premier reçu
                </motion.button>
              </Link>
              <Link href="#how-it-works" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ backgroundColor: "rgba(231, 217, 196, 0.5)" }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto border-2 border-brand-dark-purple text-brand-dark-purple font-heading font-bold px-8 py-3.5 rounded-xl text-base bg-transparent transition-all cursor-pointer"
                >
                  Voir comment ça marche
                </motion.button>
              </Link>
            </motion.div>

            <motion.p
              variants={itemVariants}
              className="mt-6 text-xs text-brand-dark-purple/50"
            >
              Commencez gratuitement en moins de 2 minutes.
            </motion.p>
          </motion.div>

          {/* Colonne visuelle : le reçu, en signature */}
          <div className="relative flex items-center justify-center py-8">
            <div className="absolute w-72 h-72 bg-brand-beige/40 rounded-full blur-3xl -z-10" />

            <motion.div
              variants={receiptVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ rotate: 0, scale: 1.02 }}
              className="relative w-[280px] bg-white rounded-t-md shadow-xl shadow-brand-dark-purple/15 border border-brand-beige/60"
            >
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-heading font-bold text-sm tracking-tight">
                    Boutique Mama Nzuzi
                  </span>
                  <span className="text-[10px] font-mono text-brand-dark-purple/50">
                    #0342
                  </span>
                </div>
                <p className="text-[11px] text-brand-dark-purple/50 font-mono mb-4">
                  Kinshasa · 03 juil. 2026, 14:12
                </p>

                <div className="border-t border-dashed border-brand-beige my-3" />

                <div className="space-y-2 font-mono text-[13px]">
                  <div className="flex justify-between">
                    <span>2x Pagne Wax</span>
                    <span>18 000 FC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x Sac à main</span>
                    <span>12 500 FC</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-brand-beige my-3" />

                <div className="flex justify-between font-heading font-bold text-sm">
                  <span>Total</span>
                  <span>30 500 FC</span>
                </div>

                <div className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Envoyé sur WhatsApp
                </div>
              </div>

              {/* Bord perforé façon papier de caisse */}
              <div
                className="h-4 w-full bg-white"
                style={{
                  WebkitMaskImage:
                    "radial-gradient(circle at 10px 0px, transparent 9px, black 9.5px)",
                  maskImage:
                    "radial-gradient(circle at 10px 0px, transparent 9px, black 9.5px)",
                  WebkitMaskSize: "20px 16px",
                  maskSize: "20px 16px",
                  WebkitMaskRepeat: "repeat-x",
                  maskRepeat: "repeat-x",
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, duration: 0.4 }}
              className="absolute -right-2 top-6 bg-brand-dark-purple text-brand-off-white text-xs font-heading font-bold px-3 py-2 rounded-lg shadow-lg rotate-3"
            >
              ⏱ 30 sec
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. BANDEAU "POUR QUI" */}
      <section className="w-full border-y border-brand-beige/50 bg-white/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-medium text-brand-dark-purple/60">
            {businessTypes.map((type) => (
              <span key={type}>{type}</span>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FONCTIONNALITÉS */}
      <section id="features" className="w-full bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-brand-dark-purple mb-4">
              Zéro fioriture. Juste l&apos;essentiel pour vendre sereinement.
            </h2>
            <p className="text-base text-brand-dark-purple/60 leading-relaxed">
              FastVoxa n&apos;est pas un logiciel de comptabilité. C&apos;est l&apos;outil
              que vous ouvrez entre deux clients, qui fait une seule chose et
              la fait bien.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5 }}
                className="bg-brand-off-white/60 border border-brand-beige/40 p-8 rounded-2xl"
              >
                <h3 className="text-lg font-heading font-bold text-brand-dark-purple mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-brand-dark-purple/70 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. COMMENT ÇA MARCHE */}
      <section id="how-it-works" className="w-full bg-brand-off-white py-24 border-t border-brand-beige/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-brand-dark-purple mb-4">
              Trois étapes. Rien de plus.
            </h2>
            <p className="text-base text-brand-dark-purple/60 leading-relaxed">
              Conçu pour être utilisé debout, au comptoir, entre deux clients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <span className="font-heading text-5xl font-extrabold text-brand-mauve/25 block mb-4">
                  {step.number}
                </span>
                <h3 className="text-lg font-heading font-bold text-brand-dark-purple mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-brand-dark-purple/70 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CTA FINAL */}
      <section className="w-full bg-brand-dark-purple py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-brand-off-white mb-4">
            Votre prochain client mérite un vrai reçu.
          </h2>
          <p className="text-brand-off-white/70 mb-8 max-w-lg mx-auto">
            Créez votre espace FastVoxa et générez votre premier reçu en moins
            de deux minutes.
          </p>
          <Link href="/register">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="bg-brand-off-white text-brand-dark-purple font-heading font-bold px-8 py-4 rounded-xl text-base shadow-lg cursor-pointer"
            >
              Commencer gratuitement
            </motion.button>
          </Link>
        </div>
      </section>

     
    </div>
  );
}