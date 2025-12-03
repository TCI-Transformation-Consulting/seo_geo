"use strict";(()=>{var e={};e.id=568,e.ids=[568],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},5380:(e,s,t)=>{t.r(s),t.d(s,{originalPathname:()=>h,patchFetch:()=>g,requestAsyncStorage:()=>m,routeModule:()=>u,serverHooks:()=>l,staticGenerationAsyncStorage:()=>d});var r={};t.r(r),t.d(r,{POST:()=>p});var a=t(9303),i=t(8716),o=t(670),n=t(7070),c=t(7280);async function p(e){try{let{url:s,html:t,existingSchemas:r}=await e.json();if(!t)return n.NextResponse.json({error:"HTML content is required"},{status:400});let a=t.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)||[],i=[];for(let e of a){let s=e.replace(/<script[^>]*>|<\/script>/gi,"");try{let e=JSON.parse(s);i.push(e)}catch{}}let{text:o}=await (0,c._4)({model:"anthropic/claude-sonnet-4-20250514",prompt:`Audit the following structured data (JSON-LD schemas) found on a webpage.

URL: ${s||"Unknown"}

Schemas found:
${JSON.stringify(i,null,2)}

Analyze:
1. Completeness of each schema (required vs optional properties)
2. Correctness of property values
3. Schema.org compliance
4. Missing recommended schemas for this type of page
5. Opportunities to enhance existing schemas

Return a JSON object:
{
  "schemasFound": [
    {
      "type": "Organization|Product|FAQPage|Article|etc",
      "completeness": 75,
      "missingRequired": ["property1"],
      "missingRecommended": ["property2", "property3"],
      "issues": ["specific issues found"],
      "valid": true
    }
  ],
  "missingSchemas": [
    {
      "type": "BreadcrumbList",
      "reason": "Page has navigation breadcrumbs but no schema",
      "impact": "medium"
    }
  ],
  "overallScore": 65,
  "recommendations": [
    "Add missing 'logo' property to Organization schema",
    "Consider adding FAQPage schema for the FAQ section"
  ],
  "googleRichResultsEligible": ["FAQ", "Organization"],
  "summary": "brief audit summary"
}

Return only valid JSON.`});try{let e=JSON.parse(o.replace(/```json\n?|\n?```/g,"").trim());return n.NextResponse.json({success:!0,rawSchemas:i,...e})}catch{return n.NextResponse.json({success:!0,rawSchemas:i,schemasFound:[],missingSchemas:[],overallScore:i.length>0?50:0,recommendations:[],googleRichResultsEligible:[],summary:"Unable to perform detailed schema audit"})}}catch(e){return n.NextResponse.json({error:`Schema audit failed: ${e instanceof Error?e.message:"Unknown error"}`},{status:500})}}let u=new a.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/analysis/schema-audit/route",pathname:"/api/analysis/schema-audit",filename:"route",bundlePath:"app/api/analysis/schema-audit/route"},resolvedPagePath:"/app/frontend/app/api/analysis/schema-audit/route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:m,staticGenerationAsyncStorage:d,serverHooks:l}=u,h="/api/analysis/schema-audit/route";function g(){return(0,o.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:d})}}};var s=require("../../../../webpack-runtime.js");s.C(e);var t=e=>s(s.s=e),r=s.X(0,[948,972,280],()=>t(5380));module.exports=r})();