import { SignIn } from "@clerk/nextjs";

// FIX (Clerk C3): this is a catch-all route ([[...sign-in]]), so the component
// must use path-based routing. Without `routing="path"` Clerk can fall back to
// hash routing inside a path route, breaking refresh/redirect behavior.
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/dashboard" />
    </div>
  );
}
