import fs from "node:fs";
import path from "node:path";
const root=process.cwd(), pass=[], fail=[]; const check=(name,ok)=>ok?pass.push(name):fail.push(name); const exists=(f)=>fs.existsSync(path.join(root,f)); const read=(f)=>fs.readFileSync(path.join(root,f),"utf8");
const required=[
  "src/platform/help-center/HelpCenterPage.tsx",
  "src/platform/help-center/data/types.ts",
  "src/platform/help-center/data/helpCenterStore.ts",
  "src/platform/help-center/shared/useHelpCenter.ts",
  "src/platform/help-center/components/OverviewPanel.tsx",
  "src/platform/help-center/components/KnowledgePanel.tsx",
  "src/platform/help-center/components/AnnouncementsPanel.tsx",
  "src/platform/help-center/components/RequestsPanel.tsx",
  "src/platform/help-center/components/RepliesPanel.tsx",
  "src/platform/help-center/components/FeedbackPanel.tsx",
  "src/platform/help-center/components/SettingsPanel.tsx",
];
for(const file of required) check(`file ${file}`,exists(file));
const app=read("src/app/App.tsx"), nav=read("src/app/navigation.ts"), perms=read("src/app/auth/permissions.ts"), types=read("src/app/auth/types.ts"), session=read("src/app/auth/SessionProvider.tsx"), platform=read("src/platform/services/platformStore.ts");
const store=read("src/platform/help-center/data/helpCenterStore.ts"), page=read("src/platform/help-center/HelpCenterPage.tsx"), knowledge=read("src/platform/help-center/components/KnowledgePanel.tsx"), requests=read("src/platform/help-center/components/RequestsPanel.tsx"), settings=read("src/platform/help-center/components/SettingsPanel.tsx"), search=read("src/services/shared/searchIndex.ts"), ops=read("src/services/shared/operationsCenter.ts"), acceptance=read("src/services/acceptance/finalAcceptance.ts"), dashboard=read("src/platform/dashboard/PlatformDashboard.tsx"), health=read("src/platform/health/HealthPage.tsx"), architecture=read("docs/architecture/NEXT-F-CMS-FINAL-ARCHITECTURE.md");
check("help center route",app.includes('"/platform/help-center"')&&nav.includes('path: "/platform/help-center"'));
check("help center permission type",types.includes('"platform.help.manage"'));
check("help center route permission",perms.includes('["/platform/help-center", "platform.help.manage"]'));
check("help center permission catalog",platform.includes('"platform.help.manage"'));
check("support role can manage help center",platform.includes('role_support')&&platform.includes('"platform.help.manage"'));
check("fallback super admin can manage help center",session.includes('"platform.help.manage"'));
for(const name of ["getCategories","getArticles","getFaqs","getAnnouncements","getReplies","getRequests","getFeedback","getSettings","addCategory","addArticle","addFaq","addAnnouncement","addReply","createRequest","routeRequest","addFeedback","saveSettings","search"]) check(`store ${name}`,store.includes(`${name}`));
check("store uses shared durable storage boundary",store.includes("readDurableValue")&&store.includes("writeDurableValue")&&store.includes("nextf:help-center"));
check("store platform audit integration",store.includes("platformStore.addAudit"));
check("store platform notification integration",store.includes("platformStore.saveNotifications"));
for(const view of ["overview","knowledge","announcements","requests","replies","feedback","settings"]) check(`view ${view}`,page.includes(`"${view}"`));
check("knowledge handles articles",knowledge.includes("addArticle")&&knowledge.includes("updateArticle"));
check("knowledge handles categories",knowledge.includes("addCategory")&&knowledge.includes("updateCategory"));
check("knowledge handles FAQs",knowledge.includes("addFaq")&&knowledge.includes("updateFaq"));
check("requests validates customer identity",requests.includes("validators.email")&&requests.includes("validators.required"));
check("requests supports business routing",requests.includes("routeRequest")&&requests.includes('value="digital"')&&requests.includes('value="gaming"')&&requests.includes('value="software"'));
check("requests support full lifecycle",requests.includes('value="new"')&&requests.includes('value="routed"')&&requests.includes('value="in_progress"')&&requests.includes('value="waiting_customer"')&&requests.includes('value="resolved"')&&requests.includes('value="closed"'));
check("settings controls search",settings.includes("enableSearch"));
check("settings controls feedback",settings.includes("enableFeedback"));
check("settings controls contact requests",settings.includes("enableContactRequests"));
check("settings controls anonymous requests",settings.includes("allowAnonymousRequests"));
check("settings controls auto routing",settings.includes("autoRouteRequests"));
check("global search indexes help articles",search.includes("Help Article")&&search.includes("helpCenterStore.getArticles"));
check("global search indexes help FAQs",search.includes("Help FAQ")&&search.includes("helpCenterStore.getFaqs"));
check("global search indexes help requests",search.includes("Help Request")&&search.includes("helpCenterStore.getRequests"));
check("operations inbox surfaces priority requests",ops.includes("ops:help:")&&ops.includes("helpCenterStore.getRequests"));
check("acceptance validates help categories",acceptance.includes("Help Center category slugs"));
check("acceptance validates help articles",acceptance.includes("Help article category references"));
check("acceptance validates help FAQs",acceptance.includes("Help FAQ category references"));
check("acceptance validates help requests",acceptance.includes("Customer help requests"));
check("acceptance validates saved replies",acceptance.includes("Saved reply shortcuts"));
check("acceptance validates help settings",acceptance.includes("Help Center settings"));
check("acceptance validates announcements",acceptance.includes("Help Center announcements"));
check("platform dashboard exposes help queue",dashboard.includes("Help requests")&&dashboard.includes("Customer Help Center"));
check("platform health checks help center",health.includes("Customer Help Center")&&health.includes("helpCenterStore"));
check("architecture document includes help center",architecture.includes("Customer Help Center")&&architecture.includes("help-center/")&&architecture.includes("Saved Replies"));
const pkg=JSON.parse(read("package.json")); check("package version includes Help Center release",Number(pkg.version.split(".")[0]||0)>0||Number(pkg.version.split(".")[1]||0)>=11); check("help center npm QA script",pkg.scripts?.["check:help-center"]==="node scripts/help-center-check.mjs");
console.log("NEXT F CMS V0.11.0 Platform Help Center check"); for(const item of pass) console.log(`PASS  ${item}`); for(const item of fail) console.error(`FAIL  ${item}`); console.log(`\n${pass.length} passed, ${fail.length} failed`); if(fail.length)process.exit(1);
