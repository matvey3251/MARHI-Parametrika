(function(root){
  'use strict';
  const key = p => p.map(v=>Math.round(v*1e5)).join(',');
  const edgeKey = (a,b) => [key(a),key(b)].sort().join('|');
  class Mesh {
    constructor(){ this.triangles=[]; }
    face(points){
      for(let i=1;i<points.length-1;i++) this.triangles.push([points[0],points[i],points[i+1]]);
    }
    // Input faces share their edges and have consistent winding.
    shell(faces, offset){
      const start=this.triangles.length;
      const edges=new Map();
      for(const f of faces){
        this.face(f);
        this.face(f.map(offset).reverse());
        f.forEach((a,i)=>{
          const b=f[(i+1)%f.length], k=edgeKey(a,b);
          if(edges.has(k)) edges.get(k).count++;
          else edges.set(k,{a,b,count:1});
        });
      }
      for(const {a,b,count} of edges.values()) if(count===1) this.face([b,a,offset(a),offset(b)]);
      const shell=this.triangles.slice(start);
      const volume=shell.reduce((sum,[a,b,c])=>sum+a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]),0);
      if(volume<0) for(const triangle of shell) [triangle[1],triangle[2]]=[triangle[2],triangle[1]];
    }
    cell(outer,inner,cap,offset){
      const faces=outer.map((a,i)=>{
        const j=(i+1)%outer.length;
        return [a,outer[j],inner[j],inner[i]];
      });
      if(cap) faces.push(inner);
      this.shell(faces,offset);
    }
    cable(a,b,r=1.5){
      if(Math.hypot(...a.map((x,i)=>x-b[i]))<.01)return;
      const d=b.map((x,i)=>x-a[i]), len=Math.hypot(...d);
      const w=d.map(x=>x/len);
      const u=Math.abs(w[2])>.9?[1,0,0]:[-w[1],w[0],0];
      const proj=u.reduce((s,x,i)=>s+x*w[i],0);
      const perp=u.map((x,i)=>x-proj*w[i]);
      const unit=perp.map(x=>x/Math.hypot(...perp));
      const v=[w[1]*unit[2]-w[2]*unit[1],w[2]*unit[0]-w[0]*unit[2],w[0]*unit[1]-w[1]*unit[0]];
      const ring=p=>Array.from({length:12},(_,i)=>p.map((x,j)=>x+r*(unit[j]*Math.cos(i*Math.PI/6)+v[j]*Math.sin(i*Math.PI/6))));
      const low=ring(a), high=ring(b);
      this.face([...low].reverse());this.face(high);
      low.forEach((p,i)=>{const j=(i+1)%low.length;this.face([p,low[j],high[j],high[i]]);});
    }
    binary(){
      const valid=[];
      let minZ=Infinity;
      for(const vertices of this.triangles){
        if(!vertices.flat().every(Number.isFinite)) throw Error('Некорректная геометрия STL');
        const [a,b,c]=vertices, u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]);
        const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        const l=Math.hypot(...n);
        if(l<1e-8) continue;
        minZ=Math.min(minZ,...vertices.map(p=>p[2]));
        valid.push({vertices,normal:n.map(x=>x/l)});
      }
      if(!valid.length) throw Error('Нет геометрии для STL');
      const buffer=new ArrayBuffer(84+50*valid.length), view=new DataView(buffer);
      new Uint8Array(buffer).set(new TextEncoder().encode('FORMA binary STL | millimetres'));
      view.setUint32(80,valid.length,true);
      valid.forEach(({vertices,normal},i)=>{
        const values=[...normal,...vertices.flatMap(([x,y,z])=>[x,y,z-minZ])];
        values.forEach((value,j)=>view.setFloat32(84+50*i+4*j,value,true));
      });
      return buffer;
    }
    save(name){
      const url=URL.createObjectURL(new Blob([this.binary()],{type:'model/stl'}));
      const link=document.createElement('a');
      link.href=url;link.download=name+'.stl';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  }
  function bind(button,exportModel){
    button.addEventListener('click',()=>{
      try {exportModel();} catch(error){window.alert(error.message);}
    });
  }
  root.FormaSTL={Mesh,bind};
  if(typeof module!=='undefined')module.exports=root.FormaSTL;
})(globalThis);
