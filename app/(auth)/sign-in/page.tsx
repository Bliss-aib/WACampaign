import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold text-black">Sign In</h1>
      <p className="text-sm text-zinc-500">Auth is disabled for development.</p>
      <Link href="/dashboard">
        <button className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Go to Dashboard
        </button>
      </Link>
    </div>
  );
}
