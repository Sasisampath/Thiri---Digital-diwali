import { audioAssets, audioManager } from './audio-manager';
export const ignitionAudioAssets={crackle:audioAssets.crackle,ignite:audioAssets.ignite};
export class IgnitionAudio {
 private enabled=true;
 setEnabled(enabled:boolean){if(this.enabled===enabled)return;this.enabled=enabled;if(!enabled)this.stop();}
 play(kind:keyof typeof ignitionAudioAssets){if(this.enabled)audioManager.play('ignition',kind,{loop:kind==='crackle'});}
 stop(){audioManager.stop('ignition');}
}
