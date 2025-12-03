"use strict";(()=>{var e={};e.id=383,e.ids=[383],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},5624:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>h,patchFetch:()=>g,requestAsyncStorage:()=>l,routeModule:()=>d,serverHooks:()=>c,staticGenerationAsyncStorage:()=>m});var a={};r.r(a),r.d(a,{POST:()=>i});var s=r(9303),n=r(8716),o=r(670),u=r(7070),p=r(7280);async function i(e){try{let{goal:t,urls:r=[],constraints:a}=await e.json();if(!t)return u.NextResponse.json({error:"Goal required"},{status:400});let{text:s}=await (0,p._4)({model:"anthropic/claude-sonnet-4-20250514",prompt:`You are an AI agent that plans and executes tasks to achieve a goal.

Goal: ${t}
URLs to analyze: ${r.join(", ")||"None provided"}
Constraints: ${JSON.stringify(a||{})}

Plan the steps needed to achieve this goal and provide a summary.

Return JSON:
{
  "steps": [
    {
      "tool": "tool_name",
      "args": { "arg1": "value1" },
      "output_summary": "What this step accomplished"
    }
  ],
  "summary": "Overall summary of what was accomplished"
}`}),n=s.match(/\{[\s\S]*\}/);if(n)return u.NextResponse.json(JSON.parse(n[0]));return u.NextResponse.json({steps:[],summary:"Unable to complete the task"})}catch(e){return u.NextResponse.json({error:e.message},{status:500})}}let d=new s.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/agents/runner/route",pathname:"/api/agents/runner",filename:"route",bundlePath:"app/api/agents/runner/route"},resolvedPagePath:"/app/frontend/app/api/agents/runner/route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:l,staticGenerationAsyncStorage:m,serverHooks:c}=d,h="/api/agents/runner/route";function g(){return(0,o.patchFetch)({serverHooks:c,staticGenerationAsyncStorage:m})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[948,972,280],()=>r(5624));module.exports=a})();