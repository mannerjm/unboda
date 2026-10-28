"use strict";
if(process.env.SOCIAL_PUBLISH_ENABLED==="true"){
 const {makeVideoHandler}=require("../../lib/video-publisher.cjs");
 const {makeVideoClaim}=require("../../lib/video-claim.cjs");
 const {put}=require("@vercel/blob");
 module.exports=makeVideoHandler({
  reserveSlot:makeVideoClaim({put,token:process.env.BLOB_READ_WRITE_TOKEN})
 });
}else{
 module.exports=require("../../lib/monitor.cjs").handlerFor("short-video");
}
