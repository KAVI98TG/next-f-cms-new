import { publicSiteIntegrationStore, type PublicDemoRequestInput, type PublicLeadSubmissionInput, type PublicConversionEventKey } from "../../next-f/website-platform/publicSiteIntegrationStore";
import { executeAuthorizedQuery, executeIdempotentCommand, type BackendBoundaryDependencies } from "./boundary";
import type { ApiRequestContext } from "./types";

export function getPublicSiteBootstrap(deps: BackendBoundaryDependencies, context: ApiRequestContext) {
  return executeAuthorizedQuery(deps, context, { operationName: "public.site.bootstrap.get", handler: () => publicSiteIntegrationStore.buildPublicBootstrap() });
}

export function listPublicServices(deps: BackendBoundaryDependencies, context: ApiRequestContext) {
  return executeAuthorizedQuery(deps, context, { operationName: "public.services.list", handler: () => publicSiteIntegrationStore.buildPublicServices() });
}

export function listPublicCaseStudies(deps: BackendBoundaryDependencies, context: ApiRequestContext) {
  return executeAuthorizedQuery(deps, context, { operationName: "public.case-studies.list", handler: () => publicSiteIntegrationStore.buildPublicCaseStudies() });
}

export function listPublicHelp(deps: BackendBoundaryDependencies, context: ApiRequestContext) {
  return executeAuthorizedQuery(deps, context, { operationName: "public.help.list", handler: () => publicSiteIntegrationStore.buildPublicHelp() });
}

export function submitPublicLead(deps: BackendBoundaryDependencies, context: ApiRequestContext, input: PublicLeadSubmissionInput) {
  return executeIdempotentCommand(deps, context, {
    operationName: "public.lead.submit",
    commandInput: input,
    handler: () => {
      const lead = publicSiteIntegrationStore.submitPublicLead(input);
      return { responseReference: `digital-lead:${lead.id}`, data: { leadId: lead.id, received: true as const } };
    },
  });
}

export function submitPublicDemoAccessRequest(deps: BackendBoundaryDependencies, context: ApiRequestContext, input: PublicDemoRequestInput) {
  return executeIdempotentCommand(deps, context, {
    operationName: "public.demo-access.request",
    commandInput: input,
    handler: () => {
      const request = publicSiteIntegrationStore.submitPublicDemoRequest(input);
      return { responseReference: `demo-request:${request.id}`, data: { demoRequestId: request.id, status: request.status } };
    },
  });
}

export function trackPublicConversion(deps: BackendBoundaryDependencies, context: ApiRequestContext, input: { eventKey: PublicConversionEventKey; anonymousSessionId: string; payload: Record<string, unknown> }) {
  return executeIdempotentCommand(deps, context, {
    operationName: "public.conversion.track",
    commandInput: input,
    handler: () => {
      const receipt = publicSiteIntegrationStore.recordConversion({ ...input, requestId: context.requestId });
      return { responseReference: `public-conversion:${receipt.id}`, data: { receiptId: receipt.id, accepted: true as const } };
    },
  });
}
