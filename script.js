(()=>{var c=(o,n={},i=[],u=null)=>{let t=typeof o=="string"?document.createElement(o):o;for(let e in n)if(Object.prototype.hasOwnProperty.call(n,e))if(e==="text")t.appendChild(document.createTextNode(n[e]));else if(e==="html")typeof n[e]=="string"?t.innerHTML=n[e]:t.appendChild(n[e]);else if(typeof n[e]=="object")for(let l in n[e])Object.prototype.hasOwnProperty.call(n[e],l)&&(t[e][l]=n[e][l]);else typeof n[e]=="function"?t.addEventListener(e,n[e]):t.setAttribute(e,n[e]);return i.forEach(e=>{typeof e=="string"&&(e=document.createTextNode(e)),e&&t.appendChild(e)}),u&&u.appendChild(t),t};var s=["colorFlood","mineField","tetris","tiledOfLife"];s.map(o=>c("link",{href:`/background/dist/${o}.js`,rel:"preload",as:"script"},[],document.head));var a=Math.floor(Math.random()*s.length),d;function f(o){let i=`
<body>
<script src="/background/dist/${s.at(a%s.length)}.js"><\/script>
<script>
// Install background
self.background = self.background || [];
<\/script>
`;return d?(d.srcdoc=i,d):c("iframe",{id:"background",srcdoc:i},[],document.body)}d=f(a);var r,g=d.contentWindow;d.addEventListener("load",()=>{g.background.push(o=>{r||(c("div",{class:"controls"},[c("a",{id:"prev_btn",text:"\u25C0",click:n=>{f(--a),n.stopPropagation()}}),c("a",{text:"Play",id:"play_btn",href:"#background",click:n=>{n.stopPropagation()}}),c("a",{id:"next_btn",text:"\u25B6",click:n=>{f(++a),n.stopPropagation()}})],document.body),window.addEventListener("hashchange",p)),r=o.init(null),r.setup?.({controls:!1}),p()})});function p(){let o=window.location.hash==="#background";window.document.documentElement.classList[o?"add":"remove"]("background"),r.config?.({controls:o})}document.addEventListener("touchmove",o=>{o.preventDefault()},!1);})();
//# sourceMappingURL=script.js.map
