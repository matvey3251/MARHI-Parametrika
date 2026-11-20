(function(root){
  'use strict';
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
  class RhinoCamera{
    constructor(){this.target=[0,3,0];this.yaw=-.38;this.pitch=.55;this.distance=14;this.near=.01;}
    basis(){
      const s=Math.sin(this.yaw),c=Math.cos(this.yaw),p=Math.sin(this.pitch),q=Math.cos(this.pitch);
      return {right:[c,0,-s],up:[s*p,q,c*p],forward:[s*q,-p,c*q]};
    }
    focal(height){return Math.max(1,height)/(2*Math.tan(Math.PI/7.2));}
    reset(state){
      this.target=[0,3.5-state.drop/2,0];this.yaw=-.38;this.pitch=.55;
      this.distance=Math.hypot(state.width/2,state.length/2,state.drop+state.depth+.35)/Math.sin(Math.PI/7.2)*1.2;
    }
    space(point){
      const b=this.basis(),v=point.map((x,i)=>x-this.target[i]);
      return [dot(v,b.right),dot(v,b.up),dot(v,b.forward)+this.distance];
    }
    project(point,width,height,plan=false){
      if(plan){const scale=this.focal(height)/this.distance;return[width/2+(point[0]-this.target[0])*scale,height/2+(point[2]-this.target[2])*scale,10-point[1]];}
      return this.screen(this.space(point),width,height);
    }
    screen([x,y,depth],width,height){const scale=this.focal(height)/Math.max(this.near,depth);return[width/2+x*scale,height/2-y*scale,depth];}
    orbit(dx,dy){this.yaw+=dx*.006;this.pitch=Math.max(-Math.PI*.49,Math.min(Math.PI*.49,this.pitch+dy*.006));}
    pan(dx,dy,height,plan=false){
      const scale=this.distance/this.focal(height);
      if(plan){this.target[0]-=dx*scale;this.target[2]-=dy*scale;return;}
      const {right,up}=this.basis();
      this.target=this.target.map((v,i)=>v+(-right[i]*dx+up[i]*dy)*scale);
    }
    dolly(delta){this.distance=Math.max(.03,Math.min(2000,this.distance*Math.exp(Math.max(-1,Math.min(1,delta)))));}
    clip(points){
      const poly=points.map(p=>this.space(p)),out=[];
      poly.forEach((a,i)=>{
        const b=poly[(i+1)%poly.length],inside=a[2]>=this.near,next=b[2]>=this.near;
        if(inside)out.push(a);
        if(inside!==next){const t=(this.near-a[2])/(b[2]-a[2]);out.push(a.map((v,j)=>v+t*(b[j]-v)));}
      });
      return out;
    }
  }
  root.RhinoCamera=RhinoCamera;
  if(typeof module!=='undefined')module.exports=RhinoCamera;
})(globalThis);
