"use strict";(()=>{var e={};e.id=130,e.ids=[130],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},9721:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>S,patchFetch:()=>A,requestAsyncStorage:()=>g,routeModule:()=>m,serverHooks:()=>y,staticGenerationAsyncStorage:()=>f});var n={};a.r(n),a.d(n,{POST:()=>p});var s=a(9303),o=a(8716),r=a(670),i=a(7070);let c=process.env.FIRECRAWL_API_KEY||"fc-7fc5a013a18548f68c5267c5ba448bab",l=process.env.GEMINI_API_KEY||"AIzaSyAFtMIEg-mEyZPr_NvWXv5VJVVNrV_Q3ys";async function h(e){try{let t=await fetch("https://api.firecrawl.dev/v1/scrape",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c}`},body:JSON.stringify({url:e,formats:["markdown","html"],onlyMainContent:!1})});if(!t.ok){let e=await t.text();throw console.log("[v0] Firecrawl error:",e),Error(`Firecrawl error: ${t.status}`)}let a=await t.json();return{markdown:a.data?.markdown||"",html:a.data?.html||"",metadata:a.data?.metadata||{}}}catch(a){console.log("[v0] Firecrawl failed, falling back to fetch:",a);let t=await fetch(e,{headers:{"User-Agent":"Mozilla/5.0 (compatible; AIReadinessBot/1.0)"}});return{markdown:"",html:await t.text(),metadata:{}}}}async function d(e,t,a,n){let s=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${l}`,o=`Du bist ein AI-Readiness-Analyst. Analysiere diese Website gr\xfcndlich f\xfcr AI-Optimierung.

URL: ${e}
Titel: ${n.title||"Unbekannt"}
Beschreibung: ${n.description||"Keine"}

CONTENT (Markdown):
${t.slice(0,2e4)||a.slice(0,2e4)}

Analysiere folgende Aspekte und gib eine detaillierte Bewertung:

1. STRUCTURED DATA (JSON-LD, Schema.org):
   - Pr\xfcfe ob JSON-LD vorhanden ist
   - Welche Schema-Typen fehlen (Organization, WebSite, Product, FAQ, Article)?

2. TECHNICAL SEO:
   - Meta-Tags (title, description, og:tags)
   - Heading-Struktur (H1, H2, H3)
   - robots.txt Optimierung f\xfcr AI-Crawler

3. CONTENT QUALITY:
   - Ist der Content klar strukturiert?
   - Gibt es FAQ-Inhalte die markiert werden k\xf6nnten?
   - Faktendichte und Lesbarkeit

4. AI ACCESSIBILITY:
   - RSS/Atom Feed vorhanden?
   - Sitemap vorhanden?
   - API-Dokumentation?

Antworte NUR mit folgendem JSON-Format (keine Erkl\xe4rungen):
{
  "score": <0-100>,
  "scores": {
    "structuredData": <0-100>,
    "technicalSeo": <0-100>,
    "contentQuality": <0-100>,
    "aiAccessibility": <0-100>
  },
  "criticalIssues": [
    {"title": "...", "category": "...", "description": "...", "impact": "..."}
  ],
  "warnings": [
    {"title": "...", "category": "...", "description": "...", "recommendation": "..."}
  ],
  "suggestions": [
    {"title": "...", "category": "...", "description": "...", "benefit": "..."}
  ],
  "opportunities": [
    {"title": "...", "impact": "high|medium|low", "description": "...", "expectedImprovement": "..."}
  ],
  "technicalStatus": {
    "hasSchema": <boolean>,
    "hasRobotsTxt": <boolean>,
    "hasSitemap": <boolean>,
    "hasRssFeed": <boolean>,
    "metaTagCount": <number>,
    "headings": {"h1": <number>, "h2": <number>, "h3": <number>}
  },
  "detectedContent": {
    "hasProducts": <boolean>,
    "hasFAQ": <boolean>,
    "hasArticles": <boolean>,
    "hasLocalBusiness": <boolean>
  }
}`;try{let e=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:o}]}],generationConfig:{temperature:.2,maxOutputTokens:4096,responseMimeType:"application/json"}})});if(!e.ok){let t=await e.text();throw console.log("[v0] Gemini error:",t),Error(`Gemini error: ${e.status}`)}let t=await e.json(),a=t.candidates?.[0]?.content?.parts?.[0]?.text||"{}";try{return JSON.parse(a)}catch{return console.log("[v0] Failed to parse Gemini response:",a.slice(0,500)),null}}catch(e){return console.log("[v0] Gemini analysis failed:",e),null}}async function u(e){let t=new URL(e).origin,a=await Promise.allSettled([fetch(`${t}/robots.txt`,{method:"HEAD"}).then(e=>e.ok),fetch(`${t}/sitemap.xml`,{method:"HEAD"}).then(e=>e.ok),fetch(`${t}/feed`,{method:"HEAD"}).then(e=>e.ok),fetch(`${t}/rss`,{method:"HEAD"}).then(e=>e.ok),fetch(`${t}/feed.xml`,{method:"HEAD"}).then(e=>e.ok)]);return{hasRobotsTxt:"fulfilled"===a[0].status&&a[0].value,hasSitemap:"fulfilled"===a[1].status&&a[1].value,hasRssFeed:"fulfilled"===a[2].status&&a[2].value||"fulfilled"===a[3].status&&a[3].value||"fulfilled"===a[4].status&&a[4].value}}async function p(e){try{let t;let{url:a}=await e.json(),n=function(e){if(!e)throw Error("URL is required");let t=e.trim();return t.startsWith("http://")||t.startsWith("https://")||(t=`https://${t}`),new URL(t),t}(a);console.log("[v0] Starting real analysis for:",n),console.log("[v0] Scraping with Firecrawl...");let{markdown:s,html:o,metadata:r}=await h(n);console.log("[v0] Scraped content length:",s.length||o.length),console.log("[v0] Checking technical files...");let c=await u(n),l=function(e){let t=[...e.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)],a=[];for(let e of t)try{let t=JSON.parse(e[1]);t["@type"]?a.push(t["@type"]):Array.isArray(t)&&t.forEach(e=>e["@type"]&&a.push(e["@type"]))}catch{}return{hasSchema:a.length>0,schemaTypes:a}}(o),p=function(e){let t=(e.match(/<meta[^>]*>/gi)||[]).length,a=(e.match(/<h1[^>]*>/gi)||[]).length,n=(e.match(/<h2[^>]*>/gi)||[]).length;return{metaTagCount:t,headings:{h1:a,h2:n,h3:(e.match(/<h3[^>]*>/gi)||[]).length}}}(o);console.log("[v0] Analyzing with Gemini...");let m=await d(n,s,o,r),g=r.title||new URL(n).hostname,f=m||{},y=f.score||(t=30,c.hasRobotsTxt&&(t+=10),c.hasSitemap&&(t+=10),c.hasRssFeed&&(t+=10),l.hasSchema&&(t+=20),p.metaTagCount>5&&(t+=10),p.headings.h1>=1&&(t+=10),Math.min(t,100)),S={id:`project-${Date.now()}`,url:n,name:g,status:"analyzed",score:y,scores:f.scores||{structuredData:l.hasSchema?60:20,technicalSeo:p.metaTagCount>5?70:40,contentQuality:s.length>1e3?65:45,aiAccessibility:(c.hasRobotsTxt?25:0)+(c.hasSitemap?25:0)+(c.hasRssFeed?25:0)},criticalIssues:f.criticalIssues||function(e,t){let a=[];return e.hasSchema||a.push({title:"Missing JSON-LD Schema",category:"Structured Data",description:"No structured data found. AI systems cannot understand your content properly.",impact:"AI systems will struggle to extract accurate information about your business."}),t.hasRobotsTxt||a.push({title:"robots.txt not optimized",category:"Technical SEO",description:"Your robots.txt doesn't include AI crawler directives.",impact:"AI crawlers may not index your content optimally."}),a}(l,c),warnings:f.warnings||function(e,t){let a=[];return e.hasSitemap||a.push({title:"No sitemap.xml found",category:"Technical SEO",description:"Sitemap helps AI crawlers discover all your content.",recommendation:"Generate and submit a sitemap.xml"}),e.hasRssFeed||a.push({title:"No RSS feed detected",category:"Feeds",description:"RSS feeds help AI systems track content updates.",recommendation:"Create an RSS feed for your content"}),0===t.headings.h1&&a.push({title:"Missing H1 heading",category:"Content Structure",description:"No H1 heading found on the page.",recommendation:"Add a clear H1 heading to define page content"}),a}(c,p),suggestions:f.suggestions||[],opportunities:f.opportunities||function(e){let t=[];return e.schemaTypes.includes("Organization")||t.push({title:"Add Organization Schema",impact:"high",description:"Improve brand recognition in AI answers by 40%",expectedImprovement:"Better representation in AI search results"}),t.push({title:"Generate AI Manifest",impact:"high",description:"Direct AI systems to your preferred content",expectedImprovement:"Control how AI systems interact with your site"}),t.push({title:"Create MCP Configuration",impact:"medium",description:"Enable AI assistants to interact with your services",expectedImprovement:"Allow AI tools to programmatically access your content"}),t}(l),technicalStatus:{hasSchema:l.hasSchema,schemaTypes:l.schemaTypes,hasRobotsTxt:c.hasRobotsTxt,hasSitemap:c.hasSitemap,hasRssFeed:c.hasRssFeed,metaTagCount:p.metaTagCount,headings:p.headings},detectedContent:f.detectedContent||{hasProducts:s.toLowerCase().includes("product")||s.toLowerCase().includes("price"),hasFAQ:s.toLowerCase().includes("faq")||s.toLowerCase().includes("frequently asked"),hasArticles:s.toLowerCase().includes("article")||s.toLowerCase().includes("blog"),hasLocalBusiness:s.toLowerCase().includes("address")||s.toLowerCase().includes("phone")},rawContent:{markdownLength:s.length,htmlLength:o.length,preview:s.slice(0,500)||o.slice(0,500)},createdAt:new Date().toISOString()};return console.log("[v0] Analysis complete. Score:",S.score),i.NextResponse.json(S)}catch(e){return console.log("[v0] Scan error:",e.message),i.NextResponse.json({error:e.message},{status:500})}}let m=new s.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/scan/route",pathname:"/api/scan",filename:"route",bundlePath:"app/api/scan/route"},resolvedPagePath:"/app/frontend/app/api/scan/route.ts",nextConfigOutput:"",userland:n}),{requestAsyncStorage:g,staticGenerationAsyncStorage:f,serverHooks:y}=m,S="/api/scan/route";function A(){return(0,r.patchFetch)({serverHooks:y,staticGenerationAsyncStorage:f})}}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),n=t.X(0,[948,972],()=>a(9721));module.exports=n})();