


'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// Importation des icônes depuis le set "Heroicons" (très utilisé avec Tailwind)
import { HiOutlineLogout, HiOutlineClipboardList, HiOutlineEye, HiOutlineDocumentText, HiOutlineDownload, } from "react-icons/hi";
import { FaWhatsapp } from 'react-icons/fa';
import { HiOutlineCog } from 'react-icons/hi';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// npm install react-hook-form zod @hookform/resolvers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Schéma de validation
// ---------------------------------------------------------------------------

const BUSINESS_PROFILE_ROUTE = '/business/profile'; 

const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, 'Description requise'),
  quantity: z.coerce
    .number({ message: 'Quantité invalide' })
    .int('La quantité doit être un nombre entier') 
    .min(1, 'Quantité ≥ 1'),
  unit_price: z.coerce
    .number({ message: 'Prix invalide' })
    .min(0, 'Prix ≥ 0')
    .multipleOf(0.01, 'Maximum 2 décimales'),
});

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().trim().min(1, 'Numéro de reçu requis'),
  invoiceDate: z.string().min(1, 'Date requise'),
  currency: z.string().trim().min(1, 'Devise requise').max(6, 'Devise trop longue'),
  status: z.enum(['draft', 'sent', 'paid']),
  clientName: z.string().trim().min(1, 'Nom du client requis'),
  clientPhone: z.string().trim().optional().or(z.literal('')),
  clientEmail: z.string().trim().email('Email invalide').optional().or(z.literal('')),
  clientAddress: z.string().trim().optional().or(z.literal('')),
  items: z.array(invoiceItemSchema).min(1, 'Ajoutez au moins une ligne'),
  noteTitle: z.string().trim().optional().or(z.literal('')),
  noteText: z.string().trim().optional().or(z.literal('')),
});

// Type "brut" (avant coercion, ce que les inputs produisent) et type "validé"
// (après coercion Zod, ce que reçoit onGenerateInvoice)
type InvoiceFormInput = z.input<typeof invoiceFormSchema>;
type InvoiceFormOutput = z.output<typeof invoiceFormSchema>;

// Conservé pour compatibilité avec le reste de l'app
export type InvoiceItemFrontend = z.infer<typeof invoiceItemSchema>;

interface BusinessProfile {
  id: number;
  name: string;
  logo_url: string;
  rccm: string;
  address: string;
  phone: string;
  email: string;
}

