(function(root){
  'use strict';
  const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
  function area(poly){return Math.abs(poly.reduce((sum,p,i)=>sum+cross(p,poly[(i+1)%poly.length]),0)/2);}
  function center(poly){
    let sum=0,x=0,y=0;
    poly.forEach((p,i)=>{const q=poly[(i+1)%poly.length],w=cross(p,q);sum+=w;x+=(p[0]+q[0])*w;y+=(p[1]+q[1])*w;});
    return Math.abs(sum)>1e-12?[x/(3*sum),y/(3*sum)]:poly[0];
  }
  function clip(poly,nx,ny,c){
    const out=[];
    poly.forEach((a,i)=>{
      const b=poly[(i+1)%poly.length],da=a[0]*nx+a[1]*ny-c,db=b[0]*nx+b[1]*ny-c;
      if(da<=1e-10)out.push(a);
      if((da<0)!==(db<0)){const t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
    });
    return out;
  }
  function inset(tile,margin){
    let result=tile;
    for(let i=0;i<tile.length&&result.length;i++){
      const a=tile[i],b=tile[(i+1)%tile.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
      if(length<1e-9)continue;
      result=clip(result,dy/length,-dx/length,(dy*a[0]-dx*a[1])/length-margin);
    }
    return result;
  }
  function regularInside(tile,p,sides){
    const dirs=Array.from({length:sides},(_,i)=>[Math.cos(2*Math.PI*i/sides),Math.sin(2*Math.PI*i/sides)]);
    let radius=Infinity;
    tile.forEach((a,i)=>{
      const b=tile[(i+1)%tile.length],normal=[b[1]-a[1],a[0]-b[0]],limit=normal[0]*(a[0]-p[0])+normal[1]*(a[1]-p[1]);
      dirs.forEach(d=>{const projected=normal[0]*d[0]+normal[1]*d[1];if(projected>1e-12)radius=Math.min(radius,limit/projected);});
    });
    return dirs.map(d=>[p[0]+d[0]*radius,p[1]+d[1]*radius]);
  }
  function prepare(cells,{gap,regular,sides,field,width,length,count,density=1}){
    const packed=regular&&[3,4].includes(sides);
    if(packed)cells=adaptive(width,length,count,sides,field,density,gap);
    const result=[];
    for(const cell of cells){
      const tile=cell.poly;
      let poly=inset(tile,gap/2+.0003);
      if(poly.length<3||area(poly)<.00015)continue;
      let changed=true;
      while(changed&&poly.length>3){
        changed=false;
        for(let i=0;i<poly.length;i++){
          const a=poly[i],b=poly[(i+1)%poly.length];
          if(Math.hypot(a[0]-b[0],a[1]-b[1])<.004){poly.splice(i,1);changed=true;break;}
        }
      }
      const p=center(poly);
      if(regular&&!packed)poly=regularInside(poly,p,sides);
      const inradius=Math.min(...poly.map((a,i)=>{
        const b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1];
        return Math.abs(dy*(p[0]-a[0])-dx*(p[1]-a[1]))/Math.hypot(dx,dy);
      }));
      if(inradius<.012)continue;
      if(area(poly)<.00015||poly.some((a,i)=>Math.hypot(a[0]-poly[(i+1)%poly.length][0],a[1]-poly[(i+1)%poly.length][1])<.003))continue;
      result.push({p,poly,tile,f:field(...p)});
    }
    return result;
  }
  function ring(outer,inner,p){
    const angles=[...outer,...inner].map(v=>Math.atan2(v[1]-p[1],v[0]-p[0])).sort((a,b)=>a-b).filter((v,i,a)=>!i||Math.abs(v-a[i-1])>1e-8);
    const ray=(poly,angle)=>{
      const d=[Math.cos(angle),Math.sin(angle)];let radius=Infinity;
      poly.forEach((a,i)=>{const b=poly[(i+1)%poly.length],normal=[b[1]-a[1],a[0]-b[0]],den=normal[0]*d[0]+normal[1]*d[1];if(den>1e-12)radius=Math.min(radius,(normal[0]*(a[0]-p[0])+normal[1]*(a[1]-p[1]))/den);});
      return [p[0]+radius*d[0],p[1]+radius*d[1]];
    };
    return angles.map((a,i)=>{const b=angles[(i+1)%angles.length];return[ray(outer,a),ray(outer,b),ray(inner,b),ray(inner,a)];});
  }
  function frame(cell,surface,thickness=.0015){
    const radius=Math.max(...cell.poly.map(p=>Math.hypot(p[0]-cell.p[0],p[1]-cell.p[1])));
    const factor=1+.00015/radius;
    const hole=cell.poly.map(p=>[cell.p[0]+(p[0]-cell.p[0])*factor,cell.p[1]+(p[1]-cell.p[1])*factor]);
    const top=ring(cell.tile,hole,cell.p).map(q=>q.map((p,i)=>[p[0],(i<2?surface(...p):surface(...cell.p))-.003,p[1]]));
    const faces=top.concat(top.map(q=>q.map(([x,y,z])=>[x,y-thickness,z]).reverse()));
    hole.forEach((a,i)=>{
      const b=hole[(i+1)%hole.length],y=surface(...cell.p)-.003;
      faces.push([[a[0],y,a[1]],[b[0],y,b[1]],[b[0],y-thickness,b[1]],[a[0],y-thickness,a[1]]]);
    });
    return faces;
  }
  function tiled(width,length,count,sides){
    const tiles=[];
    const side=Math.sqrt(width*length/count/(sides===3?Math.sqrt(3)/4:sides===4?1:3*Math.sqrt(3)/2));
    const add=poly=>{
      if(poly.every(([x,y])=>x>=-width/2-1e-8&&x<=width/2+1e-8&&y>=-length/2-1e-8&&y<=length/2+1e-8))tiles.push({poly});
    };
    if(sides===4){
      const nx=Math.max(1,Math.round(width/side)),size=width/nx,ny=Math.max(1,Math.floor(length/size));
      for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
        const a=(x-nx/2)*size,b=(y-ny/2)*size;
        add([[a,b],[a+size,b],[a+size,b+size],[a,b+size]]);
      }
    }else if(sides===6){
      const r=Math.min(side,width/Math.sqrt(3)),stepX=Math.sqrt(3)*r;
      for(let row=0;row<Math.ceil(length/(1.5*r));row++)for(let col=0;col<Math.ceil(width/stepX);col++){
        const x=-width/2+stepX*(col+.5+(row%2)/2),y=-length/2+r+row*1.5*r;
        add(Array.from({length:6},(_,i)=>[x+r*Math.cos(Math.PI/6+i*Math.PI/3),y+r*Math.sin(Math.PI/6+i*Math.PI/3)]));
      }
    }else{
      const size=Math.min(side,width/2),h=size*Math.sqrt(3)/2;
      for(let row=0;row<Math.ceil(length/h);row++)for(let col=-1;col<Math.ceil(width/size);col++){
        const x=-width/2+(col+(row%2)/2)*size,y=-length/2+row*h;
        add([[x,y],[x+size,y],[x+size/2,y+h]]);
        add([[x+size/2,y+h],[x+size,y],[x+1.5*size,y+h]]);
      }
    }
    return tiles;
  }
  function adaptive(width,length,count,sides,field,density,gap){
    if(density<=1)return tiled(width,length,count,sides);
    const tiles=tiled(width,length,Math.max(4,Math.floor(count/16)),sides);
    const midpoint=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
    const split=tile=>{
      const p=tile.poly,m=p.map((a,i)=>midpoint(a,p[(i+1)%p.length]));
      if(sides===3)return [[p[0],m[0],m[2]],[m[0],p[1],m[1]],[m[2],m[1],p[2]],[m[0],m[1],m[2]]];
      const c=center(p);
      return p.map((a,i)=>[a,m[i],c,m[(i+3)%4]]);
    };
    const scores=tile=>{
      const c=center(tile.poly);
      const samples=[c,...tile.poly.map(p=>midpoint(p,c))];
      const influence=Math.max(...samples.map(p=>field(...p)));
      return area(tile.poly)*(1+(density*density-1)*influence*influence);
    };
    const valid=poly=>{
      const insetPoly=inset(poly,gap/2+.0003);
      if(insetPoly.length<3||area(insetPoly)<.00015)return false;
      const c=center(insetPoly);
      return insetPoly.every((a,i)=>{
        const b=insetPoly[(i+1)%insetPoly.length],dx=b[0]-a[0],dy=b[1]-a[1];
        return Math.abs(dy*(c[0]-a[0])-dx*(c[1]-a[1]))/Math.hypot(dx,dy)>=.0121;
      });
    };
    const blocked=new Set();
    while(tiles.length+3<=count){
      let best=-1,score=-Infinity;
      tiles.forEach((tile,i)=>{if(!blocked.has(tile)){const value=scores(tile);if(value>score){score=value;best=i;}}});
      if(best<0)break;
      const selected=tiles[best],children=split(selected);
      if(!children.every(valid)){blocked.add(selected);continue;}
      tiles.splice(best,1,...children.map(poly=>({poly})));
    }
    return tiles;
  }
  root.CellLayout={prepare,area,center,inset,regularInside,ring,frame,tiled,adaptive};
  if(typeof module!=='undefined')module.exports=root.CellLayout;
})(globalThis);
