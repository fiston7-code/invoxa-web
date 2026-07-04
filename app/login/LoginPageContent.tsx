"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { loginUser } from "@/lib/api/auth";
import { checkHasBusinessProfile } from "@/lib/api/business";

const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

type LucrativeLoginFormValues = z.infer<typeof loginSchema>;

// Ce composant est utilisé dans la page de login pour afficher le
// formulaire et gérer la connexion. Il vérifie aussi si l'utilisateur a
// déjà un profil d'entreprise pour rediriger en conséquence — que ce soit
// juste après la connexion, ou dès l'arrivée sur la page s'il a déjà une
// session valide.

export default function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [apiError, setApiError] = useState<string | null>(null);

  // Tant que `checkingSession` est true, on n'affiche pas le formulaire :
  // ça évite qu'un utilisateur déjà connecté voie le login apparaître une
  // fraction de seconde avant d'être redirigé.
  const [checkingSession, setCheckingSession] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LucrativeLoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Pré-remplir l'email si présent dans l'URL
  useEffect(() => {
    const emailFromUrl = searchParams.get("email");
    if (emailFromUrl) {
      setValue("email", emailFromUrl);
    }
  }, [searchParams, setValue]);

  // Session déjà active ? On vérifie le profil d'entreprise et on
  // redirige directement, sans repasser par ce formulaire.
  useEffect(() => {
    async function redirectIfAlreadyLoggedIn() {
      const token = localStorage.getItem("invoxa_token");

      if (!token) {
        setCheckingSession(false);
        return;
      }

      try {
        const hasCompany = await checkHasBusinessProfile();
        router.replace(hasCompany ? "/dashboard" : "/onboarding/setup-company");
      } catch (error) {
        // Token invalide ou expiré : on nettoie et on laisse
        // l'utilisateur se reconnecter normalement.
        localStorage.removeItem("invoxa_token");
        setCheckingSession(false);
      }
    }

    redirectIfAlreadyLoggedIn();
  }, [router]);

  const onSubmit = async (data: LucrativeLoginFormValues) => {
    setApiError(null);
    try {
      const resData = await loginUser(data);
      localStorage.setItem("invoxa_token", resData.authentication_token.token);

      const hasCompany = await checkHasBusinessProfile();

      if (hasCompany) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding/setup-company");
      }
    } catch (error: any) {
      setApiError(error.message || "Une erreur inattendue est survenue.");
    }
  };

  // Pendant la vérification de session, on affiche un état neutre plutôt
  // que le formulaire, pour éviter le flash évoqué ci-dessus.
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-brand-off-white flex items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-dark-purple/20 border-t-brand-dark-purple rounded-full animate-spin" />
          <p className="text-xs text-brand-dark-purple/50">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-off-white flex items-center justify-center px-4 py-12 select-none">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-brand-beige/50 p-8 rounded-2xl shadow-sm"
      >
        <div className="text-center mb-8">
          <Link href="/" className="text-xl font-heading font-bold tracking-wider text-brand-dark-purple">
            FASTVOXA
          </Link>
          <h2 className="text-2xl font-heading font-bold text-brand-dark-purple mt-4">Ravi de vous revoir</h2>
          <p className="text-xs text-brand-dark-purple/60 mt-1">Accédez à vos outils de generation de recu instantanée</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {apiError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-medium text-center">
              {apiError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-dark-purple mb-1.5">Adresse Email</label>
            <input
              {...register("email")}
              type="email"
              className="w-full px-4 py-3 bg-brand-off-white border border-brand-beige/60 rounded-xl text-sm focus:outline-none focus:border-brand-mauve transition-colors text-brand-dark-purple font-medium"
              placeholder="alex@exemple.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-dark-purple">Mot de passe</label>
              <Link href="#" className="text-[11px] text-brand-mauve font-semibold hover:underline">
                Oublié ?
              </Link>
            </div>
            <input
              {...register("password")}
              type="password"
              className="w-full px-4 py-3 bg-brand-off-white border border-brand-beige/60 rounded-xl text-sm focus:outline-none focus:border-brand-mauve transition-colors text-brand-dark-purple font-medium"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-brand-dark-purple text-brand-off-white font-heading font-bold rounded-xl text-sm shadow-md hover:bg-brand-dark-purple/90 transition-all cursor-pointer mt-2 disabled:opacity-50"
          >
            {isSubmitting ? "Vérification..." : "Se connecter"}
          </motion.button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-brand-dark-purple/60">
            Nouveau sur fastvoxa ?{" "}
            <Link href="/register" className="text-brand-mauve font-semibold hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}