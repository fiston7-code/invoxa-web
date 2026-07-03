import { Suspense } from "react";
import LoginPageContent from "../LoginPageContent";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}