import test from "node:test";import assert from "node:assert/strict";
import {forecastBrandMonthlyPosts} from "./brand-monthly-quota.mjs";
test("3h photo one channel and 4 videos on 2 channels make 480 per 30 days",()=>{
 const a=forecastBrandMonthlyPosts({daysInMonth:30,textChannelsPerOriginal:1,
 videoChannelsPerOriginal:2,additionalPlannedChannelPosts:0,accountMonthlyInventoryVerified:true});
 assert.equal(a.estimatedTextDeliveries,240);assert.equal(a.estimatedVideoDeliveries,240);
 assert.equal(a.estimatedBrandMonthlyDeliveries,480);assert.equal(a.marginToOperatorCap,20);
 assert.equal(a.canEnableAutoPublishing,false);
});
test("same plan in a 31 day month reaches 496 and needs extra reservation audit",()=>{
 const a=forecastBrandMonthlyPosts({daysInMonth:31,textChannelsPerOriginal:1,
 videoChannelsPerOriginal:2,additionalPlannedChannelPosts:0});
 assert.equal(a.estimatedBrandMonthlyDeliveries,496);assert.equal(a.marginToOperatorCap,4);
});
test("3h text on two networks would exceed the 600 base fair use and soft cap",()=>{
 const a=forecastBrandMonthlyPosts({textChannelsPerOriginal:2,
 videoChannelsPerOriginal:2,additionalPlannedChannelPosts:0});
 assert.equal(a.estimatedBrandMonthlyDeliveries,720);assert.equal(a.state,"BLOCKED_SOFT_CAP");
});
test("no launch if existing reservations or number of networks is unknown",()=>{
 assert.equal(forecastBrandMonthlyPosts({textChannelsPerOriginal:1,videoChannelsPerOriginal:2}).reason,"EXISTING_MONTHLY_POST_INVENTORY_MISSING");
 assert.equal(forecastBrandMonthlyPosts({additionalPlannedChannelPosts:0}).reason,"EXACT_CHANNEL_COUNTS_NOT_CONFIRMED");
});
