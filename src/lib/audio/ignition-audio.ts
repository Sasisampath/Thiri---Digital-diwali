/** Add only verified asset URLs here; missing supplied audio means silence, no fetches. */
export const ignitionAudioAssets: { crackle?: string; ignite?: string } = {};
export class IgnitionAudio {
  private playing = new Set<HTMLAudioElement>();
  private enabled = false;
  setEnabled(enabled: boolean) { this.enabled = enabled; if (!enabled) this.stop(); }
  play(kind: keyof typeof ignitionAudioAssets) {
    const src = ignitionAudioAssets[kind]; if (!this.enabled || !src) return;
    const audio = new Audio(src); audio.loop = kind === 'crackle'; this.playing.add(audio);
    const cleanup = () => { this.playing.delete(audio); audio.removeEventListener('ended', cleanup); audio.removeEventListener('error', cleanup); };
    audio.addEventListener('ended', cleanup); audio.addEventListener('error', cleanup);
    void audio.play().catch(() => { cleanup(); audio.pause(); });
  }
  stop() { this.playing.forEach(audio => { audio.pause(); audio.removeAttribute('src'); audio.load(); }); this.playing.clear(); }
}
