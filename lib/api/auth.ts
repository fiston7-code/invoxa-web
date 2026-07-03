
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  authentication_token: {
    token: string;
    expiry: string;
  };
  // Ajoute d'autres champs si ton API renvoie des infos utilisateur (ex: user: { id, activated })
}

interface ActivationResponse {
  email: string;
}

// Frappe : POST /v1/users
export async function registerUser(payload: RegisterPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Débogage : Affiche la structure réelle dans la console F12
    console.log("API Error Response:", errorData);

    let errorMessage = "Une erreur est survenue lors de l'inscription.";

    if (errorData.error) {
      if (typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      } else if (typeof errorData.error === 'object') {
        // Récupère la première valeur si c'est un objet de validation
        const values = Object.values(errorData.error);
        if (values.length > 0) {
          errorMessage = values[0] as string;
        }
      }
    }
    throw new Error(errorMessage);
  }
}

// Frappe : POST /v1/tokens/authentication
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/tokens/authentication`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Identifiants incorrects ou compte non activé.");
  }

  return response.json();
}

// Ajoute cette fonction dans ton fichier src/lib/api/auth.ts

// Frappe : PUT /v1/users/activated
export async function activateUser(token: string): Promise<ActivationResponse> {
  const response = await fetch(`${API_BASE_URL}/users/activated`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Ce jeton est invalide ou a expiré.");
  }

  // 3. Retournez les données JSON reçues du backend
  return await response.json();
}