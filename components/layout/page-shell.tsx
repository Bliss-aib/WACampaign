export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full px-6 py-8">
      {children}
    </main>
  );
}
