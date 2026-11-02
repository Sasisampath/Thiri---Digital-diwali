export type FireworkSound='flower-pot'|'ground-chakra'|'rocket-launch'|'rocket-burst';
/** Empty until legitimate approved audio exists. Never guess URLs or fetch substitutes. */
export const fireworksAudioAssets:Partial<Record<FireworkSound,string>>={};
export class FireworksAudio {
 private enabled=false;private playing:HTMLAudioElement|null=null;
 setEnabled(enabled:boolean){this.enabled=enabled;if(!enabled)this.stop();}
 play(sound:FireworkSound){this.stop();const url=fireworksAudioAssets[sound];if(!url||!this.enabled)return;const audio=new Audio(url);this.playing=audio;void audio.play().catch(()=>{audio.pause();if(this.playing===audio)this.playing=null;});}
 stop(){if(this.playing){this.playing.pause();this.playing.removeAttribute('src');this.playing.load();this.playing=null;}}
}
