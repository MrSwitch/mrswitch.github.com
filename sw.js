(()=>{(function(d){var f={};function n(e){if(f[e])return f[e].exports;var t=f[e]={i:e,l:!1,exports:{}};return d[e].call(t.exports,t,t.exports,n),t.l=!0,t.exports}n.m=d,n.c=f,n.d=function(e,t,s){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:s})},n.r=function(e){typeof Symbol<"u"&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t||4&t&&typeof e=="object"&&e&&e.__esModule)return e;var s=Object.create(null);if(n.r(s),Object.defineProperty(s,"default",{enumerable:!0,value:e}),2&t&&typeof e!="string")for(var o in e)n.d(s,o,function(r){return e[r]}.bind(null,o));return s},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=0)})([function(d,f,n){let e=new(n(1))("adorn_sw",1,{falloverStore:{autoIncrement:!0}})("falloverStore");var t;function s(o){if(!o)throw new Error("not found");return o}self.addEventListener("install",o=>{o.waitUntil(caches.open("adorn_sw").then(()=>{}))}),self.addEventListener("fetch",o=>{{let h=new URL(o.request.url);if(self.location.host!==h.host)return!1}let r=o.request,c;o.respondWith((async()=>{let h=caches.match(r).then(a=>(a&&(c=c||"cache wins"),a)),i=fetch(r).then(a=>(a&&(c=c||"network wins"),a)),p=(t=[h,i],new Promise((a,l)=>{(t=t.map(u=>Promise.resolve(u).then(s))).forEach(u=>u.then(a)),t.reduce((u,m)=>u.catch(()=>m)).catch(()=>l(Error("All failed")))}));return p.then(()=>{console.log(c,r.url)}),i.then(function(a,l){if(!l||l.status!==200||l.type!=="basic")return l;let u=l.clone();return caches.open("adorn_sw").then(m=>{m.put(a,u)}),l}.bind(null,r)),p.catch(async function(a){let l=(await e.all()).filter(u=>(!u.mode||u.mode===a.mode)&&(!u.url||a.url.match(u.url)))[0];if(l)return caches.match(new Request(l.fallover))}.bind(null,r))})())}),self.addEventListener("message",o=>{let r=o.data;caches.open("adorn_sw").then(c=>{switch(r.type){case"fallover":e.all().then(h=>{let i=h.filter(a=>a.mode===r.mode&&a.url===r.url)[0];if(i&&i.fallover===r.fallover)return;let p=new Request(r.fallover,{mode:"no-cors"});fetch(p).then(a=>(i?i.fallover=r.fallover:e.put(r),c.put(r.fallover,a)))});break;case"add":{let h=new Request(r.url,{mode:"no-cors"});return fetch(h).then(i=>c.put(r.url,i))}}})})},function(d,f){d.exports=class{constructor(n,e,t){return this.db_name=n||"__adorn__",typeof e=="object"?(this.version=1,this.schema=e):(this.version=e||1,this.schema=t),this.table_name="__adorn__",Object.assign(this.scope.bind(this),this)}scope(n){let e=Object.create(this);return e.table_name=n,e}open(n){return new Promise((e,t)=>{let s=self.indexedDB.open(this.db_name,this.version);s.onsuccess=o=>{e(o.target.result)},s.onerror=t,s.onupgradeneeded=o=>{let r=o.target.result;for(let c in this.schema)r.objectStoreNames.contains(c)||r.createObjectStore(c,this.schema[c])}}).then(e=>e.transaction([this.table_name],n).objectStore(this.table_name))}get(n){return new Promise((e,t)=>{this.open().then(s=>{let o=s.get(n);o.onsuccess=r=>{e(r.target.result)},o.onerror=r=>{t(r.target.result)}})})}all(){return new Promise((n,e)=>{this.open().then(t=>{let s=t.openCursor();s.onerror=r=>{e(r.target.result)};let o=[];s.onsuccess=r=>{let c=r.target.result;c?(o.push(c.value),c.continue()):n(o)}})})}put(n,e){return new Promise((t,s)=>{typeof n=="object"?e=n:e.key=n,this.open("readwrite").then(o=>{let r=o.put(e);r.onsuccess=c=>{t(c.target.result)},r.onerror=c=>{s(c.target.result)}}).catch(s)})}}}]);})();
//# sourceMappingURL=sw.js.map
