// Deterministic four-scene Korean narration mix plan.
// Inputs are FOUR already generated voice clips and the final 30s visual.
// No provider call, no automatic publishing. Audio must be listened to first.
export const SCENE_SLOTS=Object.freeze([
 Object.freeze({start:1.2,end:10.15}),
 Object.freeze({start:10.15,end:17.2}),
 Object.freeze({start:17.2,end:24.2}),
 Object.freeze({start:24.2,end:30})
]);
export function planTimedSceneVoices({voices=[],visualFile,outputFile,
 rightsApproved=false,pronunciationApproved=false,scriptApproved=false}={}) {
 const reasons=[];
 if(typeof visualFile!=="string"||!visualFile.endsWith(".mp4"))
  reasons.push("FINAL_VISUAL_MP4_REQUIRED");
 if(typeof outputFile!=="string"||!outputFile.endsWith(".mp4"))
  reasons.push("FINAL_OUTPUT_MP4_REQUIRED");
 if(!Array.isArray(voices)||voices.length!==4)
  reasons.push("FOUR_KOREAN_VOICE_SCENES_REQUIRED");
 else voices.forEach((v,i)=>{
  if(typeof v?.file!=="string"||!/[.]((mp3)|(wav)|(m4a))$/i.test(v.file))
   reasons.push("VOICE_FILE_"+i+"_MISSING");
  const max=SCENE_SLOTS[i].end-SCENE_SLOTS[i].start;
  if(!Number.isFinite(v?.durationSeconds)||v.durationSeconds<1.0||
    v.durationSeconds>max-.12)
   reasons.push("VOICE_SEGMENT_"+i+"_OVERRUN_OR_INVALID");
 });
 if(!rightsApproved)reasons.push("VOICE_LICENSE_REQUIRED");
 if(!pronunciationApproved)reasons.push("VOICE_PRONUNCIATION_LISTENING_QA_REQUIRED");
 if(!scriptApproved)reasons.push("SCRIPT_CONTENT_QA_REQUIRED");
 return {state:reasons.length?"BLOCKED":"MIX_PLAN_READY",
  reasons,publicationAllowed:false};
}
export function sceneVoiceFfmpegArgs({voices,visualFile,outputFile}={}) {
 if(!Array.isArray(voices)||voices.length!==4)throw Error("FOUR_VOICES_REQUIRED");
 const cmd=["-hide_banner","-loglevel","error","-y","-i",visualFile];
 for(const v of voices)cmd.push("-i",v.file);
 const fg=["[0:a]volume=0.28[bed]"];
 const stems=[];
 for(let i=0;i<4;i++){
  const start=SCENE_SLOTS[i].start;
  const max=Math.round((SCENE_SLOTS[i].end-start-.1)*100)/100;
  const delay=Math.round(start*1000);
  fg.push("["+(i+1)+":a]aresample=48000,atrim=duration="+max+
    ",asetpts=PTS-STARTPTS,volume=1.0,adelay="+delay+
    ":all=1,apad=pad_dur=32[s"+i+"]");
  stems.push("[s"+i+"]");
 }
 fg.push("[bed]"+stems.join("")+"amix=inputs=5:duration=first"+
   ":dropout_transition=0,alimiter=limit=0.92[a]");
 cmd.push("-filter_complex",fg.join(";"),"-map","0:v:0","-map","[a]",
   "-t","30","-c:v","copy","-c:a","aac","-b:a","160k",
   "-movflags","+faststart",outputFile);
 return cmd;
}
