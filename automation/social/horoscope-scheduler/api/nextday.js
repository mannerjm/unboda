import {timingSafeEqual,createHash} from "node:crypto";
import {put} from "@vercel/blob";
import {kstTomorrow,scheduleKind} from "../lib/scheduler.mjs";
export const config={maxDuration:60};
const hash=x=>createHash("sha256").update(x).digest();
function authorized(req){
 const expected=process.env.CRON_SECRET;
 const header=req.headers.authorization??"";
 const match=/^Bearer\s+(.+)$/i.exec(header);
 if(!expected||expected.length<32||!match)return false;
 return timingSafeEqual(hash(expected),hash(match[1].trim()));
}
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).json({error:"METHOD_NOT_ALLOWED"});
 if(!authorized(req))return res.status(401).json({error:"UNAUTHORIZED"});
 if(process.env.HOROSCOPE_BOOKING_ENABLED!=="true")return res.status(503).json({state:"DISABLED_FAIL_CLOSED"});
 const day=kstTomorrow(),result=[];
 for(const type of ["zodiac","constellation"]){
  try{
   result.push(await scheduleKind({date:day,type,token:process.env.METRICOOL_API_TOKEN,
    userId:process.env.METRICOOL_USER_ID,brandId:process.env.METRICOOL_BLOG_ID,
    claim:async(path,body)=>put(path,body,{access:"public",allowOverwrite:false,
       addRandomSuffix:false,contentType:"application/json",token:process.env.BLOB_READ_WRITE_TOKEN})}));
  }catch(e){result.push({type,date:day,state:"BLOCKED",reason:String(e?.message??e).slice(0,150)});
   console.error("UNBODA_HOROSCOPE_SLOT_BLOCKED",{date:day,type,reason:String(e?.message??"unknown").slice(0,130)});
  }
 }
 const ok=result.every(r=>r.state==="ALREADY_RESERVED"||r.state==="PENDING_THREE_NETWORKS");
 console.info("UNBODA_HOROSCOPE_NIGHTLY",{date:day,ok,results:result.map(r=>({type:r.type,state:r.state,postId:r.postId??null}))});
 return res.status(ok?200:503).json({dateKst:day,ok,results:result});
}
