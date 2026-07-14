
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api/auth";
import GoogleSignInButton from "@/components/google-signin-button";

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  passwordConfirmation: z.string().min(1, "Veuillez confirmer votre mot de passe"),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: "Les mots de passe ne correspondent pas",
  path: ["passwordConfirmation"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setApiError(null);
    try {
      const { passwordConfirmation, ...apiPayload } = data;
      
      // Appel à ton API Go (POST /v1/users) qui va déclencher l'envoi du mail via Mailtrap
      await registerUser(apiPayload);
      
      // Redirection vers la page intermédiaire qui demande de check ses mails
      router.push("/onboarding/verify-email");
    } catch (error: any) {
      setApiError(error.message || "Une erreur est survenue lors de l'inscription.");
      console.error(error);
    }
  };

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
          <h2 className="text-2xl font-heading font-bold text-brand-dark-purple mt-4">Créer votre compte</h2>
          <p className="text-xs text-brand-dark-purple/60 mt-1">Prêt à facturer vos clients en quelques secondes</p>
        </div>


        {/* Connexion Google — crée directement un compte activé, sans passer
            par le flux "vérifier votre email" puisque Google a déjà vérifié
            l'adresse à notre place. */}
        <div className="mb-5">
          <GoogleSignInButton onError={setApiError} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {apiError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-medium text-center">
              {apiError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-dark-purple mb-1.5">Votre Nom</label>
            <input 
              {...register("name")} 
              type="text" 
              className="w-full px-4 py-3 bg-brand-off-white border border-brand-beige/60 rounded-xl text-sm focus:outline-none focus:border-brand-mauve transition-colors text-brand-dark-purple font-medium"
              placeholder="Alexandre Mwamba"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name.message}</p>}
          </div>

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

          {/* Mot de passe */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-dark-purple mb-1.5">Mot de passe</label>
            <div className="relative flex items-center">
              <input 
                {...register("password")} 
                type={showPassword ? "text" : "password"} 
                className="w-full pl-4 pr-12 py-3 bg-brand-off-white border border-brand-beige/60 rounded-xl text-sm focus:outline-none focus:border-brand-mauve transition-colors text-brand-dark-purple font-medium"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-brand-dark-purple/50 hover:text-brand-mauve transition-colors cursor-pointer"
                title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
          </div>

          {/* Confirmation Mot de passe */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-dark-purple mb-1.5">Confirmer le mot de passe</label>
            <div className="relative flex items-center">
              <input 
                {...register("passwordConfirmation")} 
                type={showConfirmPassword ? "text" : "password"} 
                className="w-full pl-4 pr-12 py-3 bg-brand-off-white border border-brand-beige/60 rounded-xl text-sm focus:outline-none focus:border-brand-mauve transition-colors text-brand-dark-purple font-medium"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 p-1 text-brand-dark-purple/50 hover:text-brand-mauve transition-colors cursor-pointer"
                title={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.passwordConfirmation && <p className="text-red-500 text-xs mt-1 font-medium">{errors.passwordConfirmation.message}</p>}
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-brand-dark-purple text-brand-off-white font-heading font-bold rounded-xl text-sm shadow-md hover:bg-brand-dark-purple/90 transition-all cursor-pointer mt-2 disabled:opacity-50"
          >
            {isSubmitting ? "Création en cours..." : "Créer mon compte"}
          </motion.button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-brand-dark-purple/60">
            Déjà inscrit ?{" "}
            <Link href="/login" className="text-brand-mauve font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}


