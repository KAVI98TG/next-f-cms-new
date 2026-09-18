import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const dashboard=read('src/gaming-store/dashboard/GamingDashboard.tsx');
const css=read('src/css/components.css');
const checks=[];
const check=(label,ok)=>checks.push([label,Boolean(ok)]);

check('production dashboard uses canonical operations snapshot', dashboard.includes('loadGamingOperationsSnapshot()'));
check('production dashboard uses canonical analytics snapshot', dashboard.includes('loadGamingAnalyticsSnapshot(30)'));
check('dashboard exposes compact KPI command strip', dashboard.includes('commerce-dashboard-kpis')&&dashboard.includes('Needs attention')&&dashboard.includes('Conversion'));
check('dashboard operational exceptions link to Live Operations', dashboard.includes("window.location.assign('/gaming-store/live-operations')"));
check('dashboard readiness covers supplier payment fulfillment risk notifications', ['Supplier','Payment review','Fulfillment','Risk holds','Notifications'].every((value)=>dashboard.includes(`label:'${value}'`)));
check('dashboard includes compact funnel from canonical analytics', dashboard.includes('commerce-dashboard-funnel')&&dashboard.includes("'product_view','checkout_started','order_created','payment_verified','fulfilled'"));
check('dashboard groups noisy analytics and supplier activity', dashboard.includes("'analytics-product-view'")&&dashboard.includes("'supplier-event'"));
check('dashboard includes quick action destinations', ['/gaming-store/live-operations','/gaming-store/analytics','/gaming-store/support','/gaming-store/promotions','/gaming-store/suppliers'].every((value)=>dashboard.includes(value)));
check('dashboard responsive command center styling exists', css.includes('.commerce-dashboard-page')&&css.includes('.commerce-dashboard-kpis')&&css.includes('.commerce-dashboard-primary')&&css.includes('.commerce-dashboard-secondary'));
check('dashboard provides all-clear state rather than empty oversized card', dashboard.includes('commerce-dashboard-all-clear')&&dashboard.includes('All clear'));
check('dashboard old production metric-grid layout is retired', !/LiveGamingDashboard[\s\S]*?<div className="metric-grid">/.test(dashboard.split('function LocalGamingDashboard')[0]));
check('dashboard production activity no longer renders raw ten-event list', !dashboard.split('function LocalGamingDashboard')[0].includes('ops.events.slice(0,10)'));

let failed=0;
for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${label}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} Gaming dashboard command-center checks passed.`);
if(failed)process.exit(1);
