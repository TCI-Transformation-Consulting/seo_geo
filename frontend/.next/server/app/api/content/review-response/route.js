"use strict";(()=>{var e={};e.id=673,e.ids=[673],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},7403:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>m,patchFetch:()=>v,requestAsyncStorage:()=>d,routeModule:()=>c,serverHooks:()=>l,staticGenerationAsyncStorage:()=>h});var s={};r.r(s),r.d(s,{POST:()=>u});var o=r(9303),n=r(8716),i=r(670),p=r(7070),a=r(7280);async function u(e){try{let{review_text:t}=await e.json();if(!t)return p.NextResponse.json({error:"Review text required"},{status:400});let{text:r}=await (0,a._4)({model:"anthropic/claude-sonnet-4-20250514",prompt:`Generate a professional, empathetic response to this customer review:

"${t}"

The response should:
- Thank the customer for their feedback
- Address their specific points
- Be professional and helpful
- If negative, offer to resolve the issue
- Keep it concise (2-3 paragraphs max)

Respond with just the reply text, no JSON.`});return p.NextResponse.json({reply:r.trim()})}catch(e){return p.NextResponse.json({error:e.message},{status:500})}}let c=new o.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/content/review-response/route",pathname:"/api/content/review-response",filename:"route",bundlePath:"app/api/content/review-response/route"},resolvedPagePath:"/app/frontend/app/api/content/review-response/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:d,staticGenerationAsyncStorage:h,serverHooks:l}=c,m="/api/content/review-response/route";function v(){return(0,i.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:h})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[948,972,280],()=>r(7403));module.exports=s})();