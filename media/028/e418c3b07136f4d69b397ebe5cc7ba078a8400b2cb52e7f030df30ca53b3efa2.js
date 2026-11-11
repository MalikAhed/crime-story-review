(()=>{'use strict';
const P=JSON.parse(document.getElementById('player-data').textContent),MEDIA=JSON.parse(document.getElementById('embedded-media').textContent);
const $=s=>document.getElementById(s),stage=$('stage'),canvas=$('art'),ctx=canvas.getContext('2d',{alpha:false}),audio=$('narration'),caption=$('caption'),seek=$('seek'),controls=$('controls'),hint=$('hint'),play=$('play');
const images=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');let ready=false,dragging=false,hideTimer,paintKey='';
document.body.classList.toggle('portrait',P.aspect==='9:16');stage.style.setProperty('--ratio',P.aspect==='9:16'?9/16:16/9);seek.max=P.duration;audio.src=MEDIA.audio;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,q)=>a+(b-a)*q;
function time(){return clamp(audio.currentTime||0,0,P.duration)}
function shotAt(t){return P.shots.find(s=>t>=s.start&&t<s.end)||[...P.shots].reverse().find(s=>s.start<=t)||P.shots[0]}
function geometry(s,q){const a=s.sourceCrop,b=s.sourceCropEnd||a;return {x:mix(a.x,b.x,q),y:mix(a.y,b.y,q),width:mix(a.width,b.width,q),height:mix(a.width,b.width,q)/s.sourceAspectRatio}}
function image(path){const i=images.get(path);if(!i)throw Error('Missing embedded scene: '+path);return i}
function draw(){if(!ready)return;const t=time(),s=shotAt(t),p=clamp((t-s.start)/(s.end-s.start),0,1),q=reduced.matches?0:.8*p+.2*p*p*(3-2*p),c=geometry(s,q),w=canvas.width,h=canvas.height,scale=w/c.width;
ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#050609';ctx.fillRect(0,0,w,h);
if(s.route==='B'){const bg=image(s.plate),bp=s.backgroundStagePlacement||{left:0,top:0,scale:1};ctx.drawImage(bg,(bp.left-c.x)*scale,(bp.top-c.y)*scale,bg.naturalWidth*bp.scale*scale,bg.naturalHeight*bp.scale*scale);
const fg=image(s.foreground),reg=s.stageRegistration,v=reg.placement,dim=s.sourceImageDimensions,anchor=reg.anchor_percent_of_sprite;
const fw=v.width_percent*dim[0]/100*scale,fh=fw*fg.naturalHeight/fg.naturalWidth,left=(v.left_percent*dim[0]/100-c.x)*scale,top=(v.top_percent*dim[1]/100-c.y)*scale,ax=fw*anchor[0]/100,ay=fh*anchor[1]/100,m=s.motion||{},angle=reduced.matches?0:(m.oscillateDegrees||0)*Math.sin(2*Math.PI*(t-s.start)/(m.oscillatePeriodSeconds||5));
ctx.save();ctx.translate(left+ax,top+ay);ctx.rotate(angle*Math.PI/180);ctx.drawImage(fg,-ax,-ay,fw,fh);ctx.restore();
}else{const img=image(s.master);ctx.drawImage(img,-c.x*scale,-c.y*scale,img.naturalWidth*scale,img.naturalHeight*scale)}
const end=t>=P.duration-.001,cues=s.captionCues||[{start:s.start,end:s.end,text:s.sentence}],cue=cues.find(c=>t>=c.start&&t<c.end)||(end?cues.at(-1):null),text=cue?.text||'',cp=s.captionPosition||{left:8,width:84,bottom:P.aspect==='9:16'?18:9};
const key=s.id+'|'+text;if(paintKey!==key){caption.textContent=text;caption.style.left=cp.left+'%';caption.style.width=cp.width+'%';caption.style.bottom=cp.bottom+'%';paintKey=key}seek.value=t;$('time').textContent=format(t)+' / '+format(P.duration);play.textContent=audio.paused?'Play':'Pause';play.setAttribute('aria-label',audio.paused?'Play narration':'Pause narration');hint.classList.toggle('hidden',!audio.paused||t>0);stage.dataset.shot=s.id;stage.dataset.time=t.toFixed(6);
}
function format(t){const n=Math.floor(t);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')}
function reveal(){controls.classList.remove('idle');clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!audio.paused&&!dragging&&!controls.contains(document.activeElement))controls.classList.add('idle')},2000)}
async function doPlay(){if(!ready)return;if(time()>=P.duration-.005)audio.currentTime=0;try{await audio.play();reveal();draw()}catch(e){hint.classList.remove('hidden');throw e}}
function pause(){audio.pause();draw();reveal()}
function toggle(){audio.paused?doPlay().catch(console.error):pause()}
async function jump(v){const t=clamp(v,0,P.duration);if(t>=P.duration-.005)audio.pause();if(Math.abs(audio.currentTime-t)<.00001){draw();return}await new Promise(resolve=>{audio.addEventListener('seeked',resolve,{once:true});audio.currentTime=t});draw();reveal()}
function resize(){const r=stage.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);draw()}
function frame(){if(ready){if(audio.currentTime>=P.duration&&!audio.paused)audio.pause();draw()}requestAnimationFrame(frame)}
$('play').onclick=toggle;$('start').onclick=()=>jump(0);$('openPlay').onclick=()=>doPlay().catch(console.error);$('full').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();
seek.addEventListener('input',()=>{audio.currentTime=+seek.value;draw();reveal()});seek.addEventListener('pointerdown',()=>{dragging=true;reveal()});window.addEventListener('pointerup',()=>{dragging=false;reveal()});seek.addEventListener('focus',reveal);stage.addEventListener('pointermove',reveal);stage.addEventListener('pointerdown',reveal);stage.addEventListener('click',e=>{if(!e.target.closest('button,input,#controls'))toggle()});
document.addEventListener('keydown',e=>{if(e.target===seek){reveal();return}if(['Space','ArrowLeft','ArrowRight','Home','End'].includes(e.code))e.preventDefault();if(e.code==='Space')toggle();if(e.code==='ArrowLeft')jump(time()-5);if(e.code==='ArrowRight')jump(time()+5);if(e.code==='Home')jump(0);if(e.code==='End')jump(P.duration);if(e.code==='KeyF')$('full').click()});
for(const evt of ['play','pause','seeked','timeupdate','ended'])audio.addEventListener(evt,()=>{draw();if(audio.paused)reveal()});window.addEventListener('resize',resize);reduced.addEventListener('change',draw);
window.motionQA={ready:()=>ready,plan:()=>P,seek:jump,pause,play:doPlay,geometry,state:()=>{const t=time(),s=shotAt(t),p=clamp((t-s.start)/(s.end-s.start),0,1),q=reduced.matches?0:.8*p+.2*p*p*(3-2*p);return {time:t,audioTime:audio.currentTime,paused:audio.paused,duration:P.duration,mediaDuration:audio.duration,shot:s.id,caption:caption.textContent,reducedMotion:reduced.matches,imageCount:images.size,sourceCrop:geometry(s,q)}}};
Promise.all([Promise.all(Object.entries(MEDIA.images).map(async([path,url])=>{const img=new Image();img.src=url;await img.decode();images.set(path,img)})),new Promise((resolve,reject)=>{audio.addEventListener('loadedmetadata',resolve,{once:true});audio.addEventListener('error',()=>reject(Error('Embedded audio failed to decode')),{once:true});audio.load()})]).then(()=>{ready=true;resize();$('loading').remove();draw();reveal();requestAnimationFrame(frame)}).catch(e=>{$('loading').textContent='Unable to load this player.';console.error(e)});
})();
(()=>{const h=document.getElementById('review-status');function measure(){document.documentElement.style.setProperty('--review-h',Math.ceil(h.getBoundingClientRect().height)+'px');window.dispatchEvent(new Event('resize'));}new ResizeObserver(measure).observe(h);measure();const q=Number(new URL(location.href).searchParams.get('t'));if(Number.isFinite(q)&&q>0){const wait=setInterval(()=>{if(window.motionQA?.ready()){clearInterval(wait);motionQA.seek(q);}},50);}})();
