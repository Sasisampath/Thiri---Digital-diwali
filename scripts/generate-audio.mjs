// Original synthesized placeholders; source and rights are documented in docs/AUDIO.md.
import ts from 'typescript';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const compiled=ts.transpileModule(await readFile(new URL('../src/lib/audio/synthesis.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {synthesize}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const destination=new URL('../public/assets/audio/',import.meta.url);await mkdir(destination,{recursive:true});
const files={'flower-pot':'flower-pot-fountain', 'ground-chakra':'ground-chakra-spin',ignite:'fuse-ignite',crackle:'firestick-crackle'};
for(const[cue,name]of Object.entries(files)){
 const pcm=synthesize(cue,44100),temporary=join(tmpdir(),`thiri-${name}.f32`);await writeFile(temporary,Buffer.from(pcm.buffer));
 execFileSync(process.env.FFMPEG||'ffmpeg',['-y','-v','error','-f','f32le','-ar','44100','-ac','1','-i',temporary,'-codec:a','libmp3lame','-b:a','96k',new URL(`${name}.mp3`,destination).pathname]);
}
