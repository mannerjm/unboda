"use strict";
const {handlerFor}=require("./lib/monitor.cjs");
const textAudit=handlerFor("text-image"),videoAudit=handlerFor("short-video");
module.exports=async(req,res)=>{
 const path=String(req.url??"/").split("?")[0];
 if(path==="/api/cron/text-image")return textAudit(req,res);
 if(path==="/api/cron/video")return videoAudit(req,res);
 res.statusCode=404;
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Robots-Tag","noindex,nofollow");
 return res.end("No public service");
};
