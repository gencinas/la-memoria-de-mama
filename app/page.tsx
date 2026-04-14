"use client";

import Link from "next/link";

const difficulties = [
  { label: "6 pairs", pairs: 6 },
  { label: "8 pairs", pairs: 8 },
  { label: "10 pairs", pairs: 10 },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-12">
      <h1 className="text-5xl font-bold text-center mb-16 text-gray-900 tracking-tight">
        Memory Match
      </h1>

      <div className="flex flex-col gap-5 w-full max-w-xs">
        {difficulties.map(({ label, pairs }) => (
          <Link
            key={pairs}
            href={`/game?pairs=${pairs}`}
            className="flex items-center justify-center rounded-2xl bg-indigo-600 text-white text-2xl font-semibold py-6 shadow-md active:scale-95 transition-transform hover:bg-indigo-700"
          >
            {label}
          </Link>
        ))}
      </div>

      <Link
        href="/manage"
        className="mt-14 text-xl text-indigo-600 underline underline-offset-4 hover:text-indigo-800"
      >
        Manage Photos
      </Link>
    </main>
  );
}
