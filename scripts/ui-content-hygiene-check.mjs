import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const exists=(p)=>fs.existsSync(path.join(root,p));
const failures=[];
const pass=[];
const check=(name,ok,detail="")=>{if(ok)pass.push(name);else failures.push(`${name}${detail?`: ${detail}`:""}`);};

const tokens=read("src/css/tokens.css");
const shell=read("src/app/layout/AppShell.tsx");
const topbar=read("src/app/layout/Topbar.tsx");
const sidebar=read("src/app/layout/Sidebar.tsx");
const metric=read("src/shared/components/MetricCard.tsx");

check("CMS body text scale keeps 14px secondary copy",tokens.includes("--text-xs: 14px;")&&tokens.includes("--text-sm: 14px;"));
check("CMS typography floor token is 12px",tokens.includes("--text-min: 12px;")&&tokens.includes("--text-micro: 12px;"));
check("global page guide is removed from the application shell",!shell.includes("PageGuide")&&!topbar.includes("BookOpen")&&!exists("src/app/layout/PageGuide.tsx"));
check("global shortcut help chrome is removed",!shell.includes("KeyboardShortcuts")&&!topbar.includes("HelpCircle")&&!exists("src/app/layout/KeyboardShortcuts.tsx"));
check("workspace navigation does not render descriptive microcopy",!sidebar.includes("domain.description"));
check("metric cards expose only label value and icon",!metric.includes("detail")&&!metric.includes("trend")&&!metric.includes("metric-card__footer"));

const summaryCardContracts=[
  ["src/gaming-store/dashboard/GamingDashboard.tsx", "DashboardMetric"],
  ["src/gaming-store/analytics/AnalyticsPage.tsx", "AnalyticsStat"],
  ["src/gaming-store/customers/CustomersPage.tsx", "CustomerMetric"],
  ["src/gaming-store/live-operations/LiveOperationsPage.tsx", "live-ops-stat"],
  ["src/gaming-store/vnext/cms/StorefrontVNextPage.tsx", "storefront-overview-strip"],
  ["src/gaming-store/promotions/PromotionsPage.tsx", "promotion-overview-card"],
  ["src/gaming-store/support/SupportPage.tsx", "support-ops-health"],
  ["src/gaming-store/reviews/ReviewsPage.tsx", "gaming-review-metric"],
  ["src/platform/health/HealthPage.tsx", "health-hero"],
  ["src/next-f/website-platform/WebsitePlatformPage.tsx", "website-platform-header-stat"],
];
for(const [file,contract] of summaryCardContracts){
  const text=read(file);
  let ok=true;
  if(contract==="DashboardMetric"||contract==="AnalyticsStat"||contract==="CustomerMetric") ok=!new RegExp(`function ${contract}\\([^)]*detail`).test(text)&&!new RegExp(`<${contract}\\b[^>]*\\sdetail=`).test(text);
  else if(contract==="live-ops-stat") ok=!/<(?:button|div)[^>]*className=\{?[^>]*live-ops-stat[\s\S]{0,260}?<small>/.test(text);
  else if(contract==="storefront-overview-strip") { const block=text.match(/<div className="storefront-overview-strip">([\s\S]*?)<\/div>\s*\n\s*<Card className="storefront-hero-builder">/); ok=Boolean(block)&&!block[1].includes("<small>"); }
  else if(contract==="promotion-overview-card") ok=!/promotion-overview-card[^\n]*<small>/.test(text);
  else if(contract==="support-ops-health") { const block=text.match(/<section className="support-ops-health"[\s\S]*?<\/section>/); ok=Boolean(block)&&!block[0].includes("<small>"); }
  else if(contract==="gaming-review-metric") ok=!/gaming-review-metric[^\n]*<small>/.test(text);
  else if(contract==="health-hero") { const block=text.match(/<div className="health-hero">([\s\S]*?)<\/div><Card>/); ok=Boolean(block)&&!block[1].includes("<p>"); }
  else if(contract==="website-platform-header-stat") ok=!/website-platform-header-stat[^\n]*<em>/.test(text);
  check(`${contract} summary cards have no footer/helper line`,ok);
}

const sourceRoot=path.join(root,"src");
const walk=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>{
  const full=path.join(dir,entry.name);
  return entry.isDirectory()?walk(full):[full];
});

