"use strict";(()=>{var e={};e.id=512,e.ids=[512],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},1347:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>l,patchFetch:()=>h,requestAsyncStorage:()=>d,routeModule:()=>c,serverHooks:()=>m,staticGenerationAsyncStorage:()=>g});var s={};r.r(s),r.d(s,{POST:()=>u});var a=r(9303),o=r(8716),n=r(670),i=r(7070),p=r(7280);async function u(e){try{let{my_url:t,competitors:r,top_n:s=10}=await e.json();if(!t)return i.NextResponse.json({error:"URL required"},{status:400});let{text:a}=await (0,p._4)({model:"anthropic/claude-sonnet-4-20250514",prompt:`Analyze semantic coverage gaps between a website and its competitors.

My URL: ${t}
Competitors: ${r?.join(", ")||"general industry competitors"}

Identify the top ${s} content gaps - topics that competitors cover but the main site doesn't.

Return JSON:
{
  "gaps": [
    {
      "topic": "Topic name",
      "suggested_h2": "Suggested heading",
      "suggested_paragraph": "Brief content suggestion",
      "references": [{ "competitor": "competitor.com", "page": "/page" }]
    }
  ]
}`}),o=a.match(/\{[\s\S]*\}/);if(o)return i.NextResponse.json(JSON.parse(o[0]));return i.NextResponse.json({gaps:[]})}catch(e){return i.NextResponse.json({error:e.message},{status:500})}}let c=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/analysis/semantic-coverage/route",pathname:"/api/analysis/semantic-coverage",filename:"route",bundlePath:"app/api/analysis/semantic-coverage/route"},resolvedPagePath:"/app/frontend/app/api/analysis/semantic-coverage/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:d,staticGenerationAsyncStorage:g,serverHooks:m}=c,l="/api/analysis/semantic-coverage/route";function h(){return(0,n.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:g})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[948,972,280],()=>r(1347));module.exports=s})();