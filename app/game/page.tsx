"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

interface Photo {
  id: string;
  name: string;
  data: string;
}

interface Card {
  id: string;
  photoId: string;
  name: string;
  data: string;
  isFlipped: boolean;
  isMatched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function GameBoard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pairs = parseInt(searchParams.get("pairs") ?? "6", 10);

  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [won, setWon] = useState(false);
  const [notEnough, setNotEnough] = useState(false);

  const initGame = useCallback(() => {
    const raw = localStorage.getItem("memoria_photos");
    const photos: Photo[] = raw ? JSON.parse(raw) : [];

    if (photos.length < pairs) {
      setNotEnough(true);
      return;
    }

    const selected = shuffle(photos).slice(0, pairs);
    const deck: Card[] = shuffle([
      ...selected.map((p) => ({
        id: `${p.id}-a`,
        photoId: p.id,
        name: p.name,
        data: p.data,
        isFlipped: false,
        isMatched: false,
      })),
      ...selected.map((p) => ({
        id: `${p.id}-b`,
        photoId: p.id,
        name: p.name,
        data: p.data,
        isFlipped: false,
        isMatched: false,
      })),
    ]);

    setCards(deck);
    setFlipped([]);
    setLocked(false);
    setWon(false);
    setNotEnough(false);
  }, [pairs]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleCardClick = (cardId: string) => {
    if (locked) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    const newFlipped = [...flipped, cardId];
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
    );
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setLocked(true);
      const [firstId, secondId] = newFlipped;
      const first = cards.find((c) => c.id === firstId)!;
      const second = cards.find((c) => c.id === secondId)!;

      if (first.photoId === second.photoId) {
        // Match
        setCards((prev) =>
          prev.map((c) =>
            c.id === firstId || c.id === secondId
              ? { ...c, isMatched: true }
              : c
          )
        );
        setFlipped([]);
        setLocked(false);
      } else {
        // No match — flip back after 1s
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlipped([]);
          setLocked(false);
        }, 1000);
      }
    }
  };

  // Check win condition whenever cards change
  useEffect(() => {
    if (cards.length > 0 && cards.every((c) => c.isMatched)) {
      setWon(true);
    }
  }, [cards]);

  const totalCards = pairs * 2;
  const cols =
    totalCards <= 12
      ? "grid-cols-2 sm:grid-cols-3"
      : "grid-cols-2 sm:grid-cols-4";

  if (notEnough) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <p className="text-2xl font-semibold text-gray-700 mb-8">
          Add more photos in Manage Photos to play with {pairs} pairs.
        </p>
        <button
          onClick={() => router.push("/manage")}
          className="rounded-2xl bg-indigo-600 text-white text-xl font-semibold px-8 py-5 hover:bg-indigo-700 active:scale-95 transition-transform"
        >
          Manage Photos
        </button>
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-xl text-indigo-600 underline underline-offset-4 hover:text-indigo-800"
        >
          Go Home
        </button>
      </main>
    );
  }

  if (won) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <p className="text-6xl mb-6">🎉</p>
        <h2 className="text-4xl font-bold text-gray-900 mb-10">You did it!</h2>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={initGame}
            className="rounded-2xl bg-indigo-600 text-white text-xl font-semibold px-8 py-5 hover:bg-indigo-700 active:scale-95 transition-transform"
          >
            Play Again
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-2xl border-2 border-indigo-600 text-indigo-600 text-xl font-semibold px-8 py-5 hover:bg-indigo-50 active:scale-95 transition-transform"
          >
            Go Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className={`grid ${cols} gap-3`}>
          {cards.map((card) => (
            <div
              key={card.id}
              className="card-container"
              style={{ height: "clamp(120px, 22vw, 180px)" }}
              onClick={() => handleCardClick(card.id)}
            >
              <div
                className={`card-inner ${card.isFlipped || card.isMatched ? "flipped" : ""}`}
              >
                {/* Back */}
                <div className="card-face card-back bg-indigo-400 flex items-center justify-center cursor-pointer select-none shadow-md">
                  <span className="text-5xl font-bold text-white">?</span>
                </div>
                {/* Front */}
                <div
                  className={`card-face card-front cursor-pointer shadow-md ${
                    card.isMatched ? "ring-4 ring-green-500" : ""
                  }`}
                >
                  <img
                    src={card.data}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense>
      <GameBoard />
    </Suspense>
  );
}
