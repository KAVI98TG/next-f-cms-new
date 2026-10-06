import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const exists=(p)=>fs.existsSync(path.join(root,p));
const failures=[];const pass=[];
const check=(name,ok,detail="")=>{if(ok)pass.push(name);else failures.push(`${name}${detail?": "+detail:""}`);};

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
  ["src/platform/health/HealthPage.tsx","health-hero"],
  ["src/next-f/website-platform/WebsitePlatformPage.tsx","website-platform-header-stat"],
];
for(const [file,contract] of summaryCardContracts){
  const text=read(file);let ok=true;
  if(contract==="health-hero"){const block=text.match(/<div className="health-hero">([\s\S]*?)<\/div><Card>/);ok=Boolean(block)&&!block[1].includes("<p>");}
  else if(contract==="website-platform-header-stat")ok=!/website-platform-header-stat[^\n]*<em>/.test(text);
  check(`${contract} summary cards have no footer/helper line`,ok);
}

const sourceRoot=path.join(root,"src");
const walk=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full];});
for(const file of walk(sourceRoot)){
  const rel=path.relative(root,file).replaceAll("\\","/");
  if(file.endsWith(".css")){
    const text=fs.readFileSync(file,"utf8");
    for(const match of text.matchAll(/font-size\s*:\s*([^;}{]+)/g)){
      const expr=match[1].trim();
      for(const px of expr.matchAll(/([0-9]*\.?[0-9]+)px/g)){
        const value=Number(px[1]);
        if(value<12)failures.push(`${rel}: internal CMS font-size ${expr} is below 12px`);
        if(value===13)failures.push(`${rel}: 13px is outside the CMS type scale; use 12px microcopy or 14px readable copy`);
      }
    }
  }
  if(file.endsWith(".tsx")||file.endsWith(".ts")){
    const text=fs.readFileSync(file,"utf8");
    if(/[—–]/.test(text))failures.push(`${rel}: long dash glyphs are not allowed in CMS UI content`);
  }
  if(file.endsWith(".tsx")){
    const text=fs.readFileSync(file,"utf8");
    for(const match of text.matchAll(/<MetricCard\b[\s\S]*?\/>/g)){
      if(/\bdetail\s*=/.test(match[0]))failures.push(`${rel}: MetricCard detail/footer copy is not allowed`);
      if(/\btrend\s*=/.test(match[0]))failures.push(`${rel}: MetricCard trend/footer copy is not allowed`);
    }
    for(const match of text.matchAll(/<SectionHeader\b[^>]*?description="([^"]+)"/gs)){
      const description=match[1];
      if(description.length>110)failures.push(`${rel}: SectionHeader description exceeds 110 characters`);
      if(/\b(?:architecture|foundation|prototype|sandbox|future|later|deferred)\b/i.test(description))failures.push(`${rel}: SectionHeader contains developer/roadmap copy: ${description}`);
    }
  }
}

const formField=read("src/shared/components/FormField.tsx");
const componentCss=read("src/css/components.css");
check("FormField supports aligned field actions",formField.includes("action?: ReactNode")&&formField.includes("form-field__head"));
check("form fields do not stretch to match taller grid siblings",componentCss.includes("align-content:start")&&componentCss.includes("align-self:start"));
check("two-column forms support deliberate full-width rows",componentCss.includes(".form-grid--two > .form-field--full"));

const standard="docs/governance/CMS-UI-CONTENT-AND-TYPOGRAPHY-STANDARD.md";
check("UI content and typography standard ships with the release",exists(standard));
if(exists(standard)){
  const doc=read(standard);
  check("standard defines keep/remove rules",doc.includes("Keep in the UI")&&doc.includes("Remove from the UI"));
  check("standard covers future feature implementation",doc.includes("New section checklist")&&doc.includes("14 px"));
  check("standard forbids metric-card footer copy",doc.includes("Metric cards contain only")&&doc.includes("Do not add `detail`, footer, helper or trend copy"));
}

console.log("NEXT F CMS UI content hygiene check");
for(const item of pass)console.log(`PASS  ${item}`);
for(const item of failures)console.error(`FAIL  ${item}`);
console.log(`\n${pass.length} passed, ${failures.length} failed`);
if(failures.length)process.exit(1);
