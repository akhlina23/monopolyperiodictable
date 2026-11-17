import { Howl, Howler } from 'howler';

export type SoundEffectKey =
  | 'dice'
  | 'hop'
  | 'land'
  | 'purchase'
  | 'payment'
  | 'income'
  | 'quizSuccess'
  | 'alert'
  | 'auction';

// Generate compact in-memory PCM WAV data URIs so Howler plays real audio with zero 404 requests.
function createToneWavDataUri(
  notes: { freq: number; duration: number; delay?: number; type?: 'sine' | 'triangle' | 'square'; gain?: number }[]
): string {
  const sampleRate = 22050;
  const totalSec = Math.max(...notes.map((n) => (n.delay || 0) + n.duration)) + 0.02;
  const numSamples = Math.floor(sampleRate * totalSec);
  const buffer = new Float32Array(numSamples);

  for (const note of notes) {
    const startIdx = Math.floor((note.delay || 0) * sampleRate);
    const len = Math.floor(note.duration * sampleRate);
    const amp = note.gain ?? 0.25;
    for (let i = 0; i < len; i++) {
      const idx = startIdx + i;
      if (idx >= numSamples) break;
      const t = i / sampleRate;
      const env = Math.sin((Math.PI * i) / len) * Math.exp(-3.2 * (i / len));
      let wave = 0;
      const phase = 2 * Math.PI * note.freq * t;
      if (note.type === 'triangle') {
        wave = (2 / Math.PI) * Math.asin(Math.sin(phase));
      } else if (note.type === 'square') {
        wave = Math.sin(phase) >= 0 ? 0.5 : -0.5;
      } else {
        wave = Math.sin(phase);
      }
      buffer[idx] += wave * amp * env;
    }
  }

  // Encode 16-bit PCM WAV
  const byteLength = 44 + numSamples * 2;
  const arrayBuf = new ArrayBuffer(byteLength);
  const view = new DataView(arrayBuf);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, buffer[i]));
    view.setInt16(44 + i * 2, clamped * 32767, true);
  }

  const bytes = new Uint8Array(arrayBuf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

class SoundManager {
  private bank: Partial<Record<SoundEffectKey, Howl>> = {};
  private muted = false;
  private volume = 0.65;

  private getSound(key: SoundEffectKey): Howl | null {
    if (typeof window === 'undefined' || typeof btoa === 'undefined') return null;
    if (this.bank[key]) return this.bank[key]!;

    let src = '';
    switch (key) {
      case 'dice':
        src = createToneWavDataUri([
          { freq: 340, duration: 0.06, delay: 0, type: 'triangle', gain: 0.28 },
          { freq: 480, duration: 0.06, delay: 0.07, type: 'triangle', gain: 0.24 },
          { freq: 290, duration: 0.07, delay: 0.14, type: 'triangle', gain: 0.22 },
          { freq: 560, duration: 0.09, delay: 0.22, type: 'sine', gain: 0.25 },
        ]);
        break;
      case 'hop':
        src = createToneWavDataUri([{ freq: 520, duration: 0.07, type: 'sine', gain: 0.16 }]);
        break;
      case 'land':
        src = createToneWavDataUri([
          { freq: 440, duration: 0.09, delay: 0, type: 'triangle', gain: 0.22 },
          { freq: 660, duration: 0.12, delay: 0.06, type: 'sine', gain: 0.2 },
        ]);
        break;
      case 'purchase':
        src = createToneWavDataUri([
          { freq: 523.25, duration: 0.11, delay: 0, type: 'sine', gain: 0.25 },
          { freq: 659.25, duration: 0.11, delay: 0.09, type: 'sine', gain: 0.25 },
          { freq: 783.99, duration: 0.18, delay: 0.18, type: 'sine', gain: 0.28 },
        ]);
        break;
      case 'payment':
        src = createToneWavDataUri([
          { freq: 440, duration: 0.12, delay: 0, type: 'triangle', gain: 0.22 },
          { freq: 311.13, duration: 0.18, delay: 0.1, type: 'triangle', gain: 0.2 },
        ]);
        break;
      case 'income':
        src = createToneWavDataUri([
          { freq: 587.33, duration: 0.1, delay: 0, type: 'sine', gain: 0.24 },
          { freq: 880, duration: 0.22, delay: 0.09, type: 'sine', gain: 0.26 },
        ]);
        break;
      case 'quizSuccess':
        src = createToneWavDataUri([
          { freq: 523.25, duration: 0.1, delay: 0, type: 'sine', gain: 0.22 },
          { freq: 659.25, duration: 0.1, delay: 0.08, type: 'sine', gain: 0.22 },
          { freq: 783.99, duration: 0.1, delay: 0.16, type: 'sine', gain: 0.22 },
          { freq: 1046.5, duration: 0.24, delay: 0.24, type: 'sine', gain: 0.28 },
        ]);
        break;
      case 'alert':
        src = createToneWavDataUri([
          { freq: 260, duration: 0.15, delay: 0, type: 'square', gain: 0.14 },
          { freq: 220, duration: 0.2, delay: 0.14, type: 'square', gain: 0.14 },
        ]);
        break;
      case 'auction':
        src = createToneWavDataUri([
          { freq: 392, duration: 0.1, delay: 0, type: 'triangle', gain: 0.26 },
          { freq: 523.25, duration: 0.2, delay: 0.08, type: 'triangle', gain: 0.26 },
        ]);
        break;
    }

    const howl = new Howl({ src: [src], volume: this.volume });
    this.bank[key] = howl;
    return howl;
  }

  play(key: SoundEffectKey) {
    if (this.muted) return;
    try {
      const sound = this.getSound(key);
      if (sound) {
        sound.volume(this.volume);
        sound.play();
      }
    } catch {
      // Ignore autoplay blocks prior to user interaction
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    Howler.mute(muted);
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    Howler.volume(this.volume);
  }

  getVolume(): number {
    return this.volume;
  }
}

export const soundManager = new SoundManager();
