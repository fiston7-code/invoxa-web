
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { activateUser } from "@/lib/api/auth";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message: string }>({
    type: "idle",
    message: "",
  });

 

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setStatus({ type: "loading", message: "Validation..." });

    try {
      // 1. Appeler l'API et récupérer la réponse
      const response = await activateUser(token.trim());
      
      // 2. Extraire l'email (si votre fonction activateUser renvoie le JSON complet)
      const userEmail = response.email || ""; // Assurez-vous que votre fonction activateUser renvoie l'email

      setStatus({ type: "success", message: "Compte activé ! Redirection..." });
      
      // 3. Rediriger avec l'email en paramètre
      setTimeout(() => {
        router.push(`/login?email=${encodeURIComponent(userEmail)}`);
      }, 2000);
    } catch (error: any) {
      setStatus({ type: "error", message: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-brand-off-white flex items-center justify-center px-4 py-12 select-none">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-brand-beige/50 p-8 rounded-2xl shadow-sm text-center"
      >
        <span className="text-4xl">✉️</span>
        <h2 className="text-2xl font-heading font-bold text-brand-dark-purple mt-4">Vérifiez votre boîte mail</h2>
        <p className="text-sm text-brand-dark-purple/70 mt-2 px-2">
          Un e-mail de bienvenue contenant votre jeton d&apos;activation unique vient de vous être envoyé.
        </p>

        <div className="my-6 border-t border-brand-beige/40"></div>

        <form onSubmit={handleActivation} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-dark-purple mb-1.5 text-center">
              Saisissez le jeton d&apos;activation reçu
            </label>
            <input 
              type="text" 
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 bg-brand-off-white border border-brand-beige/60 rounded-xl text-center font-mono text-sm uppercase tracking-widest focus:outline-none focus:border-brand-mauve transition-colors text-brand-dark-purple font-medium"
              placeholder="EX: 3X7Z9..."
              disabled={status.type === "loading" || status.type === "success"}
            />
          </div>

          {status.message && (
            <div className={`p-3 text-xs rounded-xl font-medium text-center border ${
              status.type === "success" ? "bg-green-50 border-green-200 text-green-600" :
              status.type === "error" ? "bg-red-50 border-red-200 text-red-600" : "bg-brand-off-white text-brand-dark-purple/80"
            }`}>
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={status.type === "loading" || status.type === "success" || !token.trim()}
            className="w-full py-3.5 bg-brand-dark-purple text-brand-off-white font-heading font-bold rounded-xl text-sm shadow-md hover:bg-brand-dark-purple/90 transition-all disabled:opacity-50 cursor-pointer"
          >
            {status.type === "loading" ? "Activation..." : "Activer mon espace"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}