/* Exact face development for a horizontal homothetic polygonal cell. Units: mm. */
(function(root){
'use strict';
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),dist=(a,b)=>Math.hypot(...sub(a,b));
function area(p){return p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0)/2}
function tab(a,b,width){const d=sub(b,a),len=Math.hypot(...d),w=Math.min(width,len*.22),u=d.map(x=>x/len),n=[u[1],-u[0]];return[a,[a[0]+u[0]*len*.18+n[0]*w,a[1]+u[1]*len*.18+n[1]*w],[b[0]-u[0]*len*.18+n[0]*w,b[1]-u[1]*len*.18+n[1]*w],b]}
function model(spec){let poly=spec.poly.map(p=>p.slice());if(area(poly)<0)poly.reverse();const center=spec.center||[0,0];
const span=Math.max(...poly.map(p=>p[0]))-Math.min(...poly.map(p=>p[0]));
const outer=poly.map(p=>[(p[0]-center[0])*spec.width/span,0,(p[1]-center[1])*spec.width/span]);
const sign=spec.inverted?1:-1,inner=outer.map(p=>[p[0]*spec.opening,sign*spec.depth,p[2]*spec.opening]);
return{outer,inner};}
function develop(spec){const m=model(spec),scale=spec.scale,n=m.outer.length,parts=[];for(let i=0;i<n;i++){const j=(i+1)%n,a=m.outer[i],b=m.outer[j],c=m.inner[j],d=m.inner[i],len=dist(a,b),u=sub(b,a).map(x=>x/len),t=dot(sub(d,a),u),height=Math.sqrt(Math.max(0,dist(a,d)**2-t*t)),poly=[[0,0],[len/scale,0],[(t+dist(c,d))/scale,height/scale],[t/scale,height/scale]];
const tabs=spec.tab>0?[{edge:1,p:tab(poly[1],poly[2],spec.tab)}]:[];if(spec.cap&&spec.tab>0)tabs.push({edge:2,p:tab(poly[2],poly[3],spec.tab)});
parts.push({name:'Панель '+(i+1),poly,tabs,labels:['ОБОД '+(i+1),'S'+(j+1),'C'+(i+1),'S'+(i+1)],model:[a,b,c,d]});}
if(spec.cap){const poly=m.inner.map(p=>[p[0]/scale,-p[2]/scale]);if(area(poly)<0)poly.reverse();parts.push({name:'Внутренняя крышка',poly,tabs:[],labels:poly.map((_,i)=>'C'+((2*n-2-i)%n+1)),cap:true});}
return{...m,parts};}
function bounds(points){return{minX:Math.min(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxX:Math.max(...points.map(p=>p[0])),maxY:Math.max(...points.map(p=>p[1]))}}
function pack(parts){const pages=[[]];let x=12,y=30,row=0;for(const part of parts){const b=bounds(part.poly.concat(...part.tabs.map(t=>t.p))),w=b.maxX-b.minX+8,h=b.maxY-b.minY+16;if(w>186||h>239)throw Error('Деталь не помещается на A4. Увеличьте знаменатель масштаба; размеры не уменьшались автоматически.');if(x+w>198){x=12;y+=row+5;row=0}if(y+h>269){pages.push([]);x=12;y=30;row=0}pages.at(-1).push({part,x:x-b.minX+4,y:y-b.minY+9});x+=w+5;row=Math.max(row,h)}return pages;}
root.PaperGeometry={model,develop,pack,dist,area,bounds};if(typeof module!=='undefined')module.exports=root.PaperGeometry;
})(typeof globalThis!=='undefined'?globalThis:this);
