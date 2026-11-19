import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Settings, { SettingsFallback } from "@/components/Settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
      <Link href="/" className="inline-block rounded-lg py-2 text-sm font-bold tracking-wide text-gold">
        Code Dojo
      </Link>
      <h1 className="mt-2 text-3xl font-bold leading-tight">Settings</h1>
      <Suspense fallback={<SettingsFallback />}>
        <Settings />
      </Suspense>
    </main>
  );
}
