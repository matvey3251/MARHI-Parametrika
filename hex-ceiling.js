'use strict';
const fields = [
  ['columns','Модули вдоль',4,18,9,1,''],
  ['rows','Модули поперёк',3,8,4,1,''],
  ['side','Сторона модуля по осям каркаса',70,350,160,1,'мм'],
  ['rib','Ширина ребра',6,24,12,1,'мм'],
  ['gap','Посадочный зазор на сторону',0,4,1,0.25,'мм'],
  ['depth','Глубина вставок',15,200,85,1,'мм'],
  ['axis','Положение аттрактора поперёк',0,100,50,1,'%'],
  ['gradient','Влияние аттрактора на глубину',0,100,65,1,'%'],
  ['cables','Количество тросов',3,12,6,1,''],
  ['length','Длина троса',150,2000,550,10,'мм']
];
const byId = id => document.getElementById(id);
const mount = document.body.dataset.page === 'mount';
const inputs = new Map();
const query = new URLSearchParams(location.search);
const cos30 = Math.sqrt(3) / 2;
const angles = Array.from({length:6}, (_, i) => (30 + 60 * i) * Math.PI / 180);
const hex = (x,y,r) => angles.map(a => [x+r*Math.cos(a), y+r*Math.sin(a)]);
let selection = 0;
for (const [key,label,min,max,value,step,unit] of fields) {
  const field = document.createElement('div');
  field.className = 'field';
  field.innerHTML = '<label for="'+key+'">'+label+' <output></output></label><input type="range" id="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'">';
  const input = field.querySelector('input');
  const saved = query.get(key);
  input.value = saved !== null && Number.isFinite(Number(saved)) ? Math.max(min,Math.min(max,Number(saved))) : value;
  inputs.set(key,input);
  byId('controls').append(field);
  input.addEventListener('input', render);
  input.dataset.unit = unit;
}
function layout(p) {
  const cells = [], vertices = new Map();
  for (let row=0; row<p.rows; row++) {
    for (let col=0; col<p.columns; col++) {
      const x = p.side*Math.sqrt(3)*(col+(row%2)/2);
      const y = p.side*1.5*row;
      cells.push({x,y});
      for (const [vx,vy] of hex(x,y,p.side)) {
        const key = [Math.round(vx*1000),Math.round(vy*1000)].join(',');
        if (!vertices.has(key)) vertices.set(key,{x:vx,y:vy,count:0});
        vertices.get(key).count++;
      }
    }
  }
  const candidates = [...vertices.values()].filter(v=>v.count===3);
  const points = [];
  const width = Math.max(...cells.map(c=>c.x));
  const height = Math.max(...cells.map(c=>c.y));
  for (let i=0;i<p.cables;i++) {
    const row = i%2, slots = Math.ceil((p.cables-row)/2);
    const x = width*(.12+.76*(slots===1?.5:Math.floor(i/2)/(slots-1)));
    const y = height*(row?.75:.25);
    const closest = candidates.reduce((best,v,index)=>Math.hypot(v.x-x,v.y-y)<best.d?{index,d:Math.hypot(v.x-x,v.y-y)}:best,{index:-1,d:Infinity});
    points.push(candidates.splice(closest.index,1)[0]);
  }
  return {cells,points,width,height};
}
function polygon(vertices,fill,stroke='none',extra='') {
  return '<polygon points="'+vertices.map(v=>v.join(',')).join(' ')+'" fill="'+fill+'" stroke="'+stroke+'" '+extra+'/>';
}
function render() {
  const p = Object.fromEntries([...inputs].map(([key,input])=>{
    input.parentElement.querySelector('output').textContent = input.value+' '+input.dataset.unit;
    return [key,Number(input.value)];
  }));
  const {cells,points,width,height} = layout(p);
  selection = Math.min(selection,points.length-1);
  const mode = mount ? 'plan' : byId('view').value;
  const volume = mode==='volume';
  const project = ([x,y],z=0) => volume ? [x+y*.22,y*.64-z*.75] : [x,y];
  const opening = p.side-p.rib/(2*cos30);
  const insert = opening-p.gap/cos30;
  const axis = p.axis*height/100;
  const faceColors = ['#d3d9cc','#b5c1ad','#9eaf95','#bac7b2','#e1e7da','#f1f3eb'];
  const markup = [];
  for (const c of cells) {
    const outer = hex(c.x,c.y,p.side).map(v=>project(v));
    const inner = hex(c.x,c.y,opening).map(v=>project(v));
    for(let i=0;i<6;i++) {
      const j=(i+1)%6;
      markup.push(polygon([outer[i],outer[j],inner[j],inner[i]],'#70816b'));
    }
    if(mode==='frame' || mount) continue;
    const rim = hex(c.x,c.y,insert).map(v=>project(v));
    const influence = 1-Math.min(1,Math.abs(c.y-axis)/Math.max(1,axis,height-axis));
    const depth = p.depth*(1-p.gradient/100*(1-influence));
    const base = hex(c.x,c.y,insert*.49).map(v=>project(v,depth));
    for(let i=0;i<6;i++) {
      const j=(i+1)%6;
      markup.push(polygon([rim[i],rim[j],base[j],base[i]],faceColors[i],'#667762','stroke-width="0.8"'));
    }
    markup.push(polygon(base,'#fdfcf9','#70816b'));
  }
  if(mount) points.forEach((v,i)=>{
    const r = Math.min(p.side*.31,42);
    markup.push('<circle class="pin" data-point="'+i+'" cx="'+v.x+'" cy="'+v.y+'" r="'+r+'" fill="'+(i===selection?'#28312c':'#846148')+'"/>');
    markup.push('<text pointer-events="none" x="'+v.x+'" y="'+v.y+'" dy=".35em" text-anchor="middle" fill="white" font-size="'+r*.82+'">T'+(i+1)+'</text>');
  });
  const scene = byId('scene');
  const pad = p.side*1.25;
  scene.setAttribute('viewBox',[-pad,-pad-(volume?p.depth*.75:0),width+2*pad+(volume?height*.22:0),(volume?height*.64+p.depth*.75:height)+2*pad].join(' '));
  scene.innerHTML = markup.join('');
  byId('summary').textContent = cells.length+' вставок · сторона контура вставки '+insert.toFixed(1)+' мм · '+points.length+' тросов';
  const target = mount ? 'ceiling-equal-cells.html' : 'hex-attachment-points.html';
  byId('other').href = target+'?'+new URLSearchParams(p);
  if(mount) renderMount(points,p);
}
function renderMount(points,p) {
  const list = byId('point');
  if(list.options.length!==points.length) list.replaceChildren(...points.map((_,i)=>new Option('T'+(i+1),i)));
  list.value = selection;
  const {x,y} = points[selection];
  byId('coordinates').textContent = 'T'+(selection+1)+' · X '+Math.round(x)+' мм · Y '+Math.round(y)+' мм от центра первой ячейки. Трос '+p.length+' мм между точками подвеса.';
  const upper = byId('upper').value==='beam' ? 'Зажим на проверенной стальной балке' : 'Проушина независимой траверсы';
  byId('detail').innerHTML = '<g font-family="Segoe UI,sans-serif" fill="#28312c" font-size="16"><rect x="30" y="22" width="155" height="16" rx="3" fill="#70816b"/><path d="M95 38h25v15H95z M108 53v113" stroke="#394837" stroke-width="3" fill="none"/><circle cx="108" cy="171" r="7" fill="none" stroke="#394837" stroke-width="3"/><path d="M28 186h160 M78 186v17h60v-17" fill="none" stroke="#70816b" stroke-width="8"/><path d="M30 174h45v17 M185 174h-45v17" fill="none" stroke="#846148" stroke-width="5"/><text x="210" y="36">'+upper+'</text><text x="210" y="100">Трос · '+p.length+' мм</text><text x="210" y="171">Проушина и накладка на стыке</text><text x="210" y="204">Уступ ложа и бортик вставки</text></g>';
}
if(mount) {
  byId('upper').addEventListener('change',render);
  byId('point').addEventListener('change',e=>{selection=Number(e.target.value);render();});
  byId('scene').addEventListener('click',e=>{
    if(e.target.dataset.point!==undefined) {selection=Number(e.target.dataset.point);render();}
  });
} else byId('view').addEventListener('change',render);
render();
