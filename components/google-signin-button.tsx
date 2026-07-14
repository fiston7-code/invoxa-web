'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { checkHasBusinessProfile } from '@/lib/api/business';

// ---------------------------------------------------------------------------
// Variables d'environnement nécessaires :
//   NEXT_PUBLIC_GOOGLE_CLIENT_ID  — Client ID OAuth (type "Web application")
//   NEXT_PUBLIC_API_URL           — déjà utilisé partout ailleurs dans l'app
//
// Déclarer localhost + ton domaine de prod comme "Origines JavaScript
// autorisées" dans Google Cloud Console pour ce Client ID.
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleSignInButtonProps {
  onError?: (message: string) => void;
}

export default function GoogleSignInButton({ onError }: GoogleSignInButtonProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      console.error(
        'NEXT_PUBLIC_GOOGLE_CLIENT_ID manquant — le bouton Google ne peut pas s\'initialiser.'
      );
      return;
    }

    // Reçoit le credential (ID Token JWT) une fois que l'utilisateur a
    // confirmé son compte Google dans le popup natif.
    async function handleCredentialResponse(response: { credential: string }) {
      try {
        const res = await fetch(`${apiUrl}/v1/tokens/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: response.credential }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || 'Connexion Google refusée par le serveur.');
        }

        const data = await res.json();
        // Même token, même clé localStorage que le login par mot de passe —
        // le reste de l'app ne voit aucune différence.
        localStorage.setItem('invoxa_token', data.authentication_token.token);

        const hasCompany = await checkHasBusinessProfile();
        router.push(hasCompany ? '/dashboard' : '/onboarding/setup-company');
      } catch (err: any) {
        onError?.(err?.message || 'Une erreur est survenue avec la connexion Google.');
      }
    }

    function initializeGoogleButton() {
      if (!window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        text: 'continue_with',
        locale: 'fr',
      });
    }

    if (window.google) {
      initializeGoogleButton();
      return;
    }

    // Le script Google Identity Services n'est chargé qu'une seule fois,
    // même si ce composant est monté sur plusieurs pages (login + register).
    const existingScript = document.getElementById('google-identity-script');
    if (existingScript) {
      existingScript.addEventListener('load', initializeGoogleButton);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleButton;
    document.body.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, apiUrl]);

  if (!clientId) return null;

  return <div ref={buttonRef} className="w-full flex justify-center" />;
}