interface InvoiceRecord {
  id: number;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  currency: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Numérotation automatique — repart du plus grand numéro déjà utilisé cette
// année (format FA-2026-001, FA-2026-002, ...) pour éviter les doublons.
// ---------------------------------------------------------------------------
function computeNextInvoiceNumber(list: InvoiceRecord[]): string {
  const year = new Date().getFullYear();
  const prefix = `FA-${year}-`;
  let max = 0;

  list.forEach((inv) => {
    const num = inv?.invoice_number;
    if (num && num.startsWith(prefix)) {
      const parsed = parseInt(num.slice(prefix.length), 10);
      if (!Number.isNaN(parsed) && parsed > max) max = parsed;
    }
  });

  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

const defaultFormValues: InvoiceFormInput = {
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  currency: 'USD',
  status: 'paid',
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  clientAddress: '',
  items: [{ description: '', quantity: 1, unit_price: 0 }],
  noteTitle: 'Conditions de paiement',
  noteText: "Paiement dû immédiatement à la réception de cette facture",
}

export default function InvoiceForm() {
  const [isPending, startTransition] = useTransition();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();

  // --- ÉTAT DU PROFIL ENTREPRISE ---
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);

  // --- HISTORIQUE DES FACTURES ---
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  // Distinct de loadingInvoices : reste `false` tant que le tout premier
  // appel réseau n'est pas terminé (succès, échec ou absence de token).
  const [invoicesLoaded, setInvoicesLoaded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lastInvoiceId, setLastInvoiceId] = useState<number | null>(null);

  // --- AFFICHAGE MOBILE : formulaire ou aperçu ---
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');

  // --- FORMULAIRE (react-hook-form + zod) ---
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<InvoiceFormInput, unknown, InvoiceFormOutput>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onBlur',
  });



  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Valeurs live pour l'aperçu temps réel
  const formValues = watch();
  const calculatedTotalAmount = (formValues.items ?? []).reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0) * (Number(item?.unit_price) || 0),
    0
  );

  // Charger les factures de l'utilisateur connecté
  useEffect(() => {
    async function loadInvoices() {
      const token = localStorage.getItem('invoxa_token');
      if (!token) {
        setInvoicesLoaded(true);
        return;
      }

      setLoadingInvoices(true);
      try {
        const response = await fetch(`${apiUrl}/v1/invoices`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('Erreur lors du chargement des factures');
          return;
        }

        const data = await response.json();

        if (data?.invoices) {
          setInvoices(data.invoices);
        } else if (Array.isArray(data)) {
          setInvoices(data);
        }
      } catch (err) {
        console.error("Erreur lors du chargement de l'historique:", err);
      } finally {
        setLoadingInvoices(false);
        setInvoicesLoaded(true);
      }
    }

    loadInvoices();
  }, [apiUrl]);

  // Pré-remplit le numéro dès que l'historique réel est disponible — plus
  // de race condition : on attend `invoicesLoaded`, pas juste `!loadingInvoices`
  // (qui valait `false` avant même le premier fetch).
  useEffect(() => {
    if (invoicesLoaded && !getValues('invoiceNumber')) {
      setValue('invoiceNumber', computeNextInvoiceNumber(invoices));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoicesLoaded, invoices]);

  const handleLogout = () => {
    localStorage.removeItem('invoxa_token');
    router.push('/login');
  };

  // --- CHARGEMENT DU PROFIL ENTREPRISE ---
  useEffect(() => {
    async function loadBusinessProfile() {
      try {
        const token = localStorage.getItem('invoxa_token');

        if (!token) {
          console.error('Pas de token trouvé');
          setLoadingBusiness(false);
          return;
        }

        const response = await fetch(`${apiUrl}/v1/business`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data?.business_profile) {
          setBusiness(data.business_profile);
        } else if (data?.business) {
          setBusiness(data.business);
        } else {
          setBusiness(data);
        }
      } catch (err) {
        console.error('Erreur lors du chargement du profil:', err);
      } finally {
        setLoadingBusiness(false);
      }
    }

    loadBusinessProfile();
  }, [apiUrl]);

  const handleAddItem = () => append({ description: '', quantity: 1, unit_price: 0 });

  const handleRemoveItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      setValue(`items.0`, { description: '', quantity: 1, unit_price: 0 });
    }
  };

  const initials = business?.name ? business.name.slice(0, 2).toUpperCase() : 'KT';

  // --- SOUMISSION ET GÉNÉRATION (déclenchée via handleSubmit(onGenerateInvoice)) ---
  const onGenerateInvoice = (data: InvoiceFormOutput) => {
    if (!business) {
      alert("Le profil de l'entreprise n'est pas encore chargé depuis le serveur Go.");
      return;
    }

    // Anti-doublon : si le numéro validé existe déjà dans l'historique, on
    // le recalcule silencieusement avant d'envoyer la requête.
    let finalInvoiceNumber = data.invoiceNumber;
    if (invoices.some((inv) => inv.invoice_number === finalInvoiceNumber)) {
      finalInvoiceNumber = computeNextInvoiceNumber(invoices);
      setValue('invoiceNumber', finalInvoiceNumber);
    }

    startTransition(async () => {
      try {
        const token = localStorage.getItem('invoxa_token');
        if (!token) {
          alert('Vous devez être connecté pour générer une facture.');
          return;
        }

        const payload = {
          business_profile_id: business.id,
          invoice_number: finalInvoiceNumber,
          invoice_date: new Date(data.invoiceDate).toISOString(),
          client_name: data.clientName,
          client_phone: data.clientPhone || undefined,
          client_email: data.clientEmail || undefined,
          client_address: data.clientAddress || undefined,
          total_amount: Math.round(calculatedTotalAmount * 100),
          currency: data.currency,
          note_title: data.noteTitle || undefined,
          note_text: data.noteText || undefined,
          status: data.status,
          items: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: Math.round(item.unit_price * 100),
          })),
        };

        const response = await fetch(`${apiUrl}/v1/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          try {
            const errorData = await response.json();
            console.error("Détails de l'erreur renvoyée par Go :", errorData);
            alert(`Erreur Go : ${JSON.stringify(errorData)}`);
          } catch {
            alert(`Le serveur Go a répondu avec le code : ${response.status}`);
          }
          throw new Error('Erreur lors de la création de la facture');
        }

        const result = await response.json();
        const invoiceId = result.invoice.id;
        setLastInvoiceId(invoiceId);

        const newRecord: InvoiceRecord = {
          id: invoiceId,
          invoice_number: finalInvoiceNumber,
          client_name: data.clientName,
          total_amount: Math.round(calculatedTotalAmount * 100),
          currency: data.currency,
          status: data.status,
        };
        const updatedInvoices = [newRecord, ...invoices];
        setInvoices(updatedInvoices);
        setValue('invoiceNumber', computeNextInvoiceNumber(updatedInvoices));
        setMobileView('preview');

        const pdfResponse = await fetch(`${apiUrl}/v1/invoices/${invoiceId}/pdf`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!pdfResponse.ok) throw new Error('Erreur lors de la génération du PDF');

        const pdfBlob = await pdfResponse.blob();
        const pdfUrl = window.URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
      } catch (err) {
        alert('Une erreur est survenue lors de la génération du document.');
        console.error(err);
      }
    });
  };

  const submitInvoice = handleSubmit(onGenerateInvoice, (validationErrors) => {
    // Zod a bloqué la soumission — on bascule sur le formulaire pour que
    // les messages d'erreur soient visibles, y compris sur mobile.
    console.warn('Validation échouée :', validationErrors);
    setMobileView('form');
  });

  const handleShareWithPDF = async () => {
    const { clientPhone, clientName, invoiceNumber } = getValues();

    if (!business || !clientPhone || !lastInvoiceId) {
      alert('Numéro client manquant ou pas de facture générée');
      return;
    }

    try {
      const token = localStorage.getItem('invoxa_token');

      const pdfResponse = await fetch(`${apiUrl}/v1/invoices/${lastInvoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!pdfResponse.ok) throw new Error('Erreur PDF');

      const pdfBlob = await pdfResponse.blob();

      const downloadLink = document.createElement('a');
      downloadLink.href = window.URL.createObjectURL(pdfBlob);
      downloadLink.download = `invoice-${invoiceNumber}.pdf`;
      downloadLink.click();

      setTimeout(() => {
        const phoneNumber = clientPhone.replace(/\s+/g, '');
        const message = encodeURIComponent(
          `Bonjour ${clientName}, voici votre reçu N°${invoiceNumber}. Montant: ${calculatedTotalAmount.toFixed(2)} ${formValues.currency}`
        );
        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
      }, 500);
    } catch (error) {
      alert('Erreur lors de la génération du PDF');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EF] text-[#3B1E5D] font-sans pb-24 lg:pb-0">
      {/* ---------------------------------------------------------------- */}
      {/* HEADER */}
      {/* ---------------------------------------------------------------- */}
      <header className="bg-white border-b border-[#E7D9C4] px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 z-40 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 shrink-0 bg-[#3B1E5D] rounded-lg flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-[#3B1E5D] truncate">
              {loadingBusiness ? 'Chargement...' : `${business?.name ?? 'Entreprise'}`}
            </h1>
            <p className="text-[10px] text-gray-400 truncate hidden sm:block">
              {loadingBusiness ? 'Chargement...' : `${business?.address ?? 'Adresse non définie'}`}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <Link
  href={BUSINESS_PROFILE_ROUTE}
  className="px-4 py-2 bg-white text-[#3B1E5D] text-xs font-semibold rounded-md border border-[#E7D9C4] hover:bg-[#F5F2EF] transition-colors shadow-sm"
>
  <div className="flex justify-center gap-2">
    <HiOutlineCog size={18} />
    <span>Profil entreprise</span>
  </div>
</Link>
          <button
            onClick={handleShareWithPDF}
            disabled={!lastInvoiceId}
            className="px-4 py-2 bg-green-500 text-white text-xs font-semibold rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-300 shadow-sm"
          >
            <div className="flex justify-center gap-2">
              <FaWhatsapp size={20} />
              <span>Partager WhatsApp</span>
            </div>
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="px-4 py-2 bg-[#7B4BB7] text-white text-xs font-semibold rounded-md hover:bg-[#3B1E5D] transition-colors shadow-sm"
          >
             <div className="flex justify-center gap-2">
              <HiOutlineClipboardList size={20} />
              <span>Historique({invoices.length})</span>
            </div>
          </button>
          <button
            onClick={submitInvoice}
            disabled={isPending || loadingBusiness}
            className="px-5 py-2 bg-[#3B1E5D] text-white text-xs font-semibold rounded-md hover:bg-[#7B4BB7] transition-colors disabled:bg-gray-300 shadow-sm"
          >
          <div className="flex justify-center gap-2">
      <HiOutlineDownload size={20} />
      <span>Générer le recu PDF</span>
    </div>
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white text-xs font-semibold rounded-md hover:bg-red-600 transition-colors shadow-sm"
          >
            <div className="flex justify-center gap-2">
              <HiOutlineLogout size={18} />
              <span>Déconnexion</span>
              </div>
        
          </button>
        </div>

        {/* header sur mobile  */}

        <div className="flex lg:hidden items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowHistory(true)}
            aria-label="Historique"
            className="relative p-2.5 rounded-md border border-[#E7D9C4] text-[#3B1E5D] active:bg-[#F5F2EF]"
          >
            <HiOutlineClipboardList size={20} />
            {invoices.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#7B4BB7] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {invoices.length}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            aria-label="Déconnexion"
            className="p-2.5 rounded-md border border-red-200 text-red-500 active:bg-red-50"
          >
            <HiOutlineLogout size={18} />
          </button>

          <Link
  href={BUSINESS_PROFILE_ROUTE}
  aria-label="Profil entreprise"
  className="p-2.5 rounded-md border border-[#E7D9C4] text-[#3B1E5D] active:bg-[#F5F2EF]"
>
  <HiOutlineCog size={20} />
</Link>

        </div>
      </header>

      {/* Bascule Formulaire / Aperçu — mobile uniquement */}
      <div className="lg:hidden sticky top-[53px] z-30 bg-[#F5F2EF]/95 backdrop-blur border-b border-[#E7D9C4] px-3 py-2 flex gap-2">
        <button
          onClick={() => setMobileView('form')}
          className={`flex-1 text-xs font-semibold py-2 rounded-md transition-colors ${
            mobileView === 'form'
              ? 'bg-[#3B1E5D] text-white'
              : 'bg-white text-[#3B1E5D] border border-[#E7D9C4]'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
          <HiOutlineDocumentText size={24} /> Formulaire
        </div>
        </button>
        <button
          onClick={() => setMobileView('preview')}
          className={`flex-1 text-xs font-semibold py-2 rounded-md transition-colors ${
            mobileView === 'preview'
              ? 'bg-[#3B1E5D] text-white'
              : 'bg-white text-[#3B1E5D] border border-[#E7D9C4]'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
        <HiOutlineEye size={20} />
          Aperçu
          </div>
        </button>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* WORKSPACE */}
      {/* ---------------------------------------------------------------- */}
      <div className="max-w-[1600px] mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-start">
        {/* PANNEAU DE SAISIE */}
        <form
          onSubmit={submitInvoice}
          className={`${
            mobileView === 'form' ? 'block' : 'hidden'
          } lg:block lg:col-span-5 bg-white rounded-xl border border-[#E7D9C4] p-4 sm:p-5 space-y-6 lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto shadow-xs`}
        >
          {/* 1. Paramètres Document */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7B4BB7] border-b border-gray-100 pb-1">
              1. Paramètres du Document
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-1">
                  N° Facture *
                </label>
                <input
                  type="text"
                  placeholder="ex: FA-2026-001"
                  {...register('invoiceNumber')}
                  className="w-full text-base sm:text-xs p-2.5 sm:p-2 border border-gray-200 rounded-md focus:border-[#7B4BB7] outline-none"
                />
                {errors.invoiceNumber ? (
                  <p className="text-[10px] text-red-500 mt-1">{errors.invoiceNumber.message}</p>
                ) : (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Généré automatiquement, modifiable si besoin.
                  </p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-1">Date</label>
                <input
                  type="date"
                  {...register('invoiceDate')}
                  className="w-full text-base sm:text-xs p-2.5 sm:p-2 border border-gray-200 rounded-md focus:border-[#7B4BB7] outline-none"
                />
                {errors.invoiceDate && (
                  <p className="text-[10px] text-red-500 mt-1">{errors.invoiceDate.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-1">Devise</label>
                <input
                  type="text"
                  placeholder="USD"
                  {...register('currency')}
                  className="w-full text-base sm:text-xs p-2.5 sm:p-2 border border-gray-200 rounded-md focus:border-[#7B4BB7] outline-none font-mono"
                />
                {errors.currency && (
                  <p className="text-[10px] text-red-500 mt-1">{errors.currency.message}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-1">Statut</label>
                <select
                  {...register('status')}
                  className="w-full text-base sm:text-xs p-2.5 sm:p-2 border border-gray-200 rounded-md bg-white focus:border-[#7B4BB7] outline-none"
                >
                  <option value="sent">Envoyé (sent)</option>
                  <option value="paid">Payé (paid)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Client */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7B4BB7] border-b border-gray-100 pb-1">
              2. Bloc Destinataire
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-1">
                  Nom du Client *
                </label>
                <input
                  type="text"
                  placeholder="Nom ou Raison sociale"
                  {...register('clientName')}
                  className="w-full text-base sm:text-xs p-2.5 sm:p-2 border border-gray-200 rounded-md focus:border-[#7B4BB7] outline-none"
                />
                {errors.clientName && (
                  <p className="text-[10px] text-red-500 mt-1">{errors.clientName.message}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-1">
                  Téléphone Client
                </label>
                <input
                  type="tel"
                  placeholder="+243..."
                  {...register('clientPhone')}
                  className="w-full text-base sm:text-xs p-2.5 sm:p-2 border border-gray-200 rounded-md focus:border-[#7B4BB7] outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-1">
                  Email Client
                </label>
                <input
                  type="email"
                  placeholder="client@mail.com"
                  {...register('clientEmail')}
                  className="w-full text-base sm:text-xs p-2.5 sm:p-2 border border-gray-200 rounded-md focus:border-[#7B4BB7] outline-none"
                />
                {errors.clientEmail && (
                  <p className="text-[10px] text-red-500 mt-1">{errors.clientEmail.message}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-1">
                  Adresse Client
                </label>
                <input
                  type="text"
                  placeholder="Adresse complète"
                  {...register('clientAddress')}
                  className="w-full text-base sm:text-xs p-2.5 sm:p-2 border border-gray-200 rounded-md focus:border-[#7B4BB7] outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Items */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-gray-100 pb-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7B4BB7]">
                3. Lignes de Prestations
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-[10px] font-bold text-[#3B1E5D] bg-[#F5F2EF] px-2.5 py-1.5 rounded-md border border-[#E7D9C4] hover:bg-white transition-colors"
              >
                + Ajouter une ligne
              </button>
            </div>

            {errors.items?.message && (
              <p className="text-[10px] text-red-500">{errors.items.message}</p>
            )}

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="p-3 bg-gray-50/60 rounded-lg border border-gray-150 space-y-2"
              >
                <input
                  type="text"
                  placeholder="Description de la prestation"
                  {...register(`items.${index}.description`)}
                  className="w-full text-base sm:text-xs p-2.5 sm:p-2 border border-gray-200 rounded-md outline-none focus:border-[#7B4BB7]"
                />
                {errors.items?.[index]?.description && (
                  <p className="text-[10px] text-red-500">
                    {errors.items[index]?.description?.message}
                  </p>
                )}
                <div className="flex gap-2">
                  <div className="w-16 sm:w-20">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qté"
                      {...register(`items.${index}.quantity`)}
                      className="w-full text-base sm:text-xs p-2 sm:p-1.5 border border-gray-200 rounded-md text-center outline-none"
                    />
                  </div>
                  <div className="flex-grow">
                    <input
                      type="number"
                      placeholder="Prix unitaire"
                      {...register(`items.${index}.unit_price`)}
                      className="w-full text-base sm:text-xs p-2 sm:p-1.5 border border-gray-200 rounded-md text-right outline-none font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    aria-label="Supprimer la ligne"
                    className="text-red-400 hover:text-red-600 text-sm px-2 shrink-0"
                  >
                    ✕
                  </button>
                </div>
                {(errors.items?.[index]?.quantity || errors.items?.[index]?.unit_price) && (
                  <p className="text-[10px] text-red-500">
                    {errors.items[index]?.quantity?.message || errors.items[index]?.unit_price?.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* 4. Notes */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7B4BB7] border-b border-gray-100 pb-1">
              4. Notes de bas de page
            </h3>
            <input
              type="text"
              placeholder="Titre de la note"
              {...register('noteTitle')}
              className="w-full text-base sm:text-xs p-2.5 sm:p-2 border border-gray-200 rounded-md outline-none focus:border-[#7B4BB7]"
            />
            <textarea
              rows={2}
              placeholder="Texte de la note ou instructions de virement..."
              {...register('noteText')}
              className="w-full text-base sm:text-xs p-2.5 sm:p-2 border border-gray-200 rounded-md outline-none resize-none focus:border-[#7B4BB7]"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || loadingBusiness}
            className="lg:hidden w-full py-3 bg-[#3B1E5D] text-white text-sm font-semibold rounded-md hover:bg-[#7B4BB7] transition-colors disabled:bg-gray-300 shadow-sm"
          >
          {isPending ? (
    "Génération du PDF..."
  ) : (
    <>
    <div className="flex justify-center gap-2">
      <HiOutlineDownload size={20} />
      <span>Générer le recu PDF</span>
    </div>
    </>
  )}
          </button>
        </form>

        {/* PANNEAU HISTORIQUE */}
        {showHistory && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[999] sm:p-4">
            <div className="bg-white w-full sm:max-w-2xl sm:rounded-lg rounded-t-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-lg">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                <h2 className="text-lg sm:text-xl font-bold text-[#3B1E5D]">Historique des reçus</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none p-1"
                  aria-label="Fermer"
                >
                  ✕
                </button>
              </div>

              {loadingInvoices ? (
                <p className="text-center text-gray-500 py-6">Chargement...</p>
              ) : invoices.length === 0 ? (
                <p className="text-center text-gray-500 py-6">Aucune facture pour le moment</p>
              ) : (
                <>
                  <div className="sm:hidden space-y-2">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="border border-gray-200 rounded-lg p-3 flex flex-col gap-1.5"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[#3B1E5D] text-sm">
                            {invoice.invoice_number}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : invoice.status === 'sent'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {invoice.status}
                          </span>
                        </div>
                        <span className="text-xs text-gray-600">{invoice.client_name}</span>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-sm font-bold text-[#3B1E5D]">
                            {(invoice.total_amount / 100).toFixed(2)} {invoice.currency}
                          </span>
                          <button
                            onClick={() => {
                              const token = localStorage.getItem('invoxa_token');
                              fetch(`${apiUrl}/v1/invoices/${invoice.id}/pdf`, {
                                headers: { Authorization: `Bearer ${token}` },
                              })
                                .then((r) => r.blob())
                                .then((blob) => {
                                  const url = window.URL.createObjectURL(blob);
                                  window.open(url, '_blank');
                                });
                            }}
                            className="px-3 py-1.5 bg-[#7B4BB7] text-white text-xs rounded-md hover:bg-[#3B1E5D]"
                          >
                            📥 PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <table className="hidden sm:table w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#3B1E5D] text-white">
                        <th className="p-3 text-left">N° Facture</th>
                        <th className="p-3 text-left">Client</th>
                        <th className="p-3 text-right">Montant</th>
                        <th className="p-3 text-left">Statut</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="p-3 font-bold text-[#3B1E5D]">{invoice.invoice_number}</td>
                          <td className="p-3">{invoice.client_name}</td>
                          <td className="p-3 text-right font-mono">
                            {(invoice.total_amount / 100).toFixed(2)} {invoice.currency}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                invoice.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : invoice.status === 'sent'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                const token = localStorage.getItem('invoxa_token');
                                fetch(`${apiUrl}/v1/invoices/${invoice.id}/pdf`, {
                                  headers: { Authorization: `Bearer ${token}` },
                                })
                                  .then((r) => r.blob())
                                  .then((blob) => {
                                    const url = window.URL.createObjectURL(blob);
                                    window.open(url, '_blank');
                                  });
                              }}
                              className="px-3 py-1 bg-[#7B4BB7] text-white text-xs rounded hover:bg-[#3B1E5D]"
                            >
                              📥 PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        )}

        {/* PANNEAU DE PRÉVISUALISATION */}
        <div
          className={`${
            mobileView === 'preview' ? 'flex' : 'hidden'
          } lg:flex lg:col-span-7 justify-center lg:sticky lg:top-[100px]`}
        >
          <div className="w-full max-w-[800px] bg-white border border-[#E7D9C4] shadow-md p-5 sm:p-8 md:p-12 flex flex-col justify-between text-black rounded-sm text-xs sm:text-sm">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                <div>
                  <div className="flex flex-col items-start">
                    {business?.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={business.logo_url}
                        alt={`Logo ${business.name}`}
                        className="h-12 sm:h-14 max-w-[160px] sm:max-w-[180px] object-contain mb-1"
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-4xl sm:text-5xl font-serif text-[#3B1E5D] font-extrabold leading-none tracking-tighter">
                          {initials}
                        </span>
                      </div>
                    )}

                    <span className="text-[8px] text-gray-400 tracking-widest uppercase border-t border-gray-100 mt-1">
                      {business?.name ? business.name : 'Chargement...'}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-400 font-mono mt-3 max-w-[280px] leading-tight">
                    {business?.rccm ? business.rccm : 'RCCM ————————'}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <h2 className="text-2xl sm:text-4xl font-sans font-bold tracking-tight text-[#3B1E5D]">
                    Reçu
                  </h2>
                  <p className="text-xs font-bold text-gray-800 mt-1">
                    N°: {formValues.invoiceNumber || '————'}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium">
                    Date: {formValues.invoiceDate || '—'}
                  </p>
                </div>
              </div>

              <div className="my-6 sm:my-10 text-xs border-l-2 border-[#7B4BB7]/30 pl-4 py-0.5">
                <span className="text-gray-400 uppercase text-[9px] block font-bold tracking-wider mb-1">
                  Client :
                </span>
                <p className="text-sm font-bold text-[#3B1E5D]">
                  {formValues.clientName || '[Destinataire]'}
                </p>
                {formValues.clientPhone && (
                  <p className="text-gray-600 mt-0.5">Tél : {formValues.clientPhone}</p>
                )}
                {formValues.clientEmail && (
                  <p className="text-gray-600">Email : {formValues.clientEmail}</p>
                )}
                {formValues.clientAddress && (
                  <p className="text-gray-600">Adresse : {formValues.clientAddress}</p>
                )}
              </div>

              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full text-[11px] sm:text-xs border border-collapse border-gray-100 rounded-md overflow-hidden min-w-[300px]">
                  <thead>
                    <tr className="bg-[#3B1E5D] text-white font-serif italic">
                      <th className="p-2 sm:p-3 text-left font-normal w-3/5">Description</th>
                      <th className="p-2 sm:p-3 text-center font-normal w-1/5">Qté</th>
                      <th className="p-2 sm:p-3 text-right font-normal w-1/5">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-[#3B1E5D]/5">
                    {(formValues.items ?? []).map((item, i) => (
                      <tr key={i}>
                        <td className="p-2 sm:p-3 text-gray-700 font-medium whitespace-pre-line">
                          {item?.description || '[Libellé prestation]'}
                        </td>
                        <td className="p-2 sm:p-3 text-center text-gray-500">{String(item?.quantity ?? '')}</td>
                        <td className="p-2 sm:p-3 text-right text-gray-900 font-bold font-mono">
                          {((Number(item?.quantity) || 0) * (Number(item?.unit_price) || 0)).toFixed(2)}{' '}
                          {formValues.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-4">
                <div className="text-right border-t border-gray-100 pt-2 min-w-[140px]">
                  <p className="text-[10px] font-serif font-bold italic text-gray-400">Total TTC</p>
                  <p className="text-lg sm:text-xl font-black text-[#3B1E5D] font-mono">
                    {calculatedTotalAmount.toFixed(2)} {(formValues.currency ?? '').toUpperCase()}
                  </p>
                </div>
              </div>

              {(formValues.noteTitle || formValues.noteText) && (
                <div className="mt-6 sm:mt-8 p-3.5 bg-[#F5F2EF]/50 border border-dashed border-[#E7D9C4] rounded">
                  {formValues.noteTitle && (
                    <p className="text-[10px] font-bold text-gray-800 italic mb-0.5">
                      {formValues.noteTitle}
                    </p>
                  )}
                  {formValues.noteText && (
                    <p className="text-[10px] text-gray-500 leading-relaxed italic">
                      {formValues.noteText}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-t border-gray-100 pt-4 mt-8 sm:mt-12 text-[9px] text-gray-400 font-mono">
              <div className="space-y-0.5">
                <p>📍 {business?.address ? business.address : '————'}</p>
                <p>📞 {business?.phone ? business.phone : '————'}</p>
                <p>✉️ {business?.email ? business.email : '————'}</p>
              </div>

              <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-dashed border-[#3B1E5D]/20 rounded-full flex flex-col items-center justify-center rotate-12 select-none self-start sm:self-auto">
                <span className="text-[5px] font-bold text-gray-400">STATUT</span>
                <span className="text-[7px] sm:text-[8px] font-black text-[#3B1E5D] uppercase">
                  {formValues.status}
                </span>
                <span className="text-[4px] text-gray-400 font-sans">SYS-V1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* BARRE D'ACTIONS FIXE — MOBILE UNIQUEMENT */}
      {/* ---------------------------------------------------------------- */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E7D9C4] px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex gap-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <button
          onClick={handleShareWithPDF}
          disabled={!lastInvoiceId}
          className="flex-1 py-3 bg-green-500 text-white text-xs font-semibold rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-300 shadow-sm"
        >
          <div className="flex justify-center gap-2">
            <FaWhatsapp size={20} />
            <span> WhatsApp</span>
            </div> 
        </button>
        <button
          onClick={submitInvoice}
          disabled={isPending || loadingBusiness}
          className="flex-[2] py-3 bg-[#3B1E5D] text-white text-xs font-semibold rounded-md hover:bg-[#7B4BB7] transition-colors disabled:bg-gray-300 shadow-sm"
        >
          <div className="flex justify-center gap-2">
      <HiOutlineDownload size={20} />
      <span>Générer le recu PDF</span>
    </div>
        </button>
      </div>
    </div>
  );
}