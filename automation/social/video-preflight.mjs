// Read-only CLI. Run with: node automation/social/video-preflight.mjs
// No vendor API calls, subscriptions, media creation or SNS posts.
import {readFile} from "node:fs/promises";
import {inspectAutopilotReadiness,plannedSixHourSlots} from "./video-readiness.mjs";
const config=JSON.parse(await readFile(new URL("./video-automation.config.json",import.meta.url),"utf8"));
const report=inspectAutopilotReadiness({config,env:process.env,proofs:{}});
const slots=plannedSixHourSlots({now:Date.now(),count:8});
const output={
 title:"UNBODA 6-hour autonomous video preflight",
 environment:"review_branch_only",
 configuredCadenceHours:config.video.targetCadenceHours,
 existingTextCadenceHours:config.existingTextImage.cadenceHours,
 currentState:report.ready?"PREFLIGHT_ONLY_NOT_PUBLISHED":"BLOCKED_NO_AUTO_VIDEO",
 missingEnvironmentKeys:report.missingEnvironment,
 missingHumanOrSystemProofs:report.missingProofs,
 switchesOff:report.gates,
 nextEightTargetSlots:slots,
 note:"Connected ChatGPT Metricool MCP is NOT reusable REST authentication. Preflight is not a production worker.",
 performedExternalWrites:false,
 generatedVideo:false,
 scheduledToMetricool:false
};
process.stdout.write(JSON.stringify(output,null,2)+"\n");