for(const file of walk(sourceRoot)){
  const rel=path.relative(root,file).replaceAll("\\","/");
  if(file.endsWith(".css") && rel!=="src/css/gaming-public.css"){
    const text=fs.readFileSync(file,"utf8");
    for(const match of text.matchAll(/font-size\s*:\s*([^;}{]+)/g)){
      const expr=match[1].trim();
      for(const px of expr.matchAll(/([0-9]*\.?[0-9]+)px/g)){
        const value=Number(px[1]);
        if(value<12) failures.push(`${rel}: internal CMS font-size ${expr} is below 12px`);
        if(value===13) failures.push(`${rel}: 13px is outside the CMS type scale; use 12px microcopy or 14px readable copy`);
      }
    }
  }
  if(file.endsWith(".tsx")){
    const text=fs.readFileSync(file,"utf8");
    for(const match of text.matchAll(/<MetricCard\b[\s\S]*?\/>/g)){
      const tag=match[0];
      if(/\bdetail\s*=/.test(tag)) failures.push(`${rel}: MetricCard detail/footer copy is not allowed`);
      if(/\btrend\s*=/.test(tag)) failures.push(`${rel}: MetricCard trend/footer copy is not allowed`);
    }
    for(const match of text.matchAll(/<SectionHeader\b[^>]*?description="([^"]+)"/gs)){
      const description=match[1];
      if(description.length>110) failures.push(`${rel}: SectionHeader description exceeds 110 characters`);
      if(/\b(?:architecture|foundation|prototype|sandbox|future|later|deferred)\b/i.test(description)) failures.push(`${rel}: SectionHeader contains developer/roadmap copy: ${description}`);
    }

    for(const match of text.matchAll(/(?:description|detail|hint|title|label|placeholder)="([^"]+)"|<(?:p|small|strong|span|h3|h4)[^>]*>([^<{][^<]*)<\/(?:p|small|strong|span|h3|h4)>/g)){
      const visible=(match[1]??match[2]??"").trim();
      if(/\b(?:roadmap|foundation|deferred|prototype|next phase|scaffold)\b/i.test(visible)) failures.push(`${rel}: visible developer/roadmap copy: ${visible}`);
      if(rel.startsWith("src/gaming-store/")&&!rel.includes("/vnext/public/")&&/\b(?:production D1|shared D1|Gaming API|Gaming Worker|API bridge|server-side|server enforced|server-enforced|canonical|immutable|credential|contract-bound|provider mapping|source of truth|control plane|resync)\b/i.test(visible)) failures.push(`${rel}: Gaming operator UI exposes implementation vocabulary: ${visible}`);
    }
    if(rel.startsWith("src/gaming-store/")&&!rel.includes("/vnext/public/")&&/Gaming Store · P\d+/i.test(text)) failures.push(`${rel}: Gaming operator UI exposes development phase labeling`);
  }
}


const pricingPage=read("src/gaming-store/pricing/PricingPage.tsx");
const pricingOverview=pricingPage.match(/<div className="pricing-overview-grid">([\s\S]*?)<\/div>\s*\n\s*<div className="pricing-control-grid">/);
check("Gaming pricing removes architecture explainer panels",!pricingPage.includes("pricing-safeguards-panel")&&!pricingPage.includes("Pricing authority & security")&&!pricingPage.includes("No supplier resync required"));
check("Gaming pricing overview avoids duplicate editable metrics",Boolean(pricingOverview)&&(pricingOverview[1].match(/<MetricCard/g)||[]).length===2&&!pricingOverview[1].includes('label="Pricing mode"')&&!pricingOverview[1].includes('label="Retail target"'));
const liveOpsPage=read("src/gaming-store/live-operations/LiveOperationsPage.tsx");
check("Gaming Live Operations excludes developer diagnostics",!liveOpsPage.includes("live-ops-diagnostics")&&!liveOpsPage.includes("Command bridge")&&!liveOpsPage.includes("Payment providers"));
const supplierPage=read("src/gaming-store/suppliers/SuppliersPage.tsx");
check("Gaming Suppliers excludes credential architecture explainer",!supplierPage.includes("supplier-safeguards-grid")&&!supplierPage.includes("Supplier credentials stay out of the CMS browser")&&!supplierPage.includes("Runtime & publishing"));
const promotionsPage=read("src/gaming-store/promotions/PromotionsPage.tsx");
check("Gaming Promotions keeps margin controls without architecture explainer",promotionsPage.includes("Campaign Margin floor LKR")&&!promotionsPage.includes("promotion-safety-panel")&&!promotionsPage.includes("promotion-margin-guard")&&!promotionsPage.includes("Server-enforced protection"));

const standard="docs/CMS-UI-CONTENT-AND-TYPOGRAPHY-STANDARD.md";
check("UI content and typography standard ships with the release",exists(standard));
if(exists(standard)){
  const doc=read(standard);
  check("standard defines keep/remove rules",doc.includes("Keep in the UI")&&doc.includes("Remove from the UI"));
  check("standard covers future feature implementation",doc.includes("New section checklist")&&doc.includes("14 px"));
  check("standard forbids metric-card footer copy",doc.includes("Metric cards contain only")&&doc.includes("Do not add `detail`, footer, helper or trend copy"));
  check("standard keeps implementation vocabulary out of daily Gaming UI",doc.includes("D1, Worker, API bridge")&&doc.includes("Gaming operator UI"));
}

check("Support order context does not reference unsupported paymentProvider",!read("src/gaming-store/support/SupportPage.tsx").includes("orderContext.paymentProvider"));

console.log("NEXT F CMS UI content hygiene check");
for(const item of pass) console.log(`PASS  ${item}`);
for(const item of failures) console.error(`FAIL  ${item}`);
console.log(`\n${pass.length} passed, ${failures.length} failed`);
if(failures.length) process.exit(1);
