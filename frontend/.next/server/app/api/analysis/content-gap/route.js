"use strict";(()=>{var e={};e.id=411,e.ids=[411],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},2849:(e,t,n)=>{n.r(t),n.d(t,{originalPathname:()=>g,patchFetch:()=>h,requestAsyncStorage:()=>d,routeModule:()=>c,serverHooks:()=>l,staticGenerationAsyncStorage:()=>m});var s={};n.r(s),n.d(s,{POST:()=>u});var i=n(9303),o=n(8716),r=n(670),a=n(7070),p=n(7280);async function u(e){try{let{url:t,content:n,title:s,industry:i,competitors:o}=await e.json();if(!n)return a.NextResponse.json({error:"Content is required"},{status:400});let r=o?.length?`
Known competitors: ${o.join(", ")}`:"",{text:u}=await (0,p._4)({model:"anthropic/claude-sonnet-4-20250514",prompt:`Analyze the following webpage content and identify content gaps and missing opportunities for AI discoverability.

URL: ${t||"Unknown"}
Title: ${s||"Unknown"}
Industry: ${i||"Unknown"}${r}

Content:
${n.substring(0,8e3)}

Identify:
1. Missing content that would improve AI understanding
2. Topics competitors likely cover that this page doesn't
3. Questions users might ask that aren't answered
4. Missing structured data opportunities
5. Content depth issues

Return a JSON object:
{
  "gaps": [
    {
      "type": "missing_content|missing_schema|missing_faq|thin_content|missing_topic",
      "title": "short title",
      "description": "what's missing",
      "impact": "high|medium|low",
      "recommendation": "specific action to take",
      "estimatedEffort": "low|medium|high"
    }
  ],
  "missingQuestions": ["questions users might ask that aren't answered"],
  "missingTopics": ["topics that should be covered"],
  "schemaOpportunities": ["Product", "FAQ", "HowTo", "Review"],
  "contentScore": 65,
  "summary": "brief summary of content gaps"
}

Return only valid JSON.`});try{let e=JSON.parse(u.replace(/```json\n?|\n?```/g,"").trim());return a.NextResponse.json({success:!0,...e})}catch{return a.NextResponse.json({success:!0,gaps:[],missingQuestions:[],missingTopics:[],schemaOpportunities:[],contentScore:50,summary:"Unable to analyze content gaps"})}}catch(e){return a.NextResponse.json({error:`Content gap analysis failed: ${e instanceof Error?e.message:"Unknown error"}`},{status:500})}}let c=new i.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/analysis/content-gap/route",pathname:"/api/analysis/content-gap",filename:"route",bundlePath:"app/api/analysis/content-gap/route"},resolvedPagePath:"/app/frontend/app/api/analysis/content-gap/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:d,staticGenerationAsyncStorage:m,serverHooks:l}=c,g="/api/analysis/content-gap/route";function h(){return(0,r.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:m})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),s=t.X(0,[948,972,280],()=>n(2849));module.exports=s})();