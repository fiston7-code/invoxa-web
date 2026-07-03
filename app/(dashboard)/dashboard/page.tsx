'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';




export interface InvoiceItemFrontend {
  description: string;
  quantity: number;
  unit_price: number; 
}

interface BusinessProfile {
  id: number;
  name: string;
  logo_url: string;
  rccm: string;
  address: string;
  phone: string;
  email: string;
}

export default function InvoiceForm() {
  const [isPending, startTransition] = useTransition();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL 

  // --- ÉTAT DU PROFIL ENTREPRISE ---
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);

  // --- ÉTATS DU FORMULAIRE ---
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('USD');
  const [status, setStatus] = useState('draft');

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  const [items, setItems] = useState<InvoiceItemFrontend[]>([
    { description: '', quantity: 1, unit_price: 0 }
  ]);

  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');


  // Receipt history

// --- HISTORIQUE DES FACTURES ---
const [invoices, setInvoices] = useState<any[]>([]);
const [loadingInvoices, setLoadingInvoices] = useState(false);
const [showHistory, setShowHistory] = useState(false);
const [lastInvoiceId, setLastInvoiceId] = useState<number | null>(null);


// Charger les factures de l'user connecté
useEffect(() => {
  async function loadInvoices() {
    try {
      const token = localStorage.getItem("invoxa_token");
      if (!token) return;

      setLoadingInvoices(true);
      const response = await fetch(`${apiUrl}/v1/invoices`, {
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Erreur lors du chargement des factures");
        return;
      }

      const data = await response.json();
      console.log("Factures reçues:", data);
      
      // S'adapter à la structure de réponse
      if (data?.invoices) {
        setInvoices(data.invoices);
      } else if (Array.isArray(data)) {
        setInvoices(data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement de l'historique:", err);
    } finally {
      setLoadingInvoices(false);
    }
  }

  loadInvoices();
}, [apiUrl]);


  //logout button
  const router = useRouter();

const handleLogout = () => {
  localStorage.removeItem("invoxa_token");
  router.push("/login");
};

  // --- CHARGEMENT DU PROFIL ENTREPRISE (ID 2 = COMON-SIZ) ---
 useEffect(() => {
  async function loadBusinessProfile() {
    try {
      const token = localStorage.getItem("invoxa_token");  //  Récupère le token
      
      if (!token) {
        console.error("Pas de token trouvé");
        setLoadingBusiness(false);
        return;
      }

      //  CORRECT: /v1/business (sans ID) + Token dans le header
      const response = await fetch(`${apiUrl}/v1/business`, {
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${token}`,  
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Business profile reçu:", data);
      
      // Adapter selon la structure de réponse
      if (data?.business_profile) {
        setBusiness(data.business_profile);
      } else if (data?.business) {
        setBusiness(data.business);
      } else {
        setBusiness(data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement du profil:", err);
    } finally {
      setLoadingBusiness(false);
    }
  }

  loadBusinessProfile();
}, [apiUrl]);

  // --- ACTIONS SUR LES LIGNES ---
  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleUpdateItem = (index: number, fields: Partial<InvoiceItemFrontend>) => {
    setItems(items.map((item, i) => i === index ? { ...item, ...fields } : item));
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      setItems([{ description: '', quantity: 1, unit_price: 0 }]);
    }
  };

  const calculatedTotalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  // --- SOUMISSION ET GÉNÉRATION ---
const handleGenerateInvoice = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!invoiceNumber || !clientName) {
    alert("Veuillez remplir au moins le numéro de facture et le nom du client.");
    return;
  }
  if (!business) {
    alert("Le profil de l'entreprise n'est pas encore chargé depuis le serveur Go.");
    return;
  }

  startTransition(async () => {
    try {
      const token = localStorage.getItem("invoxa_token");
      
      if (!token) {
        alert("Vous devez être connecté pour générer une facture.");
        return;
      }

      const payload = {
        business_profile_id: business.id,
        invoice_number: invoiceNumber,
        invoice_date: new Date(invoiceDate).toISOString(),
        client_name: clientName,
        client_phone: clientPhone || undefined,
        client_email: clientEmail || undefined,
        client_address: clientAddress || undefined,
        total_amount: Math.round(calculatedTotalAmount * 100), 
        currency: currency,
        note_title: noteTitle || undefined,
        note_text: noteText || undefined,
        status: status,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: Math.round(item.unit_price * 100)
        }))
      };

      const response = await fetch(`${apiUrl}/v1/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      
      // ✅ STOCKER L'ID POUR LE BOUTON WHATSAPP
      setLastInvoiceId(invoiceId);

      const pdfResponse = await fetch(`${apiUrl}/v1/invoices/${invoiceId}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!pdfResponse.ok) throw new Error('Erreur lors de la génération du PDF');

      const pdfBlob = await pdfResponse.blob();
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      
      window.open(pdfUrl, '_blank');

    } catch (err) {
      alert("Une erreur est survenue lors de la génération du document.");
      console.error(err);
    }
  });
};

const handleShareWithPDF = async () => {
  if (!business || !clientPhone || !lastInvoiceId) {
    alert("Numéro client manquant ou pas de facture générée");
    return;
  }

  try {
    const token = localStorage.getItem("invoxa_token");
    
    // Générer le PDF
    const pdfResponse = await fetch(`${apiUrl}/v1/invoices/${lastInvoiceId}/pdf`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!pdfResponse.ok) throw new Error('Erreur PDF');

    const pdfBlob = await pdfResponse.blob();
    
    // Télécharger le PDF
    const downloadLink = document.createElement('a');
    downloadLink.href = window.URL.createObjectURL(pdfBlob);
    downloadLink.download = `invoice-${invoiceNumber}.pdf`;
    downloadLink.click();

    // Ouvrir WhatsApp
    setTimeout(() => {
      const phoneNumber = clientPhone.replace(/\s+/g, '');
      const message = encodeURIComponent(
        `Bonjour ${clientName}, voici votre reçu N°${invoiceNumber}. Montant: ${calculatedTotalAmount.toFixed(2)} ${currency}`
      );
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    }, 500);

  } catch (error) {
    alert("Erreur lors de la génération du PDF");
  }
};

  return (
    <div className="min-h-screen bg-[#F5F2EF] text-[#3B1E5D] font-sans">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-[#E7D9C4] px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#3B1E5D] rounded-lg flex items-center justify-center text-white text-xs font-bold">
            {business?.name ? business.name.slice(0, 2).toUpperCase() : 'KT'}
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#3B1E5D]">
              {loadingBusiness ? 'Chargement de l\'entreprise...' : `${business?.name} — Facturation`}
            </h1>
            <p className="text-[10px] text-gray-400">Profil synchronisé dynamiquement depuis l'API Go</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
  onClick={handleShareWithPDF}
  disabled={!lastInvoiceId}
  className="px-4 py-2 bg-green-500 text-white text-xs font-semibold rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-300 shadow-sm"
>
  💬 Partager WhatsApp
</button>

          <button 
  onClick={() => setShowHistory(!showHistory)}
  className="px-4 py-2 bg-[#7B4BB7] text-white text-xs font-semibold rounded-md hover:bg-[#3B1E5D] transition-colors shadow-sm"
>
  📋 Historique ({invoices.length})
</button>
          <button 
            onClick={handleGenerateInvoice} 
            disabled={isPending || loadingBusiness} 
            className="px-5 py-2 bg-[#3B1E5D] text-white text-xs font-semibold rounded-md hover:bg-[#7B4BB7] transition-colors disabled:bg-gray-300 shadow-sm"
          >
            {isPending ? 'Génération du PDF...' : '🚀 Générer la Facture PDF'}
          </button>

           {/* NOUVEAU: Bouton Logout */}
  <button 
    onClick={handleLogout}
    className="px-4 py-2 bg-red-500 text-white text-xs font-semibold rounded-md hover:bg-red-600 transition-colors shadow-sm"
  >
    🚪 Déconnexion
  </button>
        </div>
      </header>

      {/* Workspace */}
      <div className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* PANNEAU DE SAISIE (GAUCHE) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#E7D9C4] p-5 space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto shadow-xs">
          
          {/* 1. Paramètres Document */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7B4BB7] border-b border-gray-100 pb-1">1. Paramètres du Document</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-0.5">N° Facture *</label>
                <input type="text" placeholder="ex: FA-2026-001" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded focus:border-[#7B4BB7] outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Date</label>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded focus:border-[#7B4BB7] outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Devise</label>
                <input type="text" placeholder="USD" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded focus:border-[#7B4BB7] outline-none font-mono" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Statut</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded bg-white focus:border-[#7B4BB7] outline-none">
                  <option value="draft">Brouillon (draft)</option>
                  <option value="sent">Envoyé (sent)</option>
                  <option value="paid">Payé (paid)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Client */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7B4BB7] border-b border-gray-100 pb-1">2. Bloc Destinataire</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Nom du Client *</label>
                <input type="text" placeholder="Nom ou Raison sociale" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded focus:border-[#7B4BB7] outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Téléphone Client</label>
                <input type="text" placeholder="+243..." value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded focus:border-[#7B4BB7] outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Email Client</label>
                <input type="email" placeholder="client@mail.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded focus:border-[#7B4BB7] outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Adresse Client</label>
                <input type="text" placeholder="Adresse complète" value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded focus:border-[#7B4BB7] outline-none" />
              </div>
            </div>
          </div>

          {/* 3. Items */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-gray-100 pb-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7B4BB7]">3. Lignes de Prestations (`items`)</h3>
              <button type="button" onClick={handleAddItem} className="text-[10px] font-bold text-[#3B1E5D] bg-[#F5F2EF] px-2 py-0.5 rounded border border-[#E7D9C4] hover:bg-white transition-colors">+ Ajouter une ligne</button>
            </div>
            
            {items.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50/60 rounded-lg border border-gray-150 space-y-2">
                <input type="text" placeholder="Description de la prestation" value={item.description} onChange={e => handleUpdateItem(index, { description: e.target.value })} className="w-full text-xs p-2 border border-gray-200 rounded outline-none focus:border-[#7B4BB7]" />
                <div className="flex gap-2">
                  <div className="w-20">
                    <input type="number" min="1" placeholder="Qté" value={item.quantity} onChange={e => handleUpdateItem(index, { quantity: Number(e.target.value) })} className="w-full text-xs p-1.5 border border-gray-200 rounded text-center outline-none" />
                  </div>
                  <div className="flex-grow">
                    <input type="number" placeholder="Prix unitaire" value={item.unit_price || ''} onChange={e => handleUpdateItem(index, { unit_price: Number(e.target.value) })} className="w-full text-xs p-1.5 border border-gray-200 rounded text-right outline-none font-mono" />
                  </div>
                  <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* 4. Notes */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7B4BB7] border-b border-gray-100 pb-1">4. Notes de bas de page</h3>
            <input type="text" placeholder="Titre de la note" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded outline-none focus:border-[#7B4BB7]" />
            <textarea rows={2} placeholder="Texte de la note ou instructions de virement..." value={noteText} onChange={e => setNoteText(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded outline-none resize-none focus:border-[#7B4BB7]" />
          </div>

        </div>


       {/* PANNEAU HISTORIQUE */}
{showHistory && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]">
    <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[#3B1E5D]">Historique des reçus</h2>
        <button
          onClick={() => setShowHistory(false)}
          className="text-gray-500 hover:text-gray-700 text-2xl"
        >
          ✕
        </button>
      </div>

      {loadingInvoices ? (
        <p className="text-center text-gray-500">Chargement...</p>
      ) : invoices.length === 0 ? (
        <p className="text-center text-gray-500">Aucune facture pour le moment</p>
      ) : (
        <table className="w-full text-sm border-collapse">
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
            {invoices.map((invoice: any) => (
              <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-3 font-bold text-[#3B1E5D]">{invoice.invoice_number}</td>
                <td className="p-3">{invoice.client_name}</td>
                <td className="p-3 text-right font-mono">
                  {(invoice.total_amount / 100).toFixed(2)} {invoice.currency}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                    invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="p-3 text-center space-x-2 flex justify-center">
                  <button
                    onClick={() => {
                      const token = localStorage.getItem("invoxa_token");
                      fetch(`${apiUrl}/v1/invoices/${invoice.id}/pdf`, {
                        headers: { "Authorization": `Bearer ${token}` }
                      }).then(r => r.blob())
                       .then(blob => {
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
      )}
    </div>
  </div>
)}



        {/* PANNEAU DE PREVISUALISATION TEMPS RÉEL DYNAMIQUE (DROITE) */}
        <div className="lg:col-span-7 flex justify-center sticky top-20">
          <div className="w-full max-w-[800px] aspect-[1/1.414] bg-white border border-[#E7D9C4] shadow-md p-12 flex flex-col justify-between text-black rounded-sm">
            
            <div>
              <div className="flex justify-between items-start">
                {/* Bloc Identité Visuelle (Logo Gauche) */}
                <div>
                  <div className="flex flex-col items-start">
                    {business?.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={business.logo_url} 
                        alt={`Logo ${business.name}`} 
                        className="h-14 max-w-[180px] object-contain mb-1"
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-5xl font-serif text-[#3B1E5D] font-extrabold leading-none tracking-tighter">
                          {business?.name ? business.name.slice(0, 2).toUpperCase() : '..'}
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
                
                {/* Bloc Métadonnées (Droite) */}
                <div className="text-right">
                  <h2 className="text-4xl font-sans font-bold tracking-tight text-[#3B1E5D]">Recu</h2>
                  <p className="text-xs font-bold text-gray-800 mt-1">N°: {invoiceNumber || '————'}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Date: {invoiceDate || '—'}</p>
                </div>
              </div>

              {/* Bloc Destinataire */}
              <div className="my-10 text-xs border-l-2 border-[#7B4BB7]/30 pl-4 py-0.5">
                <span className="text-gray-400 uppercase text-[9px] block font-bold tracking-wider mb-1">Billed To :</span>
                <p className="text-sm font-bold text-[#3B1E5D]">{clientName || '[Destinataire]'}</p>
                {clientPhone && <p className="text-gray-600 mt-0.5">Phone: {clientPhone}</p>}
                {clientEmail && <p className="text-gray-600">Email: {clientEmail}</p>}
                {clientAddress && <p className="text-gray-600">Address: {clientAddress}</p>}
              </div>

              {/* Grille des Prestations */}
              <table className="w-full text-xs border border-collapse border-gray-100 rounded-md overflow-hidden">
                <thead>
                  <tr className="bg-[#3B1E5D] text-white font-serif italic">
                    <th className="p-3 text-left font-normal w-3/5">Description</th>
                    <th className="p-3 text-center font-normal w-1/5">QTY.</th>
                    <th className="p-3 text-right font-normal w-1/5">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-[#3B1E5D]/5">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="p-3 text-gray-700 font-medium whitespace-pre-line">{item.description || '[Libellé prestation]'}</td>
                      <td className="p-3 text-center text-gray-500">{item.quantity}</td>
                      <td className="p-3 text-right text-gray-900 font-bold font-mono">{(item.unit_price * item.quantity).toFixed(2)} {currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calcul des Totaux */}
              <div className="flex justify-end mt-4">
                <div className="text-right border-t border-gray-100 pt-2 min-w-[140px]">
                  <p className="text-[10px] font-serif font-bold italic text-gray-400">Total TTC</p>
                  <p className="text-xl font-black text-[#3B1E5D] font-mono">{calculatedTotalAmount.toFixed(2)} {currency.toUpperCase()}</p>
                </div>
              </div>

              {/* Notes additionnelles */}
              {(noteTitle || noteText) && (
                <div className="mt-8 p-3.5 bg-[#F5F2EF]/50 border border-dashed border-[#E7D9C4] rounded">
                  {noteTitle && <p className="text-[10px] font-bold text-gray-800 italic mb-0.5">{noteTitle}</p>}
                  {noteText && <p className="text-[10px] text-gray-500 leading-relaxed italic">{noteText}</p>}
                </div>
              )}
            </div>

            {/* Bas de Page / Coordonnées fixes */}
            <div className="flex justify-between items-end border-t border-gray-100 pt-4 mt-12 text-[9px] text-gray-400 font-mono">
              <div className="space-y-0.5">
                <p>📍 {business?.address ? business.address : '————'}</p>
                <p>📞 {business?.phone ? business.phone : '————'}</p>
                <p>✉️ {business?.email ? business.email : '————'}</p>
              </div>
              
              <div className="w-20 h-20 border-4 border-dashed border-[#3B1E5D]/20 rounded-full flex flex-col items-center justify-center rotate-12 select-none">
                <span className="text-[5px] font-bold text-gray-400">STATUS</span>
                <span className="text-[8px] font-black text-[#3B1E5D] uppercase">{status}</span>
                <span className="text-[4px] text-gray-400 font-sans">SYS-V1</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}