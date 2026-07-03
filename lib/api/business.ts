
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface BusinessProfileInput {
  name: string;
  rccm: string;
  address: string;
  phone: string;
  email: string;
  logo_url?: string;
}

export async function createBusinessProfile(payload: BusinessProfileInput): Promise<any> {
  const token = localStorage.getItem("invoxa_token");
  
  const response = await fetch(`${API_BASE_URL}/v1/business`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`, // Requis pour que app.contextGetUser(r) fonctionne côté Go
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Impossible d'enregistrer le profil.");
  }

  return response.json();
}

// À ajouter dans src/lib/api/business.ts

export async function checkHasBusinessProfile(): Promise<boolean> {
  const token = localStorage.getItem("invoxa_token");
  if (!token) return false;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://fastvoxa.com"}/v1/business`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    // Si le profil existe, le backend renvoie 200 OK
    return response.ok; 
  } catch (error) {
    return false;
  }
}