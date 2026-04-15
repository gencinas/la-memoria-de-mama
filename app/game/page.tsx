"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

type Phase = "preview" | "playing" | "celebrating" | "won";

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

  const [phase, setPhase] = useState<Phase>("preview");
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [notEnough, setNotEnough] = useState(false);
  const [spotlit, setSpotlit] = useState<Set<string>>(new Set());

  // Unique matched photos for win screen gallery
  const matchedPhotos = cards.length > 0
    ? Array.from(new Map(cards.filter(c => c.isMatched).map(c => [c.photoId, c])).values())
    : [];

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
        isFlipped: true, // start face-up for preview
        isMatched: false,
      })),
      ...selected.map((p) => ({
        id: `${p.id}-b`,
        photoId: p.id,
        name: p.name,
        data: p.data,
        isFlipped: true,
        isMatched: false,
      })),
    ]);

    setCards(deck);
    setFlipped([]);
    setLocked(false);
    setPhase("preview");
    setCountdown(3);
    setSpotlit(new Set());
    setNotEnough(false);
  }, [pairs]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Preview countdown → flip all cards down → start playing
  useEffect(() => {
    if (phase !== "preview") return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    } else {
      // Small pause then flip all down
      const t = setTimeout(() => {
        setCards((prev) => prev.map((c) => ({ ...c, isFlipped: false })));
        setPhase("playing");
      }, 400);
      return () => clearTimeout(t);
    }
  }, [phase, countdown]);

  // Win detection → celebrating → spotlight each photo → won
  useEffect(() => {
    if (phase !== "playing") return;
    if (cards.length > 0 && cards.every((c) => c.isMatched)) {
      setPhase("celebrating");

      // Spotlight each unique photo one by one
      const unique = Array.from(new Map(cards.map(c => [c.photoId, c])).values());
      unique.forEach((card, i) => {
        setTimeout(() => {
          setSpotlit((prev) => new Set([...prev, card.photoId]));
        }, 600 + i * 350);
      });

      // After all spotlit, show win screen
      setTimeout(() => {
        setPhase("won");
      }, 600 + unique.length * 350 + 1200);
    }
  }, [cards, phase]);

  const handleCardClick = (cardId: string) => {
    if (phase !== "playing" || locked) return;
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

  // Grid layout: 6p→4×3, 8p→4×4, 10p→5×4 (no orphan cards)
  const totalCards = pairs * 2;
  const cols = pairs === 10 ? 5 : 4;
  const rows = Math.ceil(totalCards / cols);

  if (notEnough) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: "#FEF3E8" }}>
        <p className="text-2xl font-semibold text-amber-900 mb-8">
          Add more photos in Manage Photos to play with {pairs} pairs.
        </p>
        <button
          onClick={() => router.push("/manage")}
          className="rounded-2xl text-white text-xl font-semibold px-8 py-5 active:scale-95 transition-transform"
          style={{ background: "#C9855A" }}
        >
          Manage Photos
        </button>
        <button
          onClick={() => router.push("/")}
          className="mt-5 text-xl underline underline-offset-4 text-amber-800 hover:text-amber-900"
        >
          Go Home
        </button>
      </main>
    );
  }

  if (phase === "won") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center" style={{ background: "#FEF3E8" }}>
        <p className="text-6xl mb-3">💛</p>
        <h2 className="text-4xl font-bold text-amber-900 mb-2">¡Lo lograste!</h2>
        <p className="text-xl text-amber-700 mb-8">Encontraste a todos</p>

        {/* Photo gallery */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 w-full max-w-lg mb-10">
          {matchedPhotos.map((card) => (
            <div key={card.photoId} className="rounded-2xl overflow-hidden shadow-lg aspect-square">
              <img src={card.data} alt={card.name} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={initGame}
            className="rounded-2xl text-white text-xl font-semibold px-8 py-5 active:scale-95 transition-transform shadow-md"
            style={{ background: "#C9855A" }}
          >
            Jugar de nuevo
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-2xl text-xl font-semibold px-8 py-5 active:scale-95 transition-transform border-2 border-amber-700 text-amber-800"
          >
            Inicio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="relative w-full overflow-hidden"
      style={{ background: "#FEF3E8", height: "100dvh" }}
    >
      {/* Preview overlay */}
      {phase === "preview" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-8 pointer-events-none">
          <div className="rounded-3xl px-8 py-4 text-center shadow-xl" style={{ background: "rgba(254,243,232,0.92)" }}>
            {countdown > 0 ? (
              <>
                <p className="text-2xl font-bold text-amber-900 mb-1">¡Recuerda estas caras!</p>
                <p className="text-6xl font-black text-amber-600">{countdown}</p>
              </>
            ) : (
              <p className="text-2xl font-bold text-amber-900">¡A jugar! 🎯</p>
            )}
          </div>
        </div>
      )}

      {/* Card grid — fills full screen, no scroll */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: "8px",
          padding: "8px",
          height: "100%",
          width: "100%",
        }}
      >
        {cards.map((card) => {
          const isSpotlit = spotlit.has(card.photoId);
          return (
            <div
              key={card.id}
              className="card-container"
              style={{
                minHeight: 0,
                transition: "transform 0.3s ease",
                transform: isSpotlit ? "scale(1.06)" : "scale(1)",
              }}
              onClick={() => handleCardClick(card.id)}
            >
              <div className={`card-inner ${card.isFlipped || card.isMatched ? "flipped" : ""}`}>
                {/* Back */}
                <div
                  className="card-face card-back flex items-center justify-center cursor-pointer select-none shadow-md"
                  style={{ background: "linear-gradient(135deg, #D4956A 0%, #C9855A 100%)" }}
                >
                  <span className="text-4xl font-bold text-white opacity-80">?</span>
                </div>
                {/* Front */}
                <div
                  className="card-face card-front cursor-pointer shadow-md"
                  style={
                    card.isMatched
                      ? { boxShadow: isSpotlit ? "0 0 0 4px #F59E0B, 0 8px 24px rgba(245,158,11,0.4)" : "0 0 0 3px #F59E0B" }
                      : {}
                  }
                >
                  <img
                    src={card.data}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                  {card.isMatched && (
                    <div className="absolute top-1 right-1 text-lg leading-none">💛</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
