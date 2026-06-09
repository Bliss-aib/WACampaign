import { SignUp } from "@clerk/nextjs";

// FIX (Clerk C3): catch-all route ([[...sign-up]]) needs explicit path routing.
export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/dashboard" />
    </div>
  );
}
