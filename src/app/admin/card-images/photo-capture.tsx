"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Camera, Crop, X } from "lucide-react";

/** Opens the device camera (webcam on desktop, rear camera on mobile via facingMode) and lets the user snap a still frame. */
export function CameraCapture({ onCapture, onCancel }: { onCapture: (file: File) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Camera unavailable"));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], "capture.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  }

  if (error) {
    return (
      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 space-y-2">
        <p>{error} — check camera permissions, or use &quot;Choose File&quot; instead.</p>
        <button onClick={onCancel} className="text-foreground/60 hover:text-foreground">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-80 rounded-lg bg-black object-contain" />
      <div className="flex gap-2">
        <button
          onClick={capture}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
        >
          <Camera size={14} /> Capture
        </button>
        <button onClick={onCancel} className="px-3 py-2 rounded-xl bg-foreground/10 text-foreground text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

interface Point {
  x: number; // 0-1, fraction of displayed image width
  y: number; // 0-1, fraction of displayed image height
}

// ponytail: axis-aligned bounding-box crop only, not a true 4-point
// perspective warp — good enough for a card photographed roughly straight-on.
// Upgrade to a real quad-detection/perspective-correct pipeline (e.g.
// jscanify/opencv.js) if skewed photos become common enough to matter.
export function CropStep({
  imageUrl,
  onConfirm,
  onCancel,
}: {
  imageUrl: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [topLeft, setTopLeft] = useState<Point>({ x: 0.06, y: 0.06 });
  const [bottomRight, setBottomRight] = useState<Point>({ x: 0.94, y: 0.94 });
  const dragging = useRef<"tl" | "br" | null>(null);

  function pointFromEvent(e: ReactPointerEvent): Point {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!dragging.current) return;
    const p = pointFromEvent(e);
    if (dragging.current === "tl") setTopLeft(p);
    else setBottomRight(p);
  }

  function startDrag(corner: "tl" | "br") {
    return (e: ReactPointerEvent) => {
      e.preventDefault();
      dragging.current = corner;
    };
  }

  function endDrag() {
    dragging.current = null;
  }

  function confirmCrop() {
    const img = imgRef.current;
    if (!img) return;
    const sx = Math.min(topLeft.x, bottomRight.x) * img.naturalWidth;
    const sy = Math.min(topLeft.y, bottomRight.y) * img.naturalHeight;
    const sw = Math.abs(bottomRight.x - topLeft.x) * img.naturalWidth;
    const sh = Math.abs(bottomRight.y - topLeft.y) * img.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(new File([blob], "cropped.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  }

  const left = Math.min(topLeft.x, bottomRight.x) * 100;
  const top = Math.min(topLeft.y, bottomRight.y) * 100;
  const width = Math.abs(bottomRight.x - topLeft.x) * 100;
  const height = Math.abs(bottomRight.y - topLeft.y) * 100;

  return (
    <div className="space-y-2">
      <p className="text-xs text-foreground/50">Drag the corners to fit the card, then crop.</p>
      <div
        ref={containerRef}
        className="relative select-none touch-none max-h-80 overflow-hidden rounded-lg"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={imageUrl} alt="" className="w-full max-h-80 object-contain block" draggable={false} />
        <div className="absolute inset-0 bg-black/50" style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${top}%, ${left}%  ${top}%, ${left}% ${top + height}%, ${left + width}% ${top + height}%, ${left + width}% ${top}%, 0 ${top}%)` }} />
        <div
          className="absolute border-2 border-primary"
          style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
        />
        <div
          onPointerDown={startDrag("tl")}
          className="absolute w-5 h-5 rounded-full bg-primary border-2 border-white -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize"
          style={{ left: `${topLeft.x * 100}%`, top: `${topLeft.y * 100}%` }}
        />
        <div
          onPointerDown={startDrag("br")}
          className="absolute w-5 h-5 rounded-full bg-primary border-2 border-white -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize"
          style={{ left: `${bottomRight.x * 100}%`, top: `${bottomRight.y * 100}%` }}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={confirmCrop}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
        >
          <Crop size={14} /> Use this crop
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground/10 text-foreground text-sm"
        >
          <X size={14} /> Retake
        </button>
      </div>
    </div>
  );
}
