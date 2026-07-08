'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HiOutlineOfficeBuilding, HiOutlineCheckCircle, HiOutlinePhotograph } from 'react-icons/hi';

// ---------------------------------------------------------------------------
// npm install react-hook-form zod @hookform/resolvers react-icons
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Schéma de validation — seul le nom est obligatoire ; le reste (RCCM,
// coordonnées) est recommandé pour un reçu pro mais pas bloquant.
// ---------------------------------------------------------------------------
const businessProfileSchema = z.object({
  name: z.string().trim().min(1, "Le nom de l'entreprise est requis"),
  rccm: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  email: z.string().trim().email('Email invalide').optional().or(z.literal('')),
});

type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>;

interface BusinessProfile {
  id: number;
  name: string;
  logo_url: string;
  rccm: string;
  address: string;
  phone: string;
  email: string;
}

export default function BusinessProfileForm() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  // null tant qu'aucun profil n'existe encore côté serveur : dans ce cas la
  // soumission fera un POST (création) plutôt qu'un PATCH (mise à jour).
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      name: '',
      rccm: '',
      address: '',
      phone: '',
      email: '',
    },
  });

  // --- Chargement du profil existant (s'il y en a un) ---
  useEffect(() => {
    async function loadBusinessProfile() {
      const token = localStorage.getItem('invoxa_token');
      if (!token) {
        setLoadingProfile(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/v1/business`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        // 404 = pas encore de profil créé : ce n'est pas une erreur, le
        // formulaire reste simplement vide et la soumission fera un POST.
        if (response.status === 404) {
          setLoadingProfile(false);
          return;
        }

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const profile: BusinessProfile = data?.business_profile ?? data?.business ?? data;

        if (profile) {
          setBusinessId(profile.id);
          setLogoUrl(profile.logo_url ?? '');
          reset({
            name: profile.name ?? '',
            rccm: profile.rccm ?? '',
            address: profile.address ?? '',
            phone: profile.phone ?? '',
            email: profile.email ?? '',
          });
        }
      } catch (err) {
        console.error('Erreur lors du chargement du profil entreprise :', err);
        setApiError('Impossible de charger le profil entreprise pour le moment.');
      } finally {
        setLoadingProfile(false);
      }
    }

    loadBusinessProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  // --- Upload du logo (endpoint séparé, multipart/form-data) ---
  // Nécessite un profil déjà créé : on n'active le bouton qu'une fois
  // businessId connu, pour éviter d'attacher un logo à rien.
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || businessId === null) return;

    setApiError(null);
    const previousLogoUrl = logoUrl;
    setUploadingLogo(true);

    // Aperçu immédiat pendant l'upload, avant confirmation du serveur.
    const localPreviewUrl = URL.createObjectURL(file);
    setLogoUrl(localPreviewUrl);

    try {
      const token = localStorage.getItem('invoxa_token');
      const formData = new FormData();
      // Le champ attendu par uploadLogoHandler est bien "logo".
      formData.append('logo', file);

      const uploadResponse = await fetch(`${apiUrl}/v1/business/logo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Pas de Content-Type ici : le navigateur ajoute lui-même le
          // boundary multipart correct.
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Erreur ${uploadResponse.status}: ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();
      // uploadLogoHandler renvoie envelope{"url": url} — PAS "logo_url".
      const uploadedUrl: string | undefined = uploadData?.url;

      if (!uploadedUrl) {
        throw new Error("La réponse de l'upload ne contient pas d'URL exploitable.");
      }

      // ⚠️ uploadLogoHandler se contente de stocker le fichier et de
      // renvoyer son URL — il n'appelle jamais BusinessProfiles.Update().
      // Sans ce PATCH, le logo ne serait jamais réellement rattaché au
      // profil : il disparaîtrait au prochain chargement (GET /v1/business).
      const patchResponse = await fetch(`${apiUrl}/v1/business/${businessId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ logo_url: uploadedUrl }),
      });

      if (!patchResponse.ok) {
        throw new Error("Le logo a été envoyé mais n'a pas pu être enregistré sur le profil.");
      }

      setLogoUrl(uploadedUrl);
      setSuccessMessage('Logo mis à jour.');
    } catch (err) {
      console.error("Erreur lors de l'upload du logo :", err);
      setApiError("Le logo n'a pas pu être envoyé ou enregistré. Réessaie avec une image plus légère (JPG/PNG).");
      // On revient à l'état précédent : l'aperçu local ne reflétait pas
      // un état réellement sauvegardé.
      setLogoUrl(previousLogoUrl);
    } finally {
      setUploadingLogo(false);
      URL.revokeObjectURL(localPreviewUrl);
    }
  };

  // --- Création (POST) ou mise à jour (PATCH) du profil ---
  const onSubmit = async (values: BusinessProfileFormValues) => {
    setApiError(null);
    setSuccessMessage(null);

    const token = localStorage.getItem('invoxa_token');
    if (!token) {
      setApiError('Vous devez être connecté pour enregistrer ce profil.');
      return;
    }

    const payload = {
      name: values.name,
      rccm: values.rccm || undefined,
      address: values.address || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
    };

    const isCreating = businessId === null;
    const url = isCreating ? `${apiUrl}/v1/business` : `${apiUrl}/v1/business/${businessId}`;
    const method = isCreating ? 'POST' : 'PATCH';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          setApiError(errorData?.error || errorData?.message || "Erreur lors de l'enregistrement.");
        } catch {
          setApiError(`Le serveur a répondu avec le code ${response.status}.`);
        }
        return;
      }

      const data = await response.json();
      const profile: BusinessProfile = data?.business_profile ?? data?.business ?? data;

      if (isCreating) {
        // Premier profil créé : on redirige directement vers le tableau de
        // bord, comme le fait déjà le flux de login/onboarding.
        router.push('/dashboard');
        return;
      }

      if (profile?.id) setBusinessId(profile.id);
      setSuccessMessage('Profil entreprise mis à jour.');
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement du profil entreprise :', err);
      setApiError('Une erreur réseau est survenue. Réessaie dans un instant.');
    }
  };

  const initials = logoUrl ? '' : 'EN';

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#F5F2EF] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#3B1E5D]/20 border-t-[#3B1E5D] rounded-full animate-spin" />
          <p className="text-xs text-[#3B1E5D]/50">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EF] text-[#3B1E5D] font-sans pb-24 lg:pb-10">
      {/* HEADER */}
      <header className="bg-white border-b border-[#E7D9C4] px-4 sm:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 shrink-0 bg-[#3B1E5D] rounded-lg flex items-center justify-center text-white">
            <HiOutlineOfficeBuilding size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight">Profil de l&apos;entreprise</h1>
            <p className="text-[11px] text-gray-400">
              {businessId ? 'Ces informations apparaissent sur vos reçus.' : 'Configurez votre entreprise pour commencer.'}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {apiError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
            {apiError}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl font-medium flex items-center gap-2">
            <HiOutlineCheckCircle size={16} />
            {successMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white border border-[#E7D9C4] rounded-xl p-4 sm:p-6 space-y-6"
        >
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl border border-[#E7D9C4] bg-[#F5F2EF] overflow-hidden flex items-center justify-center">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo de l'entreprise" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-heading font-extrabold text-[#3B1E5D]/40">{initials}</span>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={businessId === null || uploadingLogo}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md border border-[#E7D9C4] text-[#3B1E5D] hover:bg-[#F5F2EF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <HiOutlinePhotograph size={16} />
                {uploadingLogo ? 'Envoi...' : 'Changer le logo'}
              </button>
              {businessId === null && (
                <p className="text-[10px] text-gray-400 mt-1.5">
                  Enregistrez d&apos;abord le profil ci-dessous pour ajouter un logo.
                </p>
              )}
            </div>
          </div>

          {/* Nom */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#7B4BB7] mb-1.5">
              Nom de l&apos;entreprise *
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="ex: Boutique Mama Nzuzi"
              className="w-full px-4 py-3 sm:py-2.5 bg-[#F5F2EF] border border-[#E7D9C4] rounded-xl text-base sm:text-sm focus:outline-none focus:border-[#7B4BB7] transition-colors font-medium"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name.message}</p>}
          </div>

          {/* RCCM */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#7B4BB7] mb-1.5">
              Numéro RCCM
            </label>
            <input
              {...register('rccm')}
              type="text"
              placeholder="ex: CD/KNG/RCCM/24-B-01234"
              className="w-full px-4 py-3 sm:py-2.5 bg-[#F5F2EF] border border-[#E7D9C4] rounded-xl text-base sm:text-sm focus:outline-none focus:border-[#7B4BB7] transition-colors font-medium font-mono"
            />
            <p className="text-[10px] text-gray-400 mt-1">Facultatif, mais renforce le sérieux de vos reçus.</p>
          </div>

          {/* Adresse */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#7B4BB7] mb-1.5">
              Adresse
            </label>
            <input
              {...register('address')}
              type="text"
              placeholder="ex: Gombe / Kinshasa"
              className="w-full px-4 py-3 sm:py-2.5 bg-[#F5F2EF] border border-[#E7D9C4] rounded-xl text-base sm:text-sm focus:outline-none focus:border-[#7B4BB7] transition-colors font-medium"
            />
          </div>

          {/* Téléphone + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#7B4BB7] mb-1.5">
                Téléphone
              </label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="+243..."
                className="w-full px-4 py-3 sm:py-2.5 bg-[#F5F2EF] border border-[#E7D9C4] rounded-xl text-base sm:text-sm focus:outline-none focus:border-[#7B4BB7] transition-colors font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#7B4BB7] mb-1.5">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="contact@entreprise.com"
                className="w-full px-4 py-3 sm:py-2.5 bg-[#F5F2EF] border border-[#E7D9C4] rounded-xl text-base sm:text-sm focus:outline-none focus:border-[#7B4BB7] transition-colors font-medium"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="hidden lg:block w-full py-3.5 bg-[#3B1E5D] text-white font-heading font-bold rounded-xl text-sm shadow-md hover:bg-[#3B1E5D]/90 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Enregistrement...' : businessId ? 'Enregistrer les modifications' : 'Créer mon profil'}
          </button>
        </form>
      </div>

      {/* Barre d'action fixe — mobile uniquement, cohérente avec le reste de l'app */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E7D9C4] px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="w-full py-3 bg-[#3B1E5D] text-white text-sm font-semibold rounded-md hover:bg-[#7B4BB7] transition-colors disabled:bg-gray-300 shadow-sm"
        >
          {isSubmitting ? 'Enregistrement...' : businessId ? 'Enregistrer les modifications' : 'Créer mon profil'}
        </button>
      </div>
    </div>
  );
}