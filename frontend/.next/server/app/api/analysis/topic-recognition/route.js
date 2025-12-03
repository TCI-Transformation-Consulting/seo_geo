"use strict";(()=>{var e={};e.id=502,e.ids=[502],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},9913:(e,t,n)=>{n.r(t),n.d(t,{originalPathname:()=>g,patchFetch:()=>m,requestAsyncStorage:()=>d,routeModule:()=>u,serverHooks:()=>y,staticGenerationAsyncStorage:()=>l});var o={};n.r(o),n.d(o,{POST:()=>p});var r=n(9303),i=n(8716),a=n(670),s=n(7070),c=n(7280);async function p(e){try{let{url:t,content:n,title:o}=await e.json();if(!n)return s.NextResponse.json({error:"Content is required"},{status:400});let{text:r}=await (0,c._4)({model:"anthropic/claude-sonnet-4-20250514",prompt:`Analyze the following webpage content and identify the main topics and themes.

URL: ${t||"Unknown"}
Title: ${o||"Unknown"}

Content:
${n.substring(0,8e3)}

Return a JSON object with:
{
  "primaryTopic": "main topic of the page",
  "secondaryTopics": ["list", "of", "secondary", "topics"],
  "industry": "detected industry/niche",
  "contentType": "blog|product|service|landing|about|contact|faq|other",
  "keywords": ["important", "keywords", "found"],
  "entities": [
    {"name": "entity name", "type": "person|organization|product|location|concept"}
  ],
  "sentiment": "positive|neutral|negative",
  "targetAudience": "description of target audience",
  "confidence": 0.85
}

Return only valid JSON.`});try{let e=JSON.parse(r.replace(/```json\n?|\n?```/g,"").trim());return s.NextResponse.json({success:!0,...e})}catch{return s.NextResponse.json({success:!0,primaryTopic:"General",secondaryTopics:[],industry:"Unknown",contentType:"other",keywords:[],entities:[],sentiment:"neutral",targetAudience:"General audience",confidence:.5})}}catch(e){return s.NextResponse.json({error:`Topic recognition failed: ${e instanceof Error?e.message:"Unknown error"}`},{status:500})}}let u=new r.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/analysis/topic-recognition/route",pathname:"/api/analysis/topic-recognition",filename:"route",bundlePath:"app/api/analysis/topic-recognition/route"},resolvedPagePath:"/app/frontend/app/api/analysis/topic-recognition/route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:d,staticGenerationAsyncStorage:l,serverHooks:y}=u,g="/api/analysis/topic-recognition/route";function m(){return(0,a.patchFetch)({serverHooks:y,staticGenerationAsyncStorage:l})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),o=t.X(0,[948,972,280],()=>n(9913));module.exports=o})();