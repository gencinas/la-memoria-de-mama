"use client";

import Link from "next/link";

const difficulties = [
  { label: "6 parejas", pairs: 6 },
  { label: "8 parejas", pairs: 8 },
  { label: "10 parejas", pairs: 10 },
];

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "#FEF3E8" }}
    >
      <p className="text-5xl mb-4">🧡</p>
      <h1 className="text-4xl font-bold text-center mb-2 text-amber-900 tracking-tight">
        La memoria de mamá
      </h1>
      <p className="text-lg text-amber-700 mb-14 text-center">
        Encuentra las parejas de fotos
      </p>

      <div className="flex flex-col gap-5 w-full max-w-xs">
        {difficulties.map(({ label, pairs }) => (
          <Link
            key={pairs}
            href={`/game?pairs=${pairs}`}
            className="flex items-center justify-center rounded-2xl text-white text-2xl font-semibold py-6 shadow-md active:scale-95 transition-transform"
            style={{ background: "#C9855A" }}
          >
            {label}
          </Link>
        ))}
      </div>

      <Link
        href="/manage"
        className="mt-14 text-xl text-amber-700 underline underline-offset-4 hover:text-amber-900"
      >
        Gestionar fotos
      </Link>
    </main>
  );
}
