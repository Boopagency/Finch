"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";

const MAX_SECONDS = 120;
const BARS = 36;

type Live = { rec: MediaRecorder; stream: MediaStream; ctx: AudioContext; raf: number; timer: ReturnType<typeof setInterval>; chunks: Blob[]; keep: boolean };

/**
 * Converte a gravação para WAV 16 kHz mono (PCM 16 bits). O mp4 que o iPhone grava é recusado por serviços de
 * transcrição; WAV todo serviço aceita. 2 min ≈ 3,8 MB. Se o aparelho não decodificar, manda o original.
 */
async function toWav(blob: Blob): Promise<Blob> {
  const rate = 16000;
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const pcm = (await off.startRendering()).getChannelData(0);
    const out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
    const str = (o: number, t: string) => [...t].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
    str(0, "RIFF"); out.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVE"); str(12, "fmt ");
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true); out.setUint32(24, rate, true);
    out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); str(36, "data"); out.setUint32(40, pcm.length * 2, true);
    pcm.forEach((v, i) => out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 0x7fff, true));
    return new Blob([out], { type: "audio/wav" });
  } catch {
    return blob;
  } finally {
    void ctx.close().catch(() => {});
  }
}

/**
 * Grava a voz (MediaRecorder, funciona no app da tela de início do iPhone), desenha a onda pelo volume real do
 * microfone e manda o áudio para /api/ai/transcribe. O texto volta por `onText`.
 */
export function useVoice(onText: (text: string) => void) {
  const [state, setState] = useState<"idle" | "recording" | "sending">("idle");
  const [seconds, setSeconds] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<Live | null>(null);

  const cleanup = () => {
    const l = live.current;
    if (!l) return;
    cancelAnimationFrame(l.raf);
    clearInterval(l.timer);
    l.stream.getTracks().forEach((t) => t.stop());
    void l.ctx.close().catch(() => {});
  };
  useEffect(() => () => cleanup(), []);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return toast("Este aparelho não grava áudio aqui. Use o ditado do teclado.");
    // o AudioContext nasce no toque (o iPhone só libera áudio dentro do gesto)
    const ctx = new AudioContext();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      void ctx.close();
      return toast("Libere o microfone para o Finch nos ajustes do aparelho.");
    }
    await ctx.resume().catch(() => {});
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const rec = new MediaRecorder(stream);
    const l: Live = { rec, stream, ctx, raf: 0, timer: setInterval(() => {}, 1e6), chunks: [], keep: false };
    live.current = l;
    rec.ondataavailable = (e) => e.data.size && l.chunks.push(e.data);
    rec.onstop = () => void finish(l);

    // onda: volume (RMS) do microfone a cada quadro, as barras andam da direita para a esquerda
    const levels = Array<number>(BARS).fill(0.04);
    const buf = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const draw = () => {
      l.raf = requestAnimationFrame(draw);
      if (frame++ % 3) return;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      levels.shift();
      levels.push(Math.min(1, Math.sqrt(sum / buf.length) * 4 + 0.04));
      const c = canvas.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
      const g = c.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      g.fillStyle = getComputedStyle(c).color;
      const step = w / BARS, bw = Math.max(2, step * 0.55);
      levels.forEach((v, i) => {
        const bh = Math.max(3, v * h);
        g.beginPath();
        g.roundRect(i * step + (step - bw) / 2, (h - bh) / 2, bw, bh, bw / 2);
        g.fill();
      });
    };
    draw();

    clearInterval(l.timer);
    setSeconds(0);
    l.timer = setInterval(() => setSeconds((s) => {
      if (s + 1 >= MAX_SECONDS) stop(true);
      return s + 1;
    }), 1000);
    rec.start(); // um bloco só: fatiar (timeslice) gera arquivo quebrado em alguns Safari
    setState("recording");
  }

  async function finish(l: Live) {
    cleanup();
    live.current = null;
    if (!l.keep) return setState("idle");
    const raw = new Blob(l.chunks, { type: l.rec.mimeType || "audio/mp4" });
    if (raw.size < 1000) {
      setState("idle");
      return toast("Não deu para ouvir. Segure um pouco mais e fale perto do aparelho.");
    }
    setState("sending");
    try {
      const blob = await toWav(raw);
      const form = new FormData();
      form.append("audio", blob, blob.type === "audio/wav" ? "voz.wav" : "voz");
      const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast(data.message ?? "Não consegui transcrever agora.");
      if (!data.text) return toast("Não entendi o áudio. Tenta de novo.");
      onText(data.text);
    } catch {
      toast("Sem conexão para transcrever o áudio.");
    } finally {
      setState("idle");
    }
  }

  function stop(send: boolean) {
    const l = live.current;
    if (!l || l.rec.state === "inactive") return;
    l.keep = send;
    l.rec.stop();
  }

  return { state, seconds, canvas, start, send: () => stop(true), cancel: () => stop(false) };
}
