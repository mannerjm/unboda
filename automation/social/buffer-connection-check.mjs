// UNBODA Buffer authorization smoke test.
// Safe read-only: queries organizations and linked channels; no post mutations.
// Run only in a protected server runtime with BUFFER_API_KEY in environment.
// Never print token, request Authorization header, or environment values.
import {getBufferOrganizations,getBufferChannels} from "./buffer-api.mjs";
export async function verifyBufferConnection({apiKey,fetcher=fetch}={}){
  if(typeof apiKey!=="string"||apiKey.length<10)
    return {state:"BLOCKED",reason:"BUFFER_API_KEY_NOT_CONFIGURED"};
  let orgs;
  try {orgs=await getBufferOrganizations({apiKey,fetcher});}
  catch {return {state:"FAILED",reason:"BUFFER_ORGANIZATION_NETWORK_ERROR"};}
  if(orgs.state!=="READ_ONLY_ORGANIZATIONS")
    return {state:"FAILED",reason:"BUFFER_ORGANIZATION_LOOKUP_FAILED"};
  const all=[];
  for(const org of orgs.organizations){
    let channels;
    try {channels=await getBufferChannels({apiKey,organizationId:org.id,fetcher});}
    catch {return {state:"FAILED",reason:"BUFFER_CHANNEL_NETWORK_ERROR"};}
    if(channels.state!=="READ_ONLY_CHANNELS")
      return {state:"FAILED",reason:"BUFFER_CHANNEL_LOOKUP_FAILED"};
    all.push({organizationId:org.id,organizationName:org.name,
      connectedChannels:channels.channels.map(ch=>({id:ch.id,name:ch.name,service:ch.service}))});
  }
  const found=new Set(all.flatMap(o=>o.connectedChannels.map(c=>c.service?.toLowerCase())));
  const target=["instagram","tiktok","youtube"];
  return {state:target.every(c=>found.has(c))?"CONNECTED_READ_ONLY":"INCOMPLETE_CHANNELS",
    verifiedServices:target.filter(c=>found.has(c)),
    missingServices:target.filter(c=>!found.has(c)),
    organizations:all,
    publishedAnything:false,
    paidGenerationPerformed:false,
    videoAutomationEnabled:false};
}
// Opt-in must be explicit even for non-billable read-only calls.
if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href){
  if(process.env.BUFFER_CONNECTION_SMOKE_ENABLED!=="true"){
    process.stdout.write(JSON.stringify({state:"BLOCKED",reason:"READ_ONLY_SMOKE_SWITCH_OFF"})+"\n");
    process.exitCode=1;
  } else {
    const report=await verifyBufferConnection({apiKey:process.env.BUFFER_API_KEY});
    process.stdout.write(JSON.stringify(report,null,2)+"\n");
    if(report.state!=="CONNECTED_READ_ONLY")process.exitCode=1;
  }
}
