import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";

interface AudioWaveformProps {
  isRecording: boolean;
  isHighContrast?: boolean;
}

export default function AudioWaveform({ isRecording, isHighContrast = false }: AudioWaveformProps) {
  const [amplitudes, setAmplitudes] = useState<number[]>(new Array(16).fill(10));
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isRecording) {
      // Clean up audio references
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setAmplitudes(new Array(16).fill(10));
      return;
    }

    let isCancelled = false;
    let analyser: AnalyserNode | null = null;
    let dataArray = new Uint8Array(0);

    const setupAudio = async () => {
      try {
        if (typeof window === "undefined") return;
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error("getUserMedia not supported");
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isCancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 64; // Gives 32 frequency bins
        analyser.smoothingTimeConstant = 0.55; 

        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      } catch (e) {
        console.warn("Could not setup live mic analyser (falling back to organic simulation):", e);
      }
    };

    setupAudio();

    let simTime = 0;
    const update = () => {
      if (isCancelled) return;

      simTime += 0.09;
      const nextAmplitudes = [...amplitudes];

      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        // Map elements into 16 visual bars
        for (let i = 0; i < 16; i++) {
          const binIndex = i * 1.5;
          const idx1 = Math.floor(binIndex) % dataArray.length;
          const idx2 = Math.ceil(binIndex) % dataArray.length;
          const rawVal = (dataArray[idx1] + dataArray[idx2]) / 2; // Range 0 to 255

          // Map normalize, min 6px, max 54px
          const baseHeight = 8 + (rawVal / 255) * 46;

          // add gentle continuous animation so it breathes on silence
          const noise = Math.sin(simTime + i * 0.35) * 4 + Math.cos(simTime * 0.65 + i * 0.2) * 2;
          const finalHeight = Math.max(6, baseHeight + noise);
          
          const current = nextAmplitudes[i] || 10;
          nextAmplitudes[i] = current * 0.55 + finalHeight * 0.45;
        }
      } else {
        // High fidelity procedural breathing/noise generator
        for (let i = 0; i < 16; i++) {
          // Centered filter envelope
          const distanceFromCenter = Math.abs(i - 7.5) / 8; // 0 to 1
          const envelope = Math.cos(distanceFromCenter * Math.PI / 2); // 1 in center, 0 at edge

          const wave1 = Math.sin(simTime * 1.6 + i * 0.45) * 18;
          const wave2 = Math.cos(simTime * 2.3 - i * 0.3) * 10;
          const wave3 = Math.sin(simTime * 0.85 + i * 0.8) * 6;
          
          const simulatedPeak = Math.max(0, 14 + wave1 + wave2 + wave3) * envelope;
          const continuousBreath = 8 + Math.sin(simTime * 0.6 + i * 0.8) * 3;
          
          const targetHeight = Math.max(6, continuousBreath + simulatedPeak);
          const current = nextAmplitudes[i] || 10;
          nextAmplitudes[i] = current * 0.6 + targetHeight * 0.4;
        }
      }

      setAmplitudes(nextAmplitudes);
      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);

    return () => {
      isCancelled = true;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isRecording]);

  if (!isRecording) {
    return (
      <div className="flex items-center justify-center gap-1.5 h-16 w-full transition-all duration-300" id="waveform-container-idle">
        {[...Array(16)].map((_, i) => {
          const distanceFromCenter = Math.abs(i - 7.5);
          const height = Math.max(5, 14 - distanceFromCenter * 1.1);
          return (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-500 ${
                isHighContrast 
                  ? "bg-white opacity-20" 
                  : "bg-indigo-500/30 dark:bg-indigo-400/25"
              }`}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 h-16 w-full px-2" id="waveform-container-active">
      {amplitudes.map((amp, i) => {
        const valueRatio = Math.min(1, Math.max(0, (amp - 6) / 50)); 

        let barColorClass = "from-cyan-400 via-indigo-500 to-indigo-600";
        if (isHighContrast) {
          barColorClass = "from-white via-zinc-100 to-zinc-400";
        } else if (valueRatio > 0.7) {
          barColorClass = "from-cyan-300 via-pink-500 to-rose-500";
        } else if (valueRatio > 0.35) {
          barColorClass = "from-cyan-400 via-purple-500 to-indigo-500";
        }

        return (
          <motion.div
            key={i}
            id={`waveform-bar-${i}`}
            className={`w-1.5 rounded-full bg-gradient-to-t ${barColorClass} transition-shadow duration-300`}
            style={{
              height: `${amp}px`,
              boxShadow: !isHighContrast ? `0 0 ${Math.max(3, valueRatio * 18)}px rgba(99, 102, 241, ${0.15 + valueRatio * 0.65})` : "none",
            }}
          />
        );
      })}
    </div>
  );
}
