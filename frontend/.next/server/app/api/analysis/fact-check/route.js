"use strict";(()=>{var e={};e.id=250,e.ids=[250],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},9705:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>f,patchFetch:()=>y,requestAsyncStorage:()=>p,routeModule:()=>u,serverHooks:()=>m,staticGenerationAsyncStorage:()=>d});var a={};s.r(a),s.d(a,{POST:()=>l});var i=s(9303),r=s(8716),n=s(670),o=s(7070),c=s(7280);async function l(e){try{let{url:t,content:s,title:a}=await e.json();if(!s)return o.NextResponse.json({error:"Content is required"},{status:400});let{text:i}=await (0,c._4)({model:"anthropic/claude-sonnet-4-20250514",prompt:`Analyze the following webpage content for factual claims and assess their verifiability.

URL: ${t||"Unknown"}
Title: ${a||"Unknown"}

Content:
${s.substring(0,8e3)}

Identify factual claims made on this page and assess:
1. Statistics and numbers cited
2. Claims about company/product capabilities
3. Historical facts mentioned
4. Comparisons or superlatives ("best", "fastest", "only")
5. Testimonials or case study claims

Return a JSON object:
{
  "claims": [
    {
      "claim": "the specific claim made",
      "type": "statistic|capability|historical|comparison|testimonial",
      "verifiable": true,
      "confidence": 0.8,
      "issue": "potential issue if any, or null",
      "recommendation": "how to improve credibility"
    }
  ],
  "overallCredibility": 75,
  "citationsMissing": true,
  "sourcesNeeded": ["list of claims that need citations"],
  "superlativesUsed": ["best", "leading"],
  "recommendations": [
    "Add source citations for statistics",
    "Link to case studies for claims"
  ],
  "summary": "brief credibility assessment"
}

Return only valid JSON.`});try{let e=JSON.parse(i.replace(/```json\n?|\n?```/g,"").trim());return o.NextResponse.json({success:!0,...e})}catch{return o.NextResponse.json({success:!0,claims:[],overallCredibility:50,citationsMissing:!1,sourcesNeeded:[],superlativesUsed:[],recommendations:[],summary:"Unable to analyze factual claims"})}}catch(e){return o.NextResponse.json({error:`Fact check failed: ${e instanceof Error?e.message:"Unknown error"}`},{status:500})}}let u=new i.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/analysis/fact-check/route",pathname:"/api/analysis/fact-check",filename:"route",bundlePath:"app/api/analysis/fact-check/route"},resolvedPagePath:"/app/frontend/app/api/analysis/fact-check/route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:p,staticGenerationAsyncStorage:d,serverHooks:m}=u,f="/api/analysis/fact-check/route";function y(){return(0,n.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:d})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),a=t.X(0,[948,972,280],()=>s(9705));module.exports=a})();