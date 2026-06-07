"use client";

import { SignInButton, Show, UserButton } from "@clerk/nextjs";

export function Header({ title }: { title: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <h1 className="text-xl font-semibold tracking-tight text-black">{title}</h1>

      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-black">
              Sign in
            </button>
          </SignInButton>
        </Show>

        <Show when="signed-in">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonAvatarBox: "h-9 w-9",
              },
            }}
          />
        </Show>
      </div>
    </header>
  );
}
