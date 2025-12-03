"use strict";(()=>{var e={};e.id=255,e.ids=[255],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},266:(e,t,n)=>{n.r(t),n.d(t,{originalPathname:()=>m,patchFetch:()=>f,requestAsyncStorage:()=>d,routeModule:()=>p,serverHooks:()=>h,staticGenerationAsyncStorage:()=>l});var r={};n.r(r),n.d(r,{POST:()=>c});var a=n(9303),i=n(8716),o=n(670),s=n(7070),u=n(7280);async function c(e){try{let{generated_text:t,brand_url:n}=await e.json();if(!t||!n)return s.NextResponse.json({error:"Generated text and brand URL required"},{status:400});let{text:r}=await (0,u._4)({model:"anthropic/claude-sonnet-4-20250514",prompt:`Analyze the following AI-generated text for potential hallucinations or inaccuracies about the brand at ${n}.

Generated text:
"${t}"

Identify any statements that:
- May be factually incorrect
- Contradict known information about the brand
- Make claims that cannot be verified

Return JSON:
{
  "findings": [
    {
      "statement": "The problematic statement",
      "contradiction": "What it contradicts or why it's suspicious",
      "citation": "Source if available",
      "confidence": 0.8
    }
  ]
}

If no issues found, return: { "findings": [] }`}),a=r.match(/\{[\s\S]*\}/);if(a)return s.NextResponse.json(JSON.parse(a[0]));return s.NextResponse.json({findings:[]})}catch(e){return s.NextResponse.json({error:e.message},{status:500})}}let p=new a.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/monitoring/hallucination-detect/route",pathname:"/api/monitoring/hallucination-detect",filename:"route",bundlePath:"app/api/monitoring/hallucination-detect/route"},resolvedPagePath:"/app/frontend/app/api/monitoring/hallucination-detect/route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:d,staticGenerationAsyncStorage:l,serverHooks:h}=p,m="/api/monitoring/hallucination-detect/route";function f(){return(0,o.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:l})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),r=t.X(0,[948,972,280],()=>n(266));module.exports=r})();