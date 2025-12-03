"use strict";(()=>{var e={};e.id=518,e.ids=[518],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},83:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>g,patchFetch:()=>h,requestAsyncStorage:()=>l,routeModule:()=>u,serverHooks:()=>d,staticGenerationAsyncStorage:()=>m});var n={};r.r(n),r.d(n,{POST:()=>p});var o=r(9303),s=r(8716),a=r(670),i=r(7070);let c=process.env.GEMINI_API_KEY||"AIzaSyAFtMIEg-mEyZPr_NvWXv5VJVVNrV_Q3ys";async function p(e){try{let t;let{domain:r,topic:n,maxResults:o=5}=await e.json();if(!r)return i.NextResponse.json({error:"Domain is required"},{status:400});console.log("[v0] Searching competitors for:",r,"topic:",n);let s=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${c}`,a=`Du bist ein Markt- und Wettbewerbsanalyst. Suche nach den wichtigsten Wettbewerbern f\xfcr diese Website.

Domain: ${r}
Branche/Thema: ${n||"Allgemein"}

Finde die ${o} wichtigsten direkten Wettbewerber, die \xe4hnliche Produkte oder Dienstleistungen anbieten.

Antworte NUR mit folgendem JSON-Format:
{
  "competitors": [
    {
      "name": "Firmenname",
      "url": "https://...",
      "description": "Kurze Beschreibung was sie anbieten",
      "relevance": "Warum sie ein Wettbewerber sind",
      "strengths": ["St\xe4rke 1", "St\xe4rke 2"],
      "aiReadinessEstimate": <0-100>
    }
  ],
  "marketInsights": "Kurze Marktanalyse",
  "recommendedActions": ["Empfehlung 1", "Empfehlung 2"]
}`,p=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:a}]}],generationConfig:{temperature:.3,maxOutputTokens:2048,responseMimeType:"application/json"},tools:[{googleSearch:{}}]})});if(!p.ok){let e=await p.text();throw console.log("[v0] Gemini competitor search error:",e),Error(`Gemini error: ${p.status}`)}let u=await p.json(),l=u.candidates?.[0]?.content?.parts?.[0]?.text||"{}",m=u.candidates?.[0]?.groundingMetadata,d=[];if(m?.groundingChunks)for(let e of m.groundingChunks)e.web&&d.push({title:e.web.title||"",url:e.web.uri||""});let g=m?.webSearchQueries||[];try{t=JSON.parse(l)}catch{t={competitors:[],marketInsights:"",recommendedActions:[]}}return console.log("[v0] Found",t.competitors?.length||0,"competitors"),i.NextResponse.json({...t,citations:d,searchQueries:g})}catch(e){return console.log("[v0] Competitor search error:",e.message),i.NextResponse.json({error:e.message},{status:500})}}let u=new o.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/analysis/competitor-search/route",pathname:"/api/analysis/competitor-search",filename:"route",bundlePath:"app/api/analysis/competitor-search/route"},resolvedPagePath:"/app/frontend/app/api/analysis/competitor-search/route.ts",nextConfigOutput:"",userland:n}),{requestAsyncStorage:l,staticGenerationAsyncStorage:m,serverHooks:d}=u,g="/api/analysis/competitor-search/route";function h(){return(0,a.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:m})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[948,972],()=>r(83));module.exports=n})();