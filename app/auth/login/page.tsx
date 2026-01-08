import { Suspense } from "react";
import LoginContent from "./login-content";

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
