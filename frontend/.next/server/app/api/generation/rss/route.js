"use strict";(()=>{var e={};e.id=350,e.ids=[350],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7147:e=>{e.exports=require("fs")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},6555:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>h,patchFetch:()=>g,requestAsyncStorage:()=>c,routeModule:()=>u,serverHooks:()=>m,staticGenerationAsyncStorage:()=>d});var i={};r.r(i),r.d(i,{POST:()=>l});var n=r(9303),a=r(8716),s=r(670),o=r(7070),p=r(7280);async function l(e){try{let{url:t}=await e.json(),r=function(e){if(!e)throw Error("URL is required");let t=e.trim();return t.startsWith("http://")||t.startsWith("https://")||(t=`https://${t}`),new URL(t),t}(t),i="",n="";try{let e=await fetch(r,{headers:{"User-Agent":"Mozilla/5.0 (compatible; AIReadinessBot/1.0)"}}),t=(i=await e.text()).match(/<title[^>]*>([^<]+)<\/title>/i);n=t?t[1].trim():new URL(r).hostname}catch{n=new URL(r).hostname}let{text:a}=await (0,p._4)({model:"anthropic/claude-sonnet-4-20250514",prompt:`Extract content items from this webpage to create RSS feed items.
Return JSON array with objects: {title, description, link, pubDate}

HTML (first 10000 chars):
${i.slice(0,1e4)}

Return ONLY valid JSON array.`}),s=[];try{s=JSON.parse(a)}catch{s=[{title:n,description:"Main page content",link:r,pubDate:new Date().toUTCString()}]}let l=new URL(r).origin,u=`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:ai="http://ai-readiness.org/rss">
  <channel>
    <title>${n}</title>
    <link>${r}</link>
    <description>AI-optimized RSS feed for ${n}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${l}/feed.xml" rel="self" type="application/rss+xml"/>
${s.slice(0,20).map(e=>`    <item>
      <title>${e.title||"Untitled"}</title>
      <description><![CDATA[${e.description||""}]]></description>
      <link>${e.link||r}</link>
      <pubDate>${e.pubDate||new Date().toUTCString()}</pubDate>
    </item>`).join("\n")}
  </channel>
</rss>`;return o.NextResponse.json({rss:u})}catch(e){return o.NextResponse.json({error:e.message},{status:500})}}let u=new n.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/generation/rss/route",pathname:"/api/generation/rss",filename:"route",bundlePath:"app/api/generation/rss/route"},resolvedPagePath:"/app/frontend/app/api/generation/rss/route.ts",nextConfigOutput:"",userland:i}),{requestAsyncStorage:c,staticGenerationAsyncStorage:d,serverHooks:m}=u,h="/api/generation/rss/route";function g(){return(0,s.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:d})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[948,972,280],()=>r(6555));module.exports=i})();