"use strict";(()=>{var e={};e.id=319,e.ids=[319],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},5533:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>h,patchFetch:()=>d,requestAsyncStorage:()=>u,routeModule:()=>l,serverHooks:()=>m,staticGenerationAsyncStorage:()=>c});var a={};r.r(a),r.d(a,{POST:()=>p});var i=r(9303),s=r(8716),n=r(670),o=r(7070);async function p(e){try{let{url:t}=await e.json(),r=function(e){if(!e)throw Error("URL is required");let t=e.trim();return t.startsWith("http://")||t.startsWith("https://")||(t=`https://${t}`),new URL(t),t}(t),a=new URL(r).origin,i="";try{let e=await fetch(r,{headers:{"User-Agent":"Mozilla/5.0 (compatible; AIReadinessBot/1.0)"}});i=await e.text()}catch{}let s=(i.match(/href=["']([^"']+)["']/gi)||[]).map(e=>e.replace(/href=["']/i,"").replace(/["']$/,"")).filter(e=>e.startsWith("/")||e.startsWith(a)).map(e=>e.startsWith("/")?`${a}${e}`:e).filter((e,t,r)=>r.indexOf(e)===t).slice(0,50),n=new Date().toISOString().split("T")[0],p=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${r}</loc>
    <lastmod>${n}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${s.map(e=>`  <url>
    <loc>${e}</loc>
    <lastmod>${n}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join("\n")}
</urlset>`;return o.NextResponse.json({sitemap:p})}catch(e){return o.NextResponse.json({error:e.message},{status:500})}}let l=new i.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/generation/sitemap/route",pathname:"/api/generation/sitemap",filename:"route",bundlePath:"app/api/generation/sitemap/route"},resolvedPagePath:"/app/frontend/app/api/generation/sitemap/route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:u,staticGenerationAsyncStorage:c,serverHooks:m}=l,h="/api/generation/sitemap/route";function d(){return(0,n.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:c})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[948,972],()=>r(5533));module.exports=a})();