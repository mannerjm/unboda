import test from "node:test";
import assert from "node:assert/strict";
import {verifyBufferConnection} from "./buffer-connection-check.mjs";
test("absent token cannot make any network calls",async()=>{
  let count=0;
  const r=await verifyBufferConnection({fetcher:async()=>{count++;throw Error("unexpected");}});
  assert.equal(r.state,"BLOCKED");assert.equal(count,0);
});
test("Buffer 3 linked channels verified with read-only mocked GraphQL queries",async()=>{
  let calls=0;
  const r=await verifyBufferConnection({apiKey:"mock-synthetic-test-key",
    fetcher:async(url,opt)=>{
      calls++;
      assert.equal(opt.method,"POST");
      assert.equal(url,"https://api.buffer.com");
      assert.match(JSON.parse(opt.body).query,/^query/);
      const result=calls===1?
        {data:{account:{organizations:[{id:"org_12345",name:"UNBODA"}]}}}:
        {data:{channels:[
          {id:"ig123",name:"unboda.kr",service:"instagram"},
          {id:"tt123",name:"unboda.kr",service:"tiktok"},
          {id:"yt123",name:"unboda",service:"youtube"}]}};
      return {ok:true,json:async()=>result};
    }});
  assert.equal(calls,2);
  assert.equal(r.state,"CONNECTED_READ_ONLY");
  assert.deepEqual(r.missingServices,[]);
  assert.equal(r.organizations[0].connectedChannels.length,3);
  assert.equal(r.publishedAnything,false);
  assert.equal(r.videoAutomationEnabled,false);
  assert.equal(JSON.stringify(r).includes("mock-synthetic-test-key"),false);
});
test("missing a social channel never reports full connection",async()=>{
  let calls=0;
  const r=await verifyBufferConnection({apiKey:"mock-synthetic-test-key",
    fetcher:async()=>{
      calls++;
      return {ok:true,json:async()=>calls===1?
        {data:{account:{organizations:[{id:"org_12345",name:"UNBODA"}]}}}:
        {data:{channels:[{id:"ig123",name:"unboda",service:"instagram"}]}}};
    }});
  assert.equal(r.state,"INCOMPLETE_CHANNELS");
  assert.deepEqual(r.missingServices,["tiktok","youtube"]);
});
test("API authentication errors stay generic and never output secret",async()=>{
  const r=await verifyBufferConnection({apiKey:"mock-synthetic-test-key",
    fetcher:async()=>({ok:false,status:401})});
  assert.equal(r.state,"FAILED");
  assert.equal(r.reason,"BUFFER_ORGANIZATION_LOOKUP_FAILED");
});
test("network outages do not initiate retries, writes or billing",async()=>{
  const r=await verifyBufferConnection({apiKey:"mock-synthetic-test-key",
    fetcher:async()=>{throw Error("socket unavailable");}});
  assert.equal(r.state,"FAILED");
  assert.equal(r.reason,"BUFFER_ORGANIZATION_NETWORK_ERROR");
});
