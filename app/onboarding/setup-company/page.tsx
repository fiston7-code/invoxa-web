'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function BusinessProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '', logo_url: '', rccm: '', address: '', phone: '', email: ''
  });

  const [isPending, setIsPending] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL 

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { alert("Le fichier est trop volumineux (Max 5 Mo)"); return; }

      setLogoPreview(URL.createObjectURL(file));
      setUploadingLogo(true);

      const logoFormData = new FormData();
      logoFormData.append("logo", file);

      try {
        const token = localStorage.getItem("invoxa_token");
        const response = await fetch(`${apiUrl}/v1/business/logo`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: logoFormData,
        });

        if (!response.ok) throw new Error("Erreur upload");
        const data = await response.json();
        setFormData(prev => ({ ...prev, logo_url: data.url }));
      } catch (error) {
        alert("Erreur lors de l'envoi du logo.");
        setLogoPreview(null);
      } finally {
        setUploadingLogo(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    const token = localStorage.getItem("invoxa_token");

    try {
      const response = await fetch(`${apiUrl}/v1/business`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        alert("Erreur lors de la configuration.");
      }
    } catch (error) {
      alert("Erreur serveur.");
    } finally {
      setIsPending(false);
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
          <h2 className="text-2xl font-heading font-bold text-brand-dark-purple">Votre Entreprise</h2>
          <p className="text-xs text-brand-dark-purple/60 mt-1">Configurez vos informations professionnelles</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo Upload */}
          <div className="border border-dashed border-brand-beige rounded-xl p-4 bg-brand-off-white/50 flex flex-col items-center justify-center space-y-3">
            <label className="cursor-pointer text-xs font-semibold uppercase text-brand-dark-purple hover:text-brand-mauve transition-colors">
              {uploadingLogo ? "Téléversement..." : "Ajouter un logo"}
              <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
            </label>
            {logoPreview && <img src={logoPreview} alt="Aperçu" className="h-16 w-16 object-contain rounded-lg" />}
          </div>

          {/* Inputs */}
          {[ {key: 'name', label: 'Nom de l\'entreprise'}, {key: 'rccm', label: 'RCCM'}, {key: 'address', label: 'Adresse'}, {key: 'phone', label: 'Téléphone'}, {key: 'email', label: 'Email Pro'} ].map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-dark-purple mb-1.5">{field.label}</label>
              <input 
                className="w-full px-4 py-3 bg-brand-off-white border border-brand-beige/60 rounded-xl text-sm focus:outline-none focus:border-brand-mauve transition-colors text-brand-dark-purple font-medium"
                value={(formData as any)[field.key]}
                onChange={e => setFormData({...formData, [field.key]: e.target.value})}
              />
            </div>
          ))}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isPending || uploadingLogo}
            className="w-full py-4 bg-brand-dark-purple text-brand-off-white font-heading font-bold rounded-xl text-sm shadow-md hover:bg-brand-dark-purple/90 transition-all cursor-pointer mt-4"
          >
            {isPending ? "Enregistrement..." : "Terminer la configuration"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}