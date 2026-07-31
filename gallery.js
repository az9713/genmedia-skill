// /genmedia gallery — zero-dep local dashboard over C:/Users/simon/generations/
// run: node gallery.js   → http://localhost:7777
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIR = process.argv[2] || (fs.existsSync(path.join(process.cwd(), 'generations')) ? path.join(process.cwd(), 'generations') : process.cwd());
const PORT = 7777;
const MEDIA = { '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.webp': 'image', '.gif': 'image', '.mp4': 'video', '.webm': 'video', '.mov': 'video' };
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };

function list() {
  return fs.readdirSync(DIR)
    .filter(f => MEDIA[path.extname(f).toLowerCase()])
    .map(f => {
      const p = path.join(DIR, f);
      const side = p.replace(/\.[^.]+$/, '.json');
      let meta = null;
      try { meta = JSON.parse(fs.readFileSync(side, 'utf8')); } catch {}
      return { file: f, kind: MEDIA[path.extname(f).toLowerCase()], mtime: fs.statSync(p).mtimeMs, meta };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>genmedia gallery</title><style>
body{margin:0;background:#111;color:#ddd;font:14px system-ui}
header{padding:12px 18px;display:flex;gap:14px;align-items:baseline;position:sticky;top:0;background:#111c;backdrop-filter:blur(6px)}
h1{font-size:16px;margin:0}#count{color:#888}
#grid{columns:4 260px;column-gap:10px;padding:0 10px 40px}
.card{break-inside:avoid;margin-bottom:10px;position:relative;border-radius:8px;overflow:hidden;cursor:pointer;background:#1a1a1a}
.card img,.card video{width:100%;display:block}
.card .tag{position:absolute;bottom:0;left:0;right:0;padding:18px 8px 6px;font-size:11px;color:#ccc;background:linear-gradient(transparent,#000c);opacity:0;transition:.15s}
.card:hover .tag{opacity:1}
#modal{display:none;position:fixed;inset:0;background:#000d;z-index:9}
#modal.on{display:flex}
#modal .media{flex:1;display:flex;align-items:center;justify-content:center;padding:20px;min-width:0}
#modal img,#modal video{max-width:100%;max-height:92vh;border-radius:6px}
#panel{width:340px;padding:20px;background:#181818;overflow:auto;font-size:13px}
#panel h3{margin:0 0 4px;font-size:13px;color:#8f8}
#panel p{margin:0 0 14px;white-space:pre-wrap;word-break:break-word;color:#ccc}
button{background:#2a2a2a;color:#ddd;border:1px solid #444;border-radius:6px;padding:6px 12px;cursor:pointer;margin-right:8px}
button:hover{background:#333}
</style></head><body>
<header><h1>genmedia</h1><span id="count"></span><span style="flex:1"></span><button onclick="load()">refresh</button></header>
<div id="grid"></div>
<div id="modal" onclick="if(event.target.id==='modal')this.classList.remove('on')">
  <div class="media" id="mmedia"></div><div id="panel"></div>
</div>
<script>
let items=[],baseDir='';
function el(tag,attrs,kids){const e=document.createElement(tag);for(const k in attrs||{})k==='text'?e.textContent=attrs[k]:e.setAttribute(k,attrs[k]);(kids||[]).forEach(c=>e.appendChild(c));return e}
async function load(){
  const d=await (await fetch('/api/list')).json();items=d.items;baseDir=d.dir;
  document.getElementById('count').textContent=items.length+' items';
  const grid=document.getElementById('grid');grid.innerHTML='';
  items.forEach((it,i)=>{
    const media=it.kind==='video'
      ? el('video',{src:'/files/'+encodeURIComponent(it.file),muted:'',loop:''})
      : el('img',{loading:'lazy',src:'/files/'+encodeURIComponent(it.file)});
    if(it.kind==='video'){media.onmouseover=()=>media.play();media.onmouseout=()=>media.pause()}
    const card=el('div',{class:'card'},[media,el('div',{class:'tag',text:(it.meta&&it.meta.model)||it.file})]);
    card.onclick=()=>open_(i);
    grid.appendChild(card);
  });
}
function open_(i){
  const it=items[i], m=it.meta||{};
  const mm=document.getElementById('mmedia');mm.innerHTML='';
  mm.appendChild(it.kind==='video'
    ? el('video',{src:'/files/'+encodeURIComponent(it.file),controls:'',autoplay:'',loop:''})
    : el('img',{src:'/files/'+encodeURIComponent(it.file)}));
  const p=document.getElementById('panel');p.innerHTML='';
  [['prompt',m.prompt],['model',(m.model||'—')+' ('+(m.provider||'?')+')'],['cost',m.cost_usd!=null?'$'+m.cost_usd:null],['created',m.created],['file',it.file]]
    .forEach(([k,v])=>{p.appendChild(el('h3',{text:k}));p.appendChild(el('p',{text:v||'—'}))});
  const b1=el('button',{text:'copy prompt'});b1.onclick=()=>navigator.clipboard.writeText(m.prompt||'');
  const b2=el('button',{text:'copy path'});b2.onclick=()=>navigator.clipboard.writeText(baseDir+'/'+it.file);
  p.appendChild(b1);p.appendChild(b2);
  document.getElementById('modal').classList.add('on');
}
load();
</script></body></html>`;

http.createServer((req, res) => {
  try {
    if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(PAGE); }
    if (req.url === '/api/list') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ dir: DIR.replace(/\\/g, '/'), items: list() })); }
    if (req.url.startsWith('/files/')) {
      const f = path.basename(decodeURIComponent(req.url.slice(7))); // basename → no traversal
      const p = path.join(DIR, f);
      if (fs.existsSync(p)) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
        return fs.createReadStream(p).pipe(res);
      }
    }
    res.writeHead(404); res.end('not found');
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(PORT, '127.0.0.1', () => console.log('gallery: http://localhost:' + PORT));
