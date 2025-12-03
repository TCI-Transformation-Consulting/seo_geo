"use strict";(()=>{var e={};e.id=185,e.ids=[185],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},6294:(e,r,t)=>{t.r(r),t.d(r,{originalPathname:()=>y,patchFetch:()=>h,requestAsyncStorage:()=>d,routeModule:()=>c,serverHooks:()=>m,staticGenerationAsyncStorage:()=>l});var s={};t.r(s),t.d(s,{POST:()=>p});var a=t(9303),o=t(8716),n=t(670),i=t(7070),u=t(7280);async function p(e){try{let{domain:r,topic:t}=await e.json();if(!r)return i.NextResponse.json({error:"Domain required"},{status:400});let{text:s}=await (0,u._4)({model:"anthropic/claude-sonnet-4-20250514",prompt:`Analyze the competitive landscape for ${r}${t?` in the ${t} space`:""}.

Provide:
1. A summary of the competitive position
2. Key search queries used for analysis
3. Sources/references

Return JSON:
{
  "summary": "Analysis summary...",
  "search_queries": ["query1", "query2"],
  "sources": [{ "title": "Source title", "url": "https://..." }]
}`}),a=s.match(/\{[\s\S]*\}/);if(a)return i.NextResponse.json(JSON.parse(a[0]));return i.NextResponse.json({summary:"Unable to complete analysis",search_queries:[],sources:[]})}catch(e){return i.NextResponse.json({error:e.message},{status:500})}}let c=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/analysis/grounded-competitor-analysis/route",pathname:"/api/analysis/grounded-competitor-analysis",filename:"route",bundlePath:"app/api/analysis/grounded-competitor-analysis/route"},resolvedPagePath:"/app/frontend/app/api/analysis/grounded-competitor-analysis/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:d,staticGenerationAsyncStorage:l,serverHooks:m}=c,y="/api/analysis/grounded-competitor-analysis/route";function h(){return(0,n.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:l})}}};var r=require("../../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[948,972,280],()=>t(6294));module.exports=s})();