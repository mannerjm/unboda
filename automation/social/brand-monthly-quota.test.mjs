import test from "node:test";import assert from "node:assert/strict";
import {forecastBrandMonthlyPosts} from "./brand-monthly-quota.mjs";
test("7 lifestyle, 3 zodiac, and 8 video channel deliveries make 540 per 30 days",()=>{
 const a=forecastBrandMonthlyPosts({daysInMonth:30,textChannelsPerOriginal:1,
 videoChannelsPerOriginal:2,additionalPlannedChannelPosts:0,accountMonthlyInventoryVerified:true});
 assert.equal(a.estimatedTextDeliveries,210);assert.equal(a.estimatedZodiacDeliveries,90);assert.equal(a.estimatedVideoDeliveries,240);
 assert.equal(a.estimatedBrandMonthlyDeliveries,540);assert.equal(a.marginToOperatorCap,60);
 assert.equal(a.canEnableAutoPublishing,false);
});
test("same plan in a 31 day month reaches 558 and leaves 42 for other promotions",()=>{
 const a=forecastBrandMonthlyPosts({daysInMonth:31,textChannelsPerOriginal:1,
 videoChannelsPerOriginal:2,additionalPlannedChannelPosts:0});
 assert.equal(a.estimatedBrandMonthlyDeliveries,558);assert.equal(a.marginToOperatorCap,42);
});
test("7 lifestyle originals on two networks exceed 600 monthly together with zodiac and video",()=>{
 const a=forecastBrandMonthlyPosts({textChannelsPerOriginal:2,
 videoChannelsPerOriginal:2,additionalPlannedChannelPosts:0});
 assert.equal(a.estimatedBrandMonthlyDeliveries,750);assert.equal(a.state,"BLOCKED_SOFT_CAP");
});
test("no launch if existing reservations or number of networks is unknown",()=>{
 assert.equal(forecastBrandMonthlyPosts({textChannelsPerOriginal:1,videoChannelsPerOriginal:2}).reason,"EXISTING_MONTHLY_POST_INVENTORY_MISSING");
 assert.equal(forecastBrandMonthlyPosts({additionalPlannedChannelPosts:0}).reason,"EXACT_CHANNEL_COUNTS_NOT_CONFIRMED");
});

test("approved 600-post operator ceiling includes existing promotional channel deliveries",()=>{
 const ok=forecastBrandMonthlyPosts({daysInMonth:31,textChannelsPerOriginal:1,
  videoChannelsPerOriginal:2,additionalPlannedChannelPosts:40});
 assert.equal(ok.estimatedBrandMonthlyDeliveries,598);
 assert.equal(ok.state,"FORECAST_ONLY");
 const over=forecastBrandMonthlyPosts({daysInMonth:31,textChannelsPerOriginal:1,
  videoChannelsPerOriginal:2,additionalPlannedChannelPosts:43});
 assert.equal(over.estimatedBrandMonthlyDeliveries,601);
 assert.equal(over.state,"BLOCKED_SOFT_CAP");
 assert.equal(over.canEnableAutoPublishing,false);
});
