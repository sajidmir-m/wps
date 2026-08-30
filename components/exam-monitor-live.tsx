"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, BellOff } from "lucide-react";

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * Polls the monitor page and raises an alarm when the violation count goes up.
 * Polling is used rather than a socket so the page keeps working without any
 * extra Supabase configuration.
 */
export function ExamMonitorLive({
  violationCount,
  intervalMs = 8000,
}: {
  violationCount: number;
  intervalMs?: number;
}) {
  const router = useRouter();
  const [soundOn, setSoundOn] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const seenRef = useRef(violationCount);

  const beep = useCallback(() => {
    const context = audioRef.current;
    if (!context) return;
    // Three short rising tones, loud enough to notice across a room.
    [0, 0.25, 0.5].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = 660 + index * 220;
      gain.gain.setValueAtTime(0.0001, context.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + offset + 0.18);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + offset);
      oscillator.stop(context.currentTime + offset + 0.2);
    });
  }, []);

  function enableSound() {
    if (!audioRef.current) {
      const Ctor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
      if (Ctor) audioRef.current = new Ctor();
    }
    audioRef.current?.resume();
    setSoundOn(true);
  }

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);

  useEffect(() => {
    if (violationCount > seenRef.current) {
      if (soundOn) beep();
      setAlerting(true);
      const timer = setTimeout(() => setAlerting(false), 6000);
      seenRef.current = violationCount;
      return () => clearTimeout(timer);
    }
    seenRef.current = violationCount;
  }, [violationCount, soundOn, beep]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-2 text-sm text-muted">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
        </span>
        Live · refreshing every {Math.round(intervalMs / 1000)}s
      </span>

      <button
        type="button"
        onClick={() => (soundOn ? setSoundOn(false) : enableSound())}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium hover:bg-off-white"
      >
        {soundOn ? <BellRing size={14} /> : <BellOff size={14} />}
        {soundOn ? "Alarm on" : "Turn alarm on"}
      </button>

      {alerting ? (
        <span className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white">
          A student just left the exam window
        </span>
      ) : null}
    </div>
  );
}
