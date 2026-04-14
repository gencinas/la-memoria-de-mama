"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Photo {
  id: string;
  name: string;
  data: string;
}

const MAX_SIZE = 400; // px — enough for cards, keeps storage small
const QUALITY = 0.82;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", QUALITY));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
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

  useEffect(() => {
    const raw = localStorage.getItem("memoria_photos");
    if (raw) setPhotos(JSON.parse(raw));
  }, []);

  const saveToStorage = (updated: Photo[]) => {
    try {
      localStorage.setItem("memoria_photos", JSON.stringify(updated));
      setError("");
      return true;
    } catch {
      setError("Storage full — please delete some photos to add more.");
      return false;
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setError("");
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const data = await compressImage(file);
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

  return (
    <main className="min-h-screen bg-white px-5 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Photos</h1>
          <button
            onClick={() => router.push("/")}
            className="text-xl text-indigo-600 underline underline-offset-4 hover:text-indigo-800"
          >
            ← Home
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-red-700 text-lg font-medium">
            {error}
          </div>
        )}

        {/* Upload area */}
        <div
          className={`border-4 border-dashed rounded-2xl flex flex-col items-center justify-center py-12 px-6 mb-8 cursor-pointer transition-colors ${
            dragging
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <span className="text-5xl mb-3">📷</span>
          <p className="text-xl font-semibold text-gray-700 text-center">
            Tap or drag photos here
          </p>
          <p className="text-base text-gray-500 mt-1">JPG or PNG</p>
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
          <p className="text-center text-xl text-gray-500">
            No photos yet. Upload some to start playing!
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="rounded-2xl overflow-hidden shadow-md aspect-square">
                  <img
                    src={photo.data}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => deletePhoto(photo.id)}
                  className="absolute top-2 right-2 w-9 h-9 rounded-full bg-red-500 text-white text-xl font-bold flex items-center justify-center shadow hover:bg-red-600 active:scale-90 transition-transform"
                  aria-label={`Delete ${photo.name}`}
                >
                  ×
                </button>
                <p className="mt-2 text-base text-center text-gray-700 font-medium truncate px-1">
                  {photo.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
