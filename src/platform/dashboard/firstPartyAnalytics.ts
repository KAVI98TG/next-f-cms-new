import { ProductionBackendClient } from "../../services/production/httpClient";
import { readProductionRuntimeConfig } from "../../services/production/runtime";

export type TrackingDimension={hourStart:string;eventKey:string;value:number};
export type TrackingReport={reportId:string;scope:{organizationId:string;siteId:string};environment:string;periodStart:string;periodEnd:string;granularity:string;metrics:Array<{metricKey:string;value:number;eventKey:string}>;dimensions:TrackingDimension[];generatedAt:string;sourceFreshThrough:string|null};
export type TrackingHealth={healthId:string;scope:{organizationId:string;siteId:string};environment:string;sdkDetected:boolean;sdkVersion?:string;contractVersion:string;lastEventReceivedAt?:string;receivedCount:number;acceptedCount:number;rejectedCount:number;duplicateCount:number;consentRestrictedCount:number;schemaErrorCount:number;unknownEventCount:number;collectorStatus:"healthy"|"degraded"|"unavailable"|"unknown";processingStatus:"healthy"|"delayed"|"blocked"|"unknown";generatedAt:string};

const runtime=readProductionRuntimeConfig();
const client=runtime.mode==="production-api"?new ProductionBackendClient(runtime.apiBaseUrl):undefined;
async function query<T>(operation:string,input:unknown):Promise<T>{if(!client)throw new Error("First-party analytics are available through the production CMS API.");const result=await client.execute<T>({operation,kind:"query",input});if(!result.ok)throw new Error(`${result.problem.code}: ${result.problem.detail}`);return result.data;}
export async function loadFirstPartyAnalytics(days:7|30|90){const input={siteId:"site_nextf_main",environment:"production",days};const [report,health]=await Promise.all([query<TrackingReport>("staff.marketing.analytics.report.get",input),query<TrackingHealth>("staff.marketing.tracking.health.get",input)]);return {report,health};}
