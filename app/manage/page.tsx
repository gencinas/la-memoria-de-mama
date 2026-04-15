"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Photo {
  id: string;
  name: string;
  data: string;
}

const MAX_SIZE = 400;
const QUALITY = 0.82;
const MAX_B64_SIZE = 60000; // ~45KB file — anything bigger needs recompression

function compressDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", QUALITY));
    };
    img.onerror = reject;
    img.src = src;
  });
}

function compressFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => compressDataUrl(e.target?.result as string).then(resolve).catch(reject);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ManagePhotos() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("memoria_photos");
    if (!raw) return;

    const stored: Photo[] = JSON.parse(raw);
    setPhotos(stored);

    // Migrate any photos stored before compression was added
    const needsMigration = stored.some((p) => p.data.length > MAX_B64_SIZE);
    if (!needsMigration) return;

    setMigrating(true);
    Promise.all(stored.map(async (p) => ({
      ...p,
      data: p.data.length > MAX_B64_SIZE ? await compressDataUrl(p.data) : p.data,
    }))).then((compressed) => {
      // Free space first, then write compressed versions
      localStorage.removeItem("memoria_photos");
      try {
        localStorage.setItem("memoria_photos", JSON.stringify(compressed));
        setPhotos(compressed);
        setError("");
      } catch {
        setError("Storage still full — tap Clear All to start fresh.");
      }
    }).finally(() => setMigrating(false));
  }, []);

  const saveToStorage = (updated: Photo[]) => {
    try {
      localStorage.setItem("memoria_photos", JSON.stringify(updated));
      setError("");
      return true;
    } catch {
      setError("Storage full — delete some photos or tap Clear All.");
      return false;
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setError("");
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const data = await compressFile(file);
        const newPhoto: Photo = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name.replace(/\.[^.]+$/, ""),
          data,
        };
        setPhotos((prev) => {
          const updated = [...prev, newPhoto];
          saveToStorage(updated);
          return updated;
        });
      } catch {
        setError("Could not load one of the images. Try a different file.");
      }
    }
  };

  const deletePhoto = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    setPhotos(updated);
    saveToStorage(updated);
  };

  const clearAll = () => {
    localStorage.removeItem("memoria_photos");
    setPhotos([]);
    setError("");
  };

  return (
    <main className="min-h-screen px-5 py-8" style={{ background: "#FEF3E8" }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-amber-900">Gestionar fotos</h1>
          <button
            onClick={() => router.push("/")}
            className="text-xl text-amber-700 underline underline-offset-4 hover:text-amber-900"
          >
            ← Inicio
          </button>
        </div>

        {/* Migration notice */}
        {migrating && (
          <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-amber-800 text-lg font-medium">
            Optimizando fotos... un momento ⏳
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-red-700 text-lg font-medium flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              onClick={clearAll}
              className="shrink-0 rounded-xl bg-red-600 text-white text-base font-semibold px-4 py-2 hover:bg-red-700 active:scale-95 transition-transform"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Upload area */}
        <div
          className={`border-4 border-dashed rounded-2xl flex flex-col items-center justify-center py-12 px-6 mb-8 cursor-pointer transition-colors ${
            dragging
              ? "border-amber-500 bg-amber-50"
              : "border-amber-300 hover:border-amber-400 hover:bg-amber-50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        >
          <span className="text-5xl mb-3">📷</span>
          <p className="text-xl font-semibold text-amber-900 text-center">
            Toca o arrastra fotos aquí
          </p>
          <p className="text-base text-amber-700 mt-1">JPG o PNG</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Photo grid */}
        {photos.length === 0 ? (
          <p className="text-center text-xl text-amber-700">
            No hay fotos aún. ¡Sube algunas para jugar!
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative">
                  <div className="rounded-2xl overflow-hidden shadow-md aspect-square">
                    <img src={photo.data} alt={photo.name} className="w-full h-full object-cover" />
                  </div>
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute top-2 right-2 w-9 h-9 rounded-full bg-red-500 text-white text-xl font-bold flex items-center justify-center shadow hover:bg-red-600 active:scale-90 transition-transform"
                    aria-label={`Eliminar ${photo.name}`}
                  >
                    ×
                  </button>
                  <p className="mt-2 text-base text-center text-amber-900 font-medium truncate px-1">
                    {photo.name}
                  </p>
                </div>
              ))}
            </div>

            {/* Clear all at bottom when photos exist */}
            <button
              onClick={clearAll}
              className="mt-8 w-full rounded-2xl border-2 border-red-300 text-red-500 text-lg font-semibold py-4 hover:bg-red-50 active:scale-95 transition-transform"
            >
              Borrar todas las fotos
            </button>
          </>
        )}
      </div>
    </main>
  );
}
