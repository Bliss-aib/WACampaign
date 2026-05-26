"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const STORAGE_KEY = "wacampaign-profile";

function getProfileName() {
  if (typeof window === "undefined") return "";
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return p?.name || "";
  } catch {
    return "";
  }
}

export function Header({ title }: { title: string }) {
  const [name, setName] = useState("");
  const router = useRouter();

  useEffect(() => {
    setName(getProfileName());
    const handleStorage = () => setName(getProfileName());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // FEATURE (Auth): real sign-out — clears the Supabase session then returns to sign-in.
  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "—";

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <h1 className="text-xl font-semibold tracking-tight text-black">{title}</h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700 ring-offset-2 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2">
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 border-zinc-200 bg-white">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-black">{name || "Your Name"}</p>
            <p className="text-xs text-zinc-500">Account</p>
          </div>
          <DropdownMenuSeparator className="bg-zinc-100" />
          <DropdownMenuItem asChild className="cursor-pointer text-zinc-700 focus:bg-zinc-50 focus:text-black">
            <Link href="/settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Profile & Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-zinc-700 focus:bg-zinc-50 focus:text-black"
          >
            <span className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
