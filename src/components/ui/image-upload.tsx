"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, Upload, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string | null;
  onChange: (base64: string | null) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "square";
  placeholder?: React.ReactNode;
}

export function ImageUpload({
  value,
  onChange,
  className,
  size = "md",
  shape = "circle",
  placeholder,
}: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const sizeClass = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  }[size];

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-xl";

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      // Resize before storing
      resizeBase64(result, 400, (resized) => onChange(resized));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function resizeBase64(src: string, maxPx: number, cb: (out: string) => void) {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = src;
  }

  const openCamera = useCallback(async () => {
    setCameraError(null);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Camera access denied or unavailable.");
    }
  }, []);

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraError(null);
  }, []);

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.85);
    resizeBase64(base64, 400, (resized) => {
      onChange(resized);
      closeCamera();
    });
  }

  return (
    <>
      <div className={cn("relative group", sizeClass, className)}>
        {/* Image or placeholder */}
        <div
          className={cn(
            "w-full h-full overflow-hidden bg-muted flex items-center justify-center",
            shapeClass
          )}
        >
          {value ? (
            <img
              src={value}
              alt="Upload preview"
              className="w-full h-full object-cover"
            />
          ) : (
            placeholder ?? (
              <Upload className="w-6 h-6 text-muted-foreground" />
            )
          )}
        </div>

        {/* Hover overlay with actions */}
        <div
          className={cn(
            "absolute inset-0 bg-black/50 flex items-center justify-center gap-1.5",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            shapeClass
          )}
        >
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="Upload photo"
          >
            <Upload className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            type="button"
            onClick={openCamera}
            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="Take photo"
          >
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              title="Remove photo"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {/* Camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-background rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-sm">Take a photo</span>
              <button
                type="button"
                onClick={closeCamera}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-square bg-black">
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70 text-sm px-6 text-center">
                  <Camera className="w-8 h-8 opacity-40" />
                  {cameraError}
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex items-center justify-center gap-3 p-4">
              <button
                type="button"
                onClick={closeCamera}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Capture
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
