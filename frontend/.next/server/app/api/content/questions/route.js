"use strict";(()=>{var e={};e.id=551,e.ids=[551],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},2306:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>m,patchFetch:()=>h,requestAsyncStorage:()=>d,routeModule:()=>c,serverHooks:()=>q,staticGenerationAsyncStorage:()=>l});var o={};s.r(o),s.d(o,{POST:()=>p});var r=s(9303),n=s(8716),u=s(670),a=s(7070),i=s(7280);async function p(e){try{let{url:t,urls:s,max_items:o=50}=await e.json(),r=s?.length?s:t?[t]:[];if(!r.length)return a.NextResponse.json({error:"URL required"},{status:400});let{text:n}=await (0,i._4)({model:"anthropic/claude-sonnet-4-20250514",prompt:`Analyze these URLs and generate ${o} questions that users might ask about the content.
      
URLs: ${r.join(", ")}

Generate questions in JSON format:
{
  "items": [
    { "question": "...", "cluster": "category" }
  ]
}

Focus on:
- Common user queries
- FAQ-style questions
- Questions about products/services
- How-to questions
- Comparison questions`}),u=n.match(/\{[\s\S]*\}/);if(u)return a.NextResponse.json(JSON.parse(u[0]));return a.NextResponse.json({items:[{question:"What services do you offer?",cluster:"general"},{question:"How can I contact you?",cluster:"contact"}]})}catch(e){return a.NextResponse.json({error:e.message},{status:500})}}let c=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/content/questions/route",pathname:"/api/content/questions",filename:"route",bundlePath:"app/api/content/questions/route"},resolvedPagePath:"/app/frontend/app/api/content/questions/route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:d,staticGenerationAsyncStorage:l,serverHooks:q}=c,m="/api/content/questions/route";function h(){return(0,u.patchFetch)({serverHooks:q,staticGenerationAsyncStorage:l})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),o=t.X(0,[948,972,280],()=>s(2306));module.exports=o})();