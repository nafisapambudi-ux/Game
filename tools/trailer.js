// Records the 14-second cinematic trailer frame by frame from the real game.
// Usage: node tools/trailer.js frames
//        ffmpeg -framerate 30 -i frames/f%04d.jpg -c:v libx264 -crf 20 -pix_fmt yuv420p media/benteng-gurun-trailer.mp4
const {chromium}=require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs');
const OUT=process.argv[2]||'frames';fs.mkdirSync(OUT,{recursive:true});
const FPS=30, DUR=14, N=FPS*DUR;
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1.5});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+require('path').resolve(__dirname,'../index.html'));await p.waitForTimeout(600);
 await p.addStyleTag({content:'.hud,#mini,#quest,#toast,#banner,#ctx,#hint,#overlay{display:none!important}'});
 const info=await p.evaluate(async()=>{
  window.__cine=true;await document.fonts.ready;
  const g=window.__game;g.startWith(g.campCfg(2));const S=g.S,KX=27,KY=19;S.quest=99;
  S.res={gold:9999,wood:9999,stone:9999,food:9999};
  const near=(t,cx,cy)=>{for(let r=0;r<10;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;const i=cx+di,j=cy+dj;if(!g.canPlace(t,i,j))return [i,j];}return null;};
  const put=(t,x,y)=>{const a=near(t,x,y);if(a)g.addBuilding(t,a[0],a[1],true);return a;};
  // corner towers, then the curtain wall between them
  for(const [x,y] of [[KX-6,KY-6],[KX+6,KY-6],[KX-6,KY+7],[KX+6,KY+7]])if(!g.canPlace('tower',x,y))g.addBuilding('tower',x,y,true);
  for(let i=KX-6;i<=KX+7;i++)for(const j of [KY-6,KY+8]){if(!g.canPlace('wall',i,j))g.addBuilding('wall',i,j,true);}
  for(let j=KY-6;j<=KY+8;j++)for(const i of [KX-6,KX+7]){if(!g.canPlace('wall',i,j))g.addBuilding('wall',i,j,true);}
  if(!g.canPlace('gate',KX+7,KY+2))g.addBuilding('gate',KX+7,KY+2,true);
  // town inside
  for(const [t,x,y] of [['barracks',KX+3,KY-4],['house',KX-3,KY-4],['house',KX+4,KY+1],['market',KX-3,KY+5],['fountain',KX+3,KY+5],['house',KX-4,KY],['wood',KX+10,KY-2],['farm',KX+10,KY+3],['quarry',KX+10,KY+8]])put(t,x,y);
  // defenders
  for(let k=0;k<18;k++)g.spawnUnit('archer',0,KX+1+Math.random()*2,KY+4+Math.random());
  for(let k=0;k<10;k++)g.spawnUnit('spear',0,KX-2+Math.random()*2,KY+4+Math.random());
  for(let k=0;k<4;k++)g.spawnUnit('knight',0,KX+4+Math.random(),KY+4+Math.random());
  g.update(1/30);g.archersToWalls();
  const westWall=S.buildings.filter(b=>b.type==='wall'&&b.i===KX-6&&b.j>KY-4&&b.j<KY+6);
  const spears=S.units.filter(u=>u.team===0&&u.type==='spear');
  spears.forEach((u,ix)=>{const w=westWall[(ix*2)%westWall.length];if(w)u.order={k:w.j*44+w.i,x:w.i+.5,y:w.j+.5};});
  for(let k=0;k<30*10;k++)g.update(1/30);
  // the blue host
  const spawnSpot=()=>{for(let n=0;n<200;n++){const i=6+Math.random()*9,j=KY-6+Math.random()*13;if(!g.hard(i|0,j|0,1))return [i,j];}return [18,KY];};
  const army=[['spear',34],['archer',14],['knight',6],['ram',3],['ladder',5],['catapult',3]];
  for(const [t,n] of army)for(let k=0;k<n;k++){const [x,y]=spawnSpot();g.spawnUnit(t,1,t==='catapult'?x-2:x,y);}
  for(let k=0;k<30*2;k++)g.update(1/30);
  // battle damage for flames and smoke
  const ww=S.buildings.filter(b=>b.type==='wall'&&b.i===KX-6);ww.slice(2,4).forEach(b=>b.hp=b.maxhp*0.3);
  return {units:S.units.length,ladders:S.ladders.length,font:document.fonts.check('40px "IM Fell English SC"')};
 });
 console.log('scene',JSON.stringify(info));
 for(let f=0;f<N;f++){
  const url=await p.evaluate(({f,FPS,N})=>{
   const g=window.__game,S=g.S,cam=g.cam,KX=27,KY=19,t=f/FPS;
   const ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2,lerp=(a,b,k)=>a+(b-a)*k;
   g.update(1/30);g.update(1/30*0.5);
   // three shots: establishing push-in, wall-walk close-up, pull-back finale
   let x,y,z;
   if(t<4.6){const k=ease(t/4.6);x=lerp(19,23.5,k);y=lerp(22,20.5,k);z=lerp(0.62,0.9,k);}
   else if(t<9.4){const k=ease((t-4.6)/4.8);x=lerp(21.5,20.5,k);y=lerp(15.5,24.5,k);z=lerp(1.75,1.6,k);}
   else{const k=ease((t-9.4)/4.6);x=lerp(26,27,k);y=lerp(21,21.5,k);z=lerp(1.45,0.78,k);}
   g.centerOn(x,y);cam.z=z;
   g.render(performance.now()/1000);
   const cv=document.getElementById('cv'),c=cv.getContext('2d'),W=cv.width,H=cv.height;
   c.setTransform(1,0,0,1,0,0);
   // warm grade and vignette
   const vg=c.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(25,12,0,0.55)');c.fillStyle=vg;c.fillRect(0,0,W,H);
   c.fillStyle='rgba(255,170,60,0.06)';c.fillRect(0,0,W,H);
   // letterbox
   const bar=H*0.085;c.fillStyle='#0d0805';c.fillRect(0,0,W,bar);c.fillRect(0,H-bar,W,bar);
   // fades at shot cuts and ends
   const fadeAt=[0,4.6,9.4,14];let fade=0;for(const ft of fadeAt){const d=Math.abs(t-ft);if(d<0.35)fade=Math.max(fade,1-d/0.35);}
   // titles
   const title=(a,big,sub,yy)=>{if(a<=0)return;c.globalAlpha=a;c.textAlign='center';
     c.font=`${Math.round(H*0.12)}px "IM Fell English SC", Georgia, serif`;c.lineWidth=H*0.012;c.strokeStyle='rgba(40,15,5,.85)';c.strokeText(big,W/2,yy);
     const gr=c.createLinearGradient(0,yy-H*0.1,0,yy);gr.addColorStop(0,'#ffe9a8');gr.addColorStop(1,'#e2a948');c.fillStyle=gr;c.fillText(big,W/2,yy);
     c.font=`700 ${Math.round(H*0.033)}px "Alegreya Sans", sans-serif`;c.fillStyle='#f3e6c8';c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=H*0.01;
     c.fillText(sub,W/2,yy+H*0.065);c.shadowBlur=0;c.globalAlpha=1;};
   const a1=t<0.4?t/0.4:t<3.2?1:Math.max(0,1-(t-3.2)/0.6);
   title(a1,'Benteng Gurun','PERTAHANKAN OASIS DARI LASKAR PANJI BIRU',H*0.78);
   if(t>4.9&&t<8.8){const a=Math.min(1,(t-4.9)/0.4,(8.8-t)/0.4);c.globalAlpha=a;c.textAlign='left';c.font=`700 ${Math.round(H*0.03)}px "Alegreya Sans", sans-serif`;c.fillStyle='#f3e6c8';c.shadowColor='rgba(0,0,0,.9)';c.shadowBlur=H*0.012;c.fillText('Tangga di tembok. Tombak menjatuhkannya.',W*0.05,H-bar-H*0.04);c.shadowBlur=0;c.globalAlpha=1;}
   const a3=t<11.6?0:Math.min(1,(t-11.6)/0.6);
   title(a3,'Benteng Gurun','5 MISI · MAIN LANGSUNG DI BROWSER',H*0.5);
   if(fade>0){c.fillStyle=`rgba(13,8,5,${fade})`;c.fillRect(0,0,W,H);}
   return cv.toDataURL('image/jpeg',0.92);
  },{f,FPS,N});
  fs.writeFileSync(`${OUT}/f${String(f).padStart(4,'0')}.jpg`,Buffer.from(url.split(',')[1],'base64'));
  if(f%60===0)console.log('frame',f);
 }
 console.log('errors',errs);await b.close();})();
