'use client';

import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <h1 className="font-display text-3xl text-navy tracking-tight">
              Estora
            </h1>
          </Link>
          <p className="text-secondary text-sm mt-1">
            Transaction Intelligence
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
