import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';

export const VoiceVisualizer: React.FC<{ isRecording: boolean }> = ({ isRecording }) => {
  const [bars, setBars] = useState<number[]>(new Array(24).fill(5));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      const initAudio = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
          
          const AudioContextClass = (window as any).AudioContext || (window as any).webkitSpeechRecognition;
          const audioContext = new AudioContextClass();
          audioContextRef.current = audioContext;
          
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 64; // Increased for more data points
          analyser.smoothingTimeConstant = 0.8; // Smoothing for heartbeat feel
          analyserRef.current = analyser;
          
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          const update = () => {
            if (!isRecording) return;
            
            analyser.getByteFrequencyData(dataArray);
            
            // Map the frequency data to our 24 bars
            const newBars = Array.from({ length: 24 }, (_, i) => {
              const val = dataArray[i % bufferLength];
              // Scale value to 10-100 percentage with a "pulse" feel
              return Math.max(10, (val / 255) * 100);
            });
            
            setBars(newBars);
            animationFrameRef.current = requestAnimationFrame(update);
          };
          
          update();
        } catch (err) {
          console.error("Error accessing microphone:", err);
          const interval = setInterval(() => {
            setBars(prev => prev.map(() => Math.random() * 60 + 20));
          }, 80);
          return () => clearInterval(interval);
        }
      };
      
      initAudio();
    } else {
      setBars(new Array(24).fill(10));
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [isRecording]);

  return (
    <div className="flex items-center justify-center gap-[2px] h-10 px-2 w-full">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className="w-[3px] bg-secondary rounded-full"
          animate={{ height: `${height}%` }}
          transition={{ type: 'spring', damping: 25, stiffness: 400, mass: 0.5 }}
        />
      ))}
    </div>
  );
};
