const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),G=require('./paper-unfolding-geometry.js');
const context2d=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
function element(){return{style:{setProperty(){}},classList:{toggle(){}},dataset:{},append(){},replaceChildren(){},querySelector(){return element()},querySelectorAll(){return[]},getBoundingClientRect(){return{width:900,height:700}},getContext(){return context2d},innerHTML:'',value:''}}
function load(file){const html=fs.readFileSync(file,'utf8'),sandbox={console,structuredClone,document:{querySelector:()=>element(),getElementById:()=>element(),querySelectorAll:()=>[],createElement:()=>element()},Image:class{},localStorage:{getItem(){return null},setItem(){}},ResizeObserver:class{observe(){}},requestAnimationFrame:()=>{},devicePixelRatio:1,setTimeout,clearTimeout,URL,Blob,location:{}};vm.createContext(sandbox);vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox);return{run:code=>vm.runInContext(code,sandbox),html}}
const before=load(__dirname+'/versions/ceiling-linear-archive.html'),original=load(__dirname+'/ceiling-original.html'),inverted=load(__dirname+'/ceiling-recesses-down.html');
assert.equal(original.run('JSON.stringify(faces)'),before.run('JSON.stringify(faces)'),'Original geometry must remain unchanged');
assert.equal(original.run('JSON.stringify(polygons)'),inverted.run('JSON.stringify(polygons)'));
const a=JSON.parse(original.run('JSON.stringify(faces)')),b=JSON.parse(inverted.run('JSON.stringify(faces)'));
for(let i=0;i<a.length;i++)for(let j=0;j<a[i].v.length;j++){assert.equal(a[i].v[j][0],b[i].v[j][0]);assert.equal(a[i].v[j][2],b[i].v[j][2]);assert(Math.abs((a[i].v[j][1]+b[i].v[j][1])/2-original.run('3.5-state.drop'))<1e-10)}
const cell=JSON.parse(original.run(`(()=>{let index=Math.floor(polygons.length/2),c=polygons[index];return JSON.stringify({format:'forma-cell',id:index+1,poly:c.poly,center:c.p,depth:state.depth*(1-state.depthGain+state.depthGain*c.f),opening:state.opening,inverted:true,flattened:false})})()`));

let tested=0;
const polys=JSON.parse(original.run('JSON.stringify(polygons)'));
for(const {poly,p}of polys){const width=(Math.max(...poly.map(p=>p[0]))-Math.min(...poly.map(p=>p[0])))*1000;
for(const depth of [5,120,450])for(const opening of [.15,.4,.8]){const spec={poly,center:p,width,depth,opening,scale:5,tab:5,cap:true,inverted:true},dev=G.develop(spec),edgeLengths=new Map();
for(const part of dev.parts){assert(part.poly.every(p=>p.every(Number.isFinite)));if(!part.cap)for(let i=0;i<4;i++){const planar=G.dist(part.poly[i],part.poly[(i+1)%4])*spec.scale,spatial=G.dist(part.model[i],part.model[(i+1)%4]);assert(Math.abs(planar-spatial)<1e-6,'Every developed face edge must equal its 3D edge')}
part.labels.forEach((label,i)=>{if(!/^[SC]/.test(label))return;const length=G.dist(part.poly[i],part.poly[(i+1)%part.poly.length]);if(edgeLengths.has(label))assert(Math.abs(edgeLengths.get(label)-length)<1e-7,'Matching seam '+label+' must have equal lengths');else edgeLengths.set(label,length)});
}const flip=G.develop({...spec,inverted:false});assert.equal(JSON.stringify(dev.parts.map(p=>p.poly)),JSON.stringify(flip.parts.map(p=>p.poly)),'Inversion must not change paper sizes');
try{const pages=G.pack(dev.parts);for(const page of pages)for(const placed of page){const bounds=G.bounds(placed.part.poly.concat(...placed.part.tabs.map(t=>t.p)));assert(placed.x+bounds.minX>=12&&placed.x+bounds.maxX<=198);assert(placed.y+bounds.minY>=30&&placed.y+bounds.maxY<=269)}}catch(e){if(!e.message.includes('не помещается'))throw e}tested++;}}
assert.throws(()=>G.pack(G.develop({poly:cell.poly,center:cell.center,width:2000,depth:800,opening:.4,scale:1,tab:5,cap:true,inverted:true}).parts));
for(const name of ['ceiling-original.html','ceiling-recesses-down.html','cell-paper-template.html']){const html=fs.readFileSync(__dirname+'/'+name,'utf8');for(const target of ['ceiling-original.html','cell-paper-template.html','ceiling-recesses-down.html'])assert(html.includes('href="'+target+'"'))}
for(const name of ['cell-paper-template.js','paper-unfolding-geometry.js','cell-default-geometry.js','controls.js'])new vm.Script(fs.readFileSync(__dirname+'/'+name,'utf8'));
// Exercise the full cell page, including printable SVG generation, without a browser.
const cellElements=new Map(),getElement=id=>{if(!cellElements.has(id))cellElements.set(id,element());return cellElements.get(id)};
const cellSandbox={console,structuredClone,PaperGeometry:G,document:{getElementById:getElement,createElement:()=>element()},location:{hash:'#'+encodeURIComponent(JSON.stringify(cell))},ResizeObserver:class{observe(){}},devicePixelRatio:1,URL,Blob,setTimeout,clearTimeout,window:{print(){}}};
vm.createContext(cellSandbox);vm.runInContext(fs.readFileSync(__dirname+'/cell-paper-template.js','utf8'),cellSandbox);
assert.equal(getElement('error').textContent,'');assert(getElement('print-sheets').innerHTML.includes('width="210mm" height="297mm"'));
assert(getElement('print-sheets').innerHTML.includes('Контрольный отрезок 50 мм'));
assert(getElement('sheet-preview').innerHTML.startsWith('<svg'));
vm.runInContext('spec.width=2000;spec.depth=800;spec.scale=1;render()',cellSandbox);assert.equal(getElement('print').disabled,true);assert(getElement('error').textContent.includes('не помещается'));
getElement('reset').onclick();assert.equal(getElement('print').disabled,false);
console.log(JSON.stringify({originalGeometry:'unchanged',inversion:'mirror verified',paperConfigurations:tested,seamAndEdgeLengths:'exact',A4Bounds:'verified',oversizedParts:'blocked without rescaling',navigation:'3 pages',defaultCell:cell.id},null,2));
