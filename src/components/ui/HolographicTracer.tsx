"use client";

import { useEffect, useRef, useState } from 'react';

export default function HolographicTracer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [hasError, setHasError] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!isCameraEnabled) {
      if (cameraRef.current) {
        try { cameraRef.current.stop(); } catch(e) {}
        cameraRef.current = null;
      }
      setIsTracking(false);
      return;
    }

    setHasError(false);

    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        // If already loaded, resolve immediately
        if (document.querySelector(`script[src="${src}"]`)) {
          return resolve(true);
        }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = "anonymous";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initializeMediaPipe = async () => {
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");

        if (!videoRef.current || !canvasRef.current) return;

        // @ts-ignore
        const hands = new window.Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((results: any) => {
          if (!canvasRef.current || !videoRef.current) return;
          
          const canvasCtx = canvasRef.current.getContext('2d');
          if (!canvasCtx) return;

          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            for (const landmarks of results.multiHandLandmarks) {
              const indexFinger = landmarks[8];
              const palmCenter = landmarks[9];
              
              const x = indexFinger.x * canvasRef.current.width;
              const y = indexFinger.y * canvasRef.current.height;
              const px = palmCenter.x * canvasRef.current.width;
              const py = palmCenter.y * canvasRef.current.height;

              // Draw Glowing Chakra / Mandala at Palm
              canvasCtx.beginPath();
              canvasCtx.arc(px, py, 60, 0, 2 * Math.PI);
              canvasCtx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
              canvasCtx.lineWidth = 2;
              canvasCtx.stroke();
              
              canvasCtx.beginPath();
              canvasCtx.arc(px, py, 40, 0, 2 * Math.PI);
              canvasCtx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
              canvasCtx.lineWidth = 4;
              canvasCtx.shadowBlur = 20;
              canvasCtx.shadowColor = '#c084fc';
              canvasCtx.stroke();

              canvasCtx.beginPath();
              canvasCtx.arc(x, y, 10, 0, 2 * Math.PI);
              canvasCtx.fillStyle = '#c084fc';
              canvasCtx.shadowBlur = 30;
              canvasCtx.shadowColor = '#c084fc';
              canvasCtx.fill();
              
              canvasCtx.beginPath();
              canvasCtx.moveTo(px, py);
              canvasCtx.lineTo(x, y);
              canvasCtx.strokeStyle = 'rgba(192, 132, 252, 0.8)';
              canvasCtx.lineWidth = 3;
              canvasCtx.setLineDash([5, 10]);
              canvasCtx.stroke();
              canvasCtx.setLineDash([]);
            }
          }
          canvasCtx.restore();
        });

        // @ts-ignore
        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 1280,
          height: 720
        });

        cameraRef.current = camera;
        
        camera.start().then(() => {
          setIsTracking(true);
        }).catch((err: any) => {
          console.warn("Camera permission denied or failed to start:", err);
          setHasError(true);
          setIsCameraEnabled(false);
        });

      } catch (err) {
        console.error("Failed to load MediaPipe", err);
        setHasError(true);
        setIsCameraEnabled(false);
      }
    };

    initializeMediaPipe();
    
  }, [isCameraEnabled]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsCameraEnabled(!isCameraEnabled)}
        className={`fixed top-8 right-8 z-[100] w-12 h-12 rounded-full glass-card flex items-center justify-center transition-all shadow-[0_0_15px_rgba(192,132,252,0.2)] ${
          isCameraEnabled ? 'text-primary border-primary/50' : 'text-on-surface-variant border-border-muted hover:text-primary'
        }`}
        title={isCameraEnabled ? "Disable Hand Tracking" : "Enable Hand Tracking"}
      >
        <span className="material-symbols-outlined text-2xl">
          {isCameraEnabled ? 'visibility' : 'visibility_off'}
        </span>
      </button>

      {hasError && (
        <div className="fixed top-24 right-8 z-[100] bg-error/20 border border-error/50 text-error px-4 py-2 rounded-lg text-sm font-label-mono animate-in slide-in-from-right">
          Camera Access Denied.
        </div>
      )}

      <video
        ref={videoRef}
        style={{ display: 'none' }}
        playsInline
      ></video>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
        style={{ opacity: isTracking && isCameraEnabled ? 1 : 0, transition: 'opacity 1s ease' }}
      ></canvas>
    </>
  );
}
