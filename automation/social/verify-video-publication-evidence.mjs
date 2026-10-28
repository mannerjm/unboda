// READ ONLY. Verify a new video was truly published by an allowed network.
// A scheduled Metricool item, remote draft or preview link is NOT publication.
// The actual publishing action is intentionally absent from this module.
const ALLOWED={
 instagram:[['instagram.com','/reel/'],['www.instagram.com','/reel/']],
 facebook:[['facebook.com','/reel/'],['www.facebook.com','/reel/'],['www.facebook.com','/videos/']],
 youtube:[['youtube.com','/shorts/'],['www.youtube.com','/shorts/'],['youtu.be','/']],
 tiktok:[['www.tiktok.com','/@'],['tiktok.com','/@']],
 threads:[['www.threads.com','/@'],['threads.com','/@']]
};
const deny=(reason)=>Object.freeze({state:'PUBLICATION_UNVERIFIED',
 reason,recordedPublication:false,activateFourPerDay:false});
export function verifyVideoPublishReceipt({expected,provider,publicCheck}={}){
 if(!expected||!provider||!publicCheck)return deny('PROVIDER_AND_INDEPENDENT_PUBLIC_URL_PROOF_REQUIRED');
 if(!/^[0-9a-f]{64}$/.test(expected.sha256??'')||
    typeof expected.jobKey!=='string'||expected.jobKey.length<12||
    typeof expected.network!=='string'||!ALLOWED[expected.network]||
    expected.brandId!=='7377653')
  return deny('IDENTIFIED_UNBODA_VIDEO_EXPECTATION_REQUIRED');
 if(provider.source!=='metricool-confirmed-published-post'||
    provider.brandId!==expected.brandId||
    provider.network!==expected.network||
    provider.jobKey!==expected.jobKey||
    provider.originalAssetSha256!==expected.sha256||
    provider.status!=='PUBLISHED'||provider.videoMediaAttached!==true||
    typeof provider.providerPostId!=='string'||provider.providerPostId.length<4)
  return deny('POST_NOT_PROVED_AS_OWN_VIDEO');
 let url;
 try{url=new URL(provider.publicUrl)}catch{return deny('PUBLIC_VIDEO_URL_INVALID')}
 if(url.protocol!=='https:'||url.username||url.password||
    !ALLOWED[expected.network].some(([host,prefix])=>
      url.hostname===host&&url.pathname.startsWith(prefix)))
  return deny('PUBLIC_VIDEO_PLATFORM_URL_NOT_ALLOWED');
 if(publicCheck.url!==provider.publicUrl||
    publicCheck.httpStatus!==200||
    publicCheck.publiclyReachable!==true||
    publicCheck.videoOnPageVerified!==true||
    publicCheck.platformPostId!==provider.providerPostId)
  return deny('INDEPENDENT_PUBLIC_VIDEO_VERIFICATION_REQUIRED');
 const publishedAt=Date.parse(provider.publishedAt);
 const checkedAt=Date.parse(publicCheck.checkedAt);
 if(!Number.isFinite(publishedAt)||!Number.isFinite(checkedAt)||
    checkedAt<publishedAt||checkedAt-publishedAt>7*86400000)
  return deny('PUBLICATION_TIMESTAMP_INVALID');
 return Object.freeze({state:'SINGLE_CHANNEL_PUBLICATION_PROVED',
  network:expected.network,providerPostId:provider.providerPostId,
  publicUrl:provider.publicUrl,verifiedAt:publicCheck.checkedAt,
  recordedPublication:true,activateFourPerDay:false,
  independentVideoPageVerified:true});
}
