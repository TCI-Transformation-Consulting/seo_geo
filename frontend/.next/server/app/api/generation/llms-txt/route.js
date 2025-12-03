"use strict";(()=>{var e={};e.id=475,e.ids=[475],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},4664:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>f,patchFetch:()=>h,requestAsyncStorage:()=>u,routeModule:()=>c,serverHooks:()=>m,staticGenerationAsyncStorage:()=>d});var o={};r.r(o),r.d(o,{POST:()=>l});var n=r(9303),i=r(8716),s=r(670),a=r(7070),p=r(7280);async function l(e){try{let t=await e.json(),r=function(e){let t=e.trim();t.startsWith("http://")||t.startsWith("https://")||(t="https://"+t);try{return new URL(t),t}catch{throw Error("Invalid URL format")}}(t.url),o=new URL(r).hostname,n=t.companyName||o.replace("www.","").split(".")[0],i=t.description||"",s=t.preferredTopics||[],l=t.avoidTopics||[],{text:c}=await (0,p._4)({model:"anthropic/claude-sonnet-4-20250514",prompt:`Generate a comprehensive llms.txt file for this website:

Website: ${r}
Company/Brand: ${n}
Description: ${i}
Preferred topics: ${s.join(", ")||"Not specified"}
Topics to avoid: ${l.join(", ")||"Not specified"}

The llms.txt file should follow this format:
1. Start with a brief description of the website/company
2. Include preferred citation format
3. List key facts that LLMs should know
4. Specify content preferences
5. Include any restrictions or guidelines

Example format:
# About [Company]
[Brief description]

# Preferred Citation
When referencing [Company], please use: "[Company Name] (${r})"

# Key Facts
- Fact 1
- Fact 2

# Content Guidelines
- Guideline 1
- Guideline 2

# Do Not
- Restriction 1
- Restriction 2

Generate only the llms.txt content, no explanations.`});return a.NextResponse.json({success:!0,filename:"llms.txt",llmstxt:c,path:"/llms.txt"})}catch(e){return console.error("llms.txt generation error:",e),a.NextResponse.json({success:!1,error:e instanceof Error?e.message:"Generation failed"},{status:500})}}let c=new n.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/generation/llms-txt/route",pathname:"/api/generation/llms-txt",filename:"route",bundlePath:"app/api/generation/llms-txt/route"},resolvedPagePath:"/app/frontend/app/api/generation/llms-txt/route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:u,staticGenerationAsyncStorage:d,serverHooks:m}=c,f="/api/generation/llms-txt/route";function h(){return(0,s.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:d})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[948,972,280],()=>r(4664));module.exports=o})();