import { audioAssets, audioManager } from './audio-manager';
export type FireworkSound='flower-pot'|'ground-chakra'|'rocket-launch'|'rocket-burst';
export const fireworksAudioAssets:Record<FireworkSound,string>={
 'flower-pot':audioAssets['flower-pot'],'ground-chakra':audioAssets['ground-chakra'],
 'rocket-launch':audioAssets['rocket-launch'],'rocket-burst':audioAssets['rocket-burst'],
};
export class FireworksAudio {
 private enabled=true;
 setEnabled(enabled:boolean){if(this.enabled===enabled)return;this.enabled=enabled;if(!enabled)this.stop();}
 play(sound:FireworkSound,duration?:number){if(this.enabled)audioManager.play('fireworks',sound,{duration});}
 stop(){audioManager.stop('fireworks');}
}
