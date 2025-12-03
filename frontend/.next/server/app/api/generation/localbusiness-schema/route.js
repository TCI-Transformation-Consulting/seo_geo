"use strict";(()=>{var e={};e.id=321,e.ids=[321],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},6343:(e,s,t)=>{t.r(s),t.d(s,{originalPathname:()=>m,patchFetch:()=>g,requestAsyncStorage:()=>l,routeModule:()=>u,serverHooks:()=>h,staticGenerationAsyncStorage:()=>d});var n={};t.r(n),t.d(n,{POST:()=>c});var a=t(9303),r=t(8716),o=t(670),i=t(7070),p=t(7280);async function c(e){try{let s;let{url:t,content:n,napData:a}=await e.json(),r=t?t.startsWith("http://")||t.startsWith("https://")?t:`https://${t}`:"https://example.com",o=a?`
NAP Data found:
- Business Name: ${a.name||"Unknown"}
- Address: ${a.address||"Unknown"}
- Phone: ${a.phone||"Unknown"}
- Hours: ${a.hours||"Unknown"}
`:"",{text:c}=await (0,p._4)({model:"anthropic/claude-sonnet-4-20250514",prompt:`Generate a comprehensive LocalBusiness JSON-LD schema for this website.

URL: ${r}
${o}
Content:
${(n||"").substring(0,4e3)}

Create a complete LocalBusiness schema with:
- @type (use specific subtype if applicable: Restaurant, Store, MedicalBusiness, etc.)
- name
- description
- url
- telephone
- email (if found)
- address (PostalAddress)
- geo (GeoCoordinates if possible)
- openingHoursSpecification
- priceRange (if applicable)
- image
- sameAs (social profiles)
- aggregateRating (if reviews found)

Return ONLY the JSON-LD object, no markdown or explanation.`});try{s=JSON.parse(c.replace(/```json\n?|\n?```/g,"").trim())}catch{s={"@context":"https://schema.org","@type":"LocalBusiness",name:a?.name||"Business Name",url:r,telephone:a?.phone||"",address:{"@type":"PostalAddress",streetAddress:a?.address||""}}}return s["@context"]||(s["@context"]="https://schema.org"),i.NextResponse.json({success:!0,localbusiness:JSON.stringify(s,null,2),filename:"localbusiness-schema.json"})}catch(e){return i.NextResponse.json({error:`LocalBusiness schema generation failed: ${e instanceof Error?e.message:"Unknown error"}`},{status:500})}}let u=new a.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/generation/localbusiness-schema/route",pathname:"/api/generation/localbusiness-schema",filename:"route",bundlePath:"app/api/generation/localbusiness-schema/route"},resolvedPagePath:"/app/frontend/app/api/generation/localbusiness-schema/route.ts",nextConfigOutput:"",userland:n}),{requestAsyncStorage:l,staticGenerationAsyncStorage:d,serverHooks:h}=u,m="/api/generation/localbusiness-schema/route";function g(){return(0,o.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:d})}}};var s=require("../../../../webpack-runtime.js");s.C(e);var t=e=>s(s.s=e),n=s.X(0,[948,972,280],()=>t(6343));module.exports=n})();