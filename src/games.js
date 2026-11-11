/* ---------------- 1. coin ---------------- */
GAMES.coin={id:'coin',rot:0,choiceLabel:'면 선택',
  choices:()=>[{label:'앞면',sub:'1.95x'},{label:'뒷면',sub:'1.95x'}],
  mount(st){st.innerHTML=`<div class="coin-scene"><div class="coin-shadow"></div><div class="coin" id="coin"><div class="cf cf-h">앞</div><div class="cf cf-t">뒤</div></div></div>`;this.rot=0;},
  async play(bet,pick){
    const r=resolve('coin',bet,()=>rnd()<oddsP('coin',.5)?pick:1-pick,o=>o===pick?Math.floor(bet*1.95):0);
    const c=$('#coin');const base=this.rot-(this.rot%360);this.rot=base+360*7+(r.o?180:0);
    c.classList.remove('coin-toss');void c.offsetWidth;c.classList.add('coin-toss');
    c.style.transform=`rotateX(${this.rot}deg)`;
    await wait(1850);
    banner(r.o?'뒷면':'앞면',r.pay>0?'win':'lose');
    return{pay:r.pay,fairPay:r.fairPay,manip:r.manip,text:r.o?'뒷면':'앞면'};
  }};

/* ---------------- 2. rps ---------------- */
const RPS=['✌️','✊','✋'],RPSN=['가위','바위','보'];
GAMES.rps={id:'rps',choiceLabel:'내 손',
  choices:()=>RPSN.map(n=>({label:n,html:`<b style="font-size:24px">${RPS[RPSN.indexOf(n)]}</b><small>${n}</small>`})),
  mount(st){st.innerHTML=`<div class="rps"><div class="side"><div class="hand l" id="hL">✊</div><span>나</span></div><div class="vs" id="rpsVs">VS</div><div class="side"><div class="hand r" id="hR">✊</div><span>하우스</span></div></div>`;},
  async play(bet,pick){
    const payOf=c=>{const d=(pick-c+3)%3;return d===0?bet:d===1?Math.floor(bet*1.95):0;};
    const r=resolve('rps',bet,()=>{const w=oddsP('rpsWin',1/3),d=oddsP('rpsDraw',1/3),u=rnd();return u<w?(pick+2)%3:u<w+d?pick:(pick+1)%3;},payOf);
    const L=$('#hL'),R=$('#hR'),vs=$('#rpsVs');L.textContent=R.textContent='✊';
    L.className='hand l shake';R.className='hand r shake';
    for(const w of['가위','바위','보!']){vs.textContent=w;await wait(400);}
    L.className='hand l reveal';R.className='hand r reveal';L.textContent=RPS[pick];R.textContent=RPS[r.o];
    const d=(pick-r.o+3)%3;vs.textContent=d===0?'무승부':d===1?'승리':'패배';
    banner(vs.textContent,d===1?'win':d===2?'lose':'win');
    await wait(500);
    return{pay:r.pay,fairPay:r.fairPay,manip:r.manip,text:'하우스 '+RPSN[r.o]};
  }};

/* ---------------- race engine (3. horse, 4. snail) ---------------- */
function startRace(o){
  // o: {n, winner, base, spread, kind, runners:[el], lanes:[el], names, onLead}
  const n=o.n,T=new Array(n),x=new Array(n).fill(0),f=new Array(n).fill(1),stopU=new Array(n).fill(0),burstU=new Array(n).fill(0),fin=new Array(n).fill(-1);
  let winner=o.winner;
  const plan=()=>{const tw=o.base+rnd()*o.spread*.3;for(let i=0;i<n;i++)T[i]=i===winner?tw:tw+.15+rnd()*o.spread;
    if(o.close!=null&&o.close!==winner)T[o.close]=tw+.04+rnd()*.07;};// near-miss: the picked runner loses by a nose
  plan();
  let t=0,last=performance.now(),firstFin=-1,resolveDone,leadTimer=0;
  const done=new Promise(r=>resolveDone=r);
  o.runners.forEach(r=>r.classList.add('go'));
  const width=()=>Math.max(60,o.lanes[0].clientWidth-32-44-40);
  function tick(now){
    const dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;
    for(let i=0;i<n;i++){
      if(fin[i]>=0)continue;
      const rem=T[i]-t;
      if(rem<=0){x[i]=1;fin[i]=t;if(firstFin<0)firstFin=i;o.runners[i].classList.remove('go','burst','stop');continue;}
      const avg=(1-x[i])/rem;
      f[i]+= (rnd()-.5)*(o.kind==='snail'?.12:.22); f[i]=Math.max(o.kind==='snail'?.7:.6,Math.min(o.kind==='snail'?1.3:1.45,f[i]));
      let eff=1+(f[i]-1)*Math.min(1,rem/1.5);
      if(o.kind==='snail'){
        if(stopU[i]>t){eff=0;}
        else if(burstU[i]>t){eff=2.6;}
        else if(rem>1.6){if(rnd()<.55*dt){stopU[i]=t+.4+rnd()*1;o.runners[i].classList.add('stop');}else if(rnd()<.22*dt){burstU[i]=t+.35+rnd()*.5;o.runners[i].classList.add('burst');}}
        if(stopU[i]<=t)o.runners[i].classList.remove('stop');
        if(burstU[i]<=t)o.runners[i].classList.remove('burst');
      }
      x[i]=Math.min(.995,x[i]+avg*eff*dt);
    }
    const w=width();
    for(let i=0;i<n;i++)o.runners[i].style.transform=`translateX(${x[i]*w}px)`;
    leadTimer+=dt;if(leadTimer>.3){leadTimer=0;let li=0;for(let i=1;i<n;i++)if(x[i]>x[li])li=i;o.onLead&&o.onLead(li);}
    if(firstFin>=0&&!api.finished){api.finished=true;api.winner=firstFin;o.onFinish&&o.onFinish(firstFin);setTimeout(()=>resolveDone(firstFin),900);}
    if(fin.every(v=>v>=0))return;
    requestAnimationFrame(tick);
  }
  const api={finished:false,winner:null,done,
    get leader(){let li=0;for(let i=1;i<n;i++)if(x[i]>x[li])li=i;return li},
    setWinner(w){ // house overrides the result mid-race
      if(api.finished||w===winner||Math.max(...x)>.94)return false;
      let minRem=Infinity;for(let i=0;i<n;i++)minRem=Math.min(minRem,T[i]-t);
      const tw=t+Math.max(1.3,minRem-.2);winner=w;T[w]=tw;
      for(let i=0;i<n;i++)if(i!==w&&T[i]<tw+.12)T[i]=tw+.12+rnd()*.8;
      stopU[w]=0;return true;}
  };
  requestAnimationFrame(tick);
  return api;
}
function raceGame(cfg){
  return{id:cfg.id,listChoices:true,choiceLabel:cfg.choiceLabel,
    field:null,
    newField(){this.field=cfg.makeField();},
    choices(){if(!this.field||!this.field.length)this.newField();return this.field.map((h,i)=>({label:h.name,html:cfg.choiceHtml(h,i)}));},
    mount(st,extra){
      if(!this.field||!this.field.length)this.newField();
      st.innerHTML=`<div class="track ${cfg.id==='snail'?'snail':''}"><div class="finish"></div>${this.field.map((h,i)=>`<div class="lane" data-i="${i}"><span class="no" style="background:${h.color}">${i+1}</span><div class="runner"><i>${cfg.glyph}</i></div></div>`).join('')}<div class="photo"></div><div class="commentary" id="comm">출발 대기 중</div></div>`;
      if(cfg.extra)extra.innerHTML=cfg.extra();
    },
    async play(bet,pick){
      const F=this.field;const payOf=w=>w===pick?Math.floor(bet*F[w].odds):0;
      const r=resolve(cfg.id,bet,()=>{let u=rnd();for(let i=0;i<F.length;i++){u-=F[i].p;if(u<=0)return i;}return F.length-1;},payOf);
      commitRound(r.pay,r.manip,r.fairPay,r.o);
      const lanes=[...stage.querySelectorAll('.lane')],runners=lanes.map(l=>l.querySelector('.runner'));
      lanes.forEach((l,i)=>l.classList.toggle('mine',i===pick));
      const comm=$('#comm');
      for(const c of['3','2','1','출발!']){comm.textContent=c;await wait(450);}
      let manip=r.manip;
      const race=startRace({n:F.length,winner:r.o,close:nm(cfg.id)&&r.o!==pick?pick:null,base:cfg.base,spread:cfg.spread,kind:cfg.id,runners,lanes,
        onLead:li=>{comm.textContent='선두: '+(li+1)+'번 '+F[li].name;liveText='선두 '+(li+1)+'번 '+F[li].name+' / 선택 '+(pick+1)+'번';pushPresence();},
        onFinish:w=>{stage.querySelector('.photo').classList.add('flash');lanes[w].classList.add('winner');comm.textContent='우승: '+(w+1)+'번 '+F[w].name;}});
      this.liveOverride=(want)=>{
        const lead=race.leader;let nw;
        if(want==='lose'){if(race.winner===pick||true){const others=F.map((_,i)=>i).filter(i=>i!==pick);nw=others.includes(lead)?lead:others[Math.floor(rnd()*others.length)];}}
        else nw=pick;
        if(race.setWinner(nw)){manip=true;commitRound(payOf(nw),payOf(nw)!==r.fairPay,r.fairPay,nw);}
      };
      const w=await race.done;this.liveOverride=null;
      banner((w+1)+'번 우승',w===pick?'win':'lose');
      return{pay:payOf(w),fairPay:r.fairPay,manip:manip&&payOf(w)!==r.fairPay,text:(w+1)+'번 '+F[w].name+' 우승',winner:w};
    },
    after(){this.pendingRefresh=true;setTimeout(()=>{if(this.pendingRefresh)this.refresh();},1800);},
    refresh(){if(busy||cur!==this)return;this.pendingRefresh=false;this.newField();choice=null;renderChoices();this.mount(stage,$('#gExtra'));}
  };
}
const HORSE_NAMES=['번개발굽','흑진주','바람돌이','적토마','은하수','꼬마별','철갑기사','새벽안개','황금마차','폭풍질주','달빛소나타','청룡'];
const COLORS=['#c9a560','#c7776f','#6f9fbf','#7fa877','#a58cc0','#c99561'];
function stableField(kind){
  const list=(STABLE&&STABLE[kind])||[];
  return list.map((h,i)=>({name:h.name,p:h.p,runs:h.runs||0,wins:h.wins||0,odds:Math.floor(0.95/h.p*100)/100,color:COLORS[i%COLORS.length]}));
}
const runnerHtml=h=>`<span style="width:12px;height:12px;border-radius:50%;background:${h.color}"></span><span><b>${esc(h.name)}</b><div class="hint">${h.runs}판 중 ${h.wins}승 · 이번 판 승률 ${(h.p*100).toFixed(1)}%</div><div class="bar"><i style="width:${Math.min(100,h.p/0.6*100).toFixed(0)}%"></i></div></span><small style="font-size:15px">${h.odds.toFixed(2)}x</small>`;
GAMES.horse=raceGame({id:'horse',glyph:'🏇',choiceLabel:'우승마 선택',base:6.2,spread:1.8,
  makeField:()=>stableField('horse'),choiceHtml:runnerHtml,
  extra:()=>`<div class="hint">이긴 말은 다음 판 승률이 내려가고, 진 말은 올라갑니다. 배당 = 0.95 ÷ 이번 판 승률.</div>`
});
GAMES.snail=raceGame({id:'snail',glyph:'🐌',choiceLabel:'달팽이 선택',base:9,spread:2.6,
  makeField:()=>stableField('snail'),choiceHtml:runnerHtml,
  extra:()=>`<div class="hint">이긴 달팽이는 다음 판 승률이 내려가고, 진 달팽이는 올라갑니다. 가끔 멈추거나 갑자기 빨라집니다.</div>`
});

/* ---------------- 5. odd/even ---------------- */
const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
function dieHTML(id){return`<div class="die" id="${id}">${'<i></i>'.repeat(9)}</div>`;}
function setDie(el,n){el.querySelectorAll('i').forEach((p,k)=>p.classList.toggle('on',PIPS[n].includes(k)));el.classList.toggle('red',n===1);}
GAMES.oddeven={id:'oddeven',choiceLabel:'홀 / 짝',
  choices:()=>[{label:'홀',sub:'1.95x'},{label:'짝',sub:'1.95x'}],
  mount(st){st.innerHTML=`<div class="dice-scene"><div><div class="dice-row">${dieHTML('d1')}${dieHTML('d2')}</div><div class="dice-sum" id="dsum">주사위를 굴리세요</div></div></div>`;setDie($('#d1'),3);setDie($('#d2'),4);},
  async play(bet,pick){
    const r=resolve('oddeven',bet,()=>{const want=rnd()<oddsP('oddeven',.5);for(let i=0;i<60;i++){const d=[1+Math.floor(rnd()*6),1+Math.floor(rnd()*6)];if((((d[0]+d[1])%2===1?0:1)===pick)===want)return d;}return[1,2];},o=>((o[0]+o[1])%2===1?0:1)===pick?Math.floor(bet*1.95):0);
    const a=$('#d1'),b=$('#d2'),sum=$('#dsum');sum.textContent='…';
    a.className='die roll';b.className='die roll';
    const iv=setInterval(()=>{setDie(a,1+Math.floor(rnd()*6));setDie(b,1+Math.floor(rnd()*6));},70);
    await wait(1000);clearInterval(iv);a.className='die land';setDie(a,r.o[0]);await wait(250);b.className='die land';setDie(b,r.o[1]);
    const s=r.o[0]+r.o[1];sum.textContent=`${r.o[0]} + ${r.o[1]} = ${s} (${s%2?'홀':'짝'})`;
    await wait(350);banner(s%2?'홀':'짝',r.pay>0?'win':'lose');
    return{pay:r.pay,fairPay:r.fairPay,manip:r.manip,text:`합 ${s} ${s%2?'홀':'짝'}`};
  }};

/* ---------------- 6. baccarat ---------------- */
const SUITS=['♠','♥','♦','♣'],RANKS=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const bv=c=>c.r>=10?0:c.r;const bsc=h=>h.reduce((s,c)=>s+bv(c),0)%10;
function bacDeal(shoe){
  const d=()=>shoe.pop();const P=[d()],B=[d()];P.push(d());B.push(d());
  let ps=bsc(P),bs=bsc(B),p3=null;
  if(ps<8&&bs<8){
    if(ps<=5){p3=d();P.push(p3);}
    if(p3===null){if(bs<=5)B.push(d());}
    else{const x=bv(p3);const draw=bs<=2||(bs===3&&x!==8)||(bs===4&&x>=2&&x<=7)||(bs===5&&x>=4&&x<=7)||(bs===6&&(x===6||x===7));if(draw)B.push(d());}
  }
  return{P,B,ps:bsc(P),bs:bsc(B)};
}
// play-it-yourself baccarat: the same six cards give both branches of the one real choice (draw or stand on 5)
function bacFrom(seq,draw5){
  const P=[seq[0],seq[2]],B=[seq[1],seq[3]];let i=4;const ps=bsc(P),bs=bsc(B);let p3=null;
  if(ps<8&&bs<8){
    if(ps<=4||(ps===5&&draw5)){p3=seq[i++];P.push(p3);}
    if(p3===null){if(bs<=5)B.push(seq[i++]);}
    else{const x=bv(p3);const draw=bs<=2||(bs===3&&x!==8)||(bs===4&&x>=2&&x<=7)||(bs===5&&x>=4&&x<=7)||(bs===6&&(x===6||x===7));if(draw)B.push(seq[i++]);}
  }
  return{P,B,ps:bsc(P),bs:bsc(B),used:i};
}
function cardEl(c,third){const red=c.s===1||c.s===2;const d=document.createElement('div');d.className='card deal'+(third?' third':'');
  d.innerHTML=`<div class="in"><div class="f ${red?'red':''}"><span class="r">${RANKS[c.r]}</span><span class="s">${SUITS[c.s]}</span></div><div class="b"></div></div>`;return d;}
GAMES.baccarat={id:'baccarat',shoe:[],mode:'bet',choiceLabel:'베팅 위치',
  choices(){return this.mode==='play'?[]:[{label:'플레이어',sub:'2x'},{label:'뱅커',sub:'1.95x'},{label:'타이',sub:'9x'}];},
  newShoe(){const s=[];for(let k=0;k<8;k++)for(let su=0;su<4;su++)for(let r=1;r<=13;r++)s.push({r,s:su});this.shoe=shuffle(s);},
  mount(st,extra){if(this.shoe.length<60)this.newShoe();
    st.innerHTML=`<div class="bac"><div class="zone" id="zP"><h3>플레이어</h3><div class="score" id="sP">–</div><div class="hand-cards" id="cP"></div></div><div class="zone" id="zB"><h3>뱅커</h3><div class="score" id="sB">–</div><div class="hand-cards" id="cB"></div></div><div class="bac-msg" id="bacMsg"></div><div class="bj-act" id="bacAct" hidden><button type="button" class="btn" data-a="draw">한 장 더 받기</button><button type="button" class="btn" data-a="stand">멈추기</button></div><div class="shoe-info" id="shoeInfo"></div></div>`;
    this.info();extra.innerHTML=`<div class="seg" role="group" aria-label="바카라 방식" style="margin-bottom:8px"><button type="button" data-m="bet" aria-pressed="${this.mode==='bet'}">승부 맞히기</button><button type="button" data-m="play" aria-pressed="${this.mode==='play'}">직접 플레이</button></div>
      <div class="hint">${this.mode==='play'?'당신이 플레이어 자리에 앉아 뱅커(하우스)와 겨룹니다. 내 카드는 직접 눌러서 엽니다. 이기면 2배, 비기면 원금 반환. 합이 0~4면 자동으로 한 장 더 받고, 6~7이면 멈추며, <b>합이 5일 때만</b> 더 받을지 직접 고릅니다. 뱅커는 정해진 규칙대로 받습니다. 고르는 도중에 나가면 한 장 더 받은 것으로 정산됩니다.':'타이가 나오면 플레이어·뱅커 베팅은 원금을 돌려받습니다. 뱅커 승리 배당에는 5% 수수료가 붙습니다.'}</div>`;
    extra.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{if(busy)return;this.mode=b.dataset.m;choice=null;renderChoices();this.mount(stage,$('#gExtra'));setPlayBtn();});},
  info(){const el=$('#shoeInfo');if(el)el.textContent=`8덱 슈 · 남은 카드 ${this.shoe.length}장`;},
  async playSelf(bet){
    const self=this;let seq=null;
    const gen=()=>{if(seq){self.shoe.push(...seq);shuffle(self.shoe);}seq=self.shoe.splice(-6).reverse();return{seq,h:bacFrom(seq,true)};};
    const payFor=h=>h.ps>h.bs?bet*2:h.ps===h.bs?bet:0;
    const r=resolve('baccarat',bet,gen,o=>payFor(o.h));let h=r.o.h;const cards=r.o.seq;
    const cP=$('#cP'),cB=$('#cB'),sP=$('#sP'),sB=$('#sB'),msg=$('#bacMsg'),act=$('#bacAct');cP.innerHTML=cB.innerHTML='';sP.textContent=sB.textContent='–';msg.textContent='';
    $('#zP').classList.remove('won');$('#zB').classList.remove('won');
    const put=async(zone,c,third)=>{const el=cardEl(c,third);zone.appendChild(el);await wait(330);return el;};
    const open=async(el)=>{el.classList.add('open');await wait(380);};
    // deal: both hands face down, the player turns their own cards
    const p1=await put(cP,h.P[0]),b1=await put(cB,h.B[0]),p2=await put(cP,h.P[1]),b2=await put(cB,h.B[1]);
    const mine=async(el,shown)=>{el.classList.add('mine');await new Promise(res=>{const t=setTimeout(res,6000);el.onclick=()=>{clearTimeout(t);res();};});el.onclick=null;el.classList.remove('mine');await open(el);sP.textContent=bsc(shown);};
    msg.textContent='내 카드를 눌러서 여세요';liveText='카드 확인 중';pushPresence();
    await mine(p1,[h.P[0]]);await mine(p2,h.P.slice(0,2));
    msg.textContent='';await open(b1);sB.textContent=bsc([h.B[0]]);await open(b2);sB.textContent=bsc(h.B.slice(0,2));
    const ps2=bsc(h.P.slice(0,2)),bs2=bsc(h.B.slice(0,2));let chose='';
    if(ps2>=8||bs2>=8){banner('내추럴',ps2>bs2?'win':'lose');await wait(600);}
    else if(ps2===5){
      msg.textContent='합이 5입니다. 한 장 더 받을까요?';act.hidden=false;liveText='합 5 · 고르는 중';pushPresence();
      const a=await new Promise(res=>{const t=setTimeout(()=>res('draw'),20000);act.onclick=e=>{const b=e.target.closest('[data-a]');if(b){clearTimeout(t);res(b.dataset.a);}};});
      act.hidden=true;act.onclick=null;msg.textContent='';chose=a==='stand'?' (멈춤)':' (받음)';
      if(a==='stand'){h=bacFrom(cards,false);commitRound(payFor(h),r.manip,r.fairPay);}
    }
    if(h.P[2]){await wait(250);const el=await put(cP,h.P[2],true);await open(el);sP.textContent=bsc(h.P);}
    if(h.B[2]){await wait(250);const el=await put(cB,h.B[2],true);await open(el);sB.textContent=bsc(h.B);}
    self.shoe.push(...cards.slice(h.used));
    const pay=payFor(h),w=h.ps>h.bs?0:h.bs>h.ps?1:2;
    if(w!==1)$('#zP').classList.add('won');if(w!==0)$('#zB').classList.add('won');
    await wait(200);banner(['승리','뱅커 승','타이 · 원금 반환'][w],pay>=bet?'win':'lose');this.info();
    return{pay,fairPay:r.fairPay,manip:r.manip&&pay!==r.fairPay,text:`${h.ps} : ${h.bs} ${['내가 승리','뱅커 승','타이'][w]}${chose}`};
  },
  async play(bet,pick){
    if(this.shoe.length<60){this.newShoe();toast('새 슈를 셔플했습니다');}
    if(this.mode==='play')return this.playSelf(bet);
    let drawn=null;const self=this;
    const gen=()=>{if(drawn){self.shoe.push(...drawn);shuffle(self.shoe);}const before=self.shoe.slice(-8);const h=bacDeal(self.shoe);drawn=[...h.P,...h.B];return h;};
    const payOf=h=>{const w=h.ps>h.bs?0:h.bs>h.ps?1:2;if(w===2)return pick===2?bet*9:(pick===2?0:bet);return pick===w?(w===0?bet*2:Math.floor(bet*1.95)):0;};
    const r=resolve('baccarat',bet,gen,payOf);const h=r.o;
    const cP=$('#cP'),cB=$('#cB'),sP=$('#sP'),sB=$('#sB');cP.innerHTML=cB.innerHTML='';sP.textContent=sB.textContent='–';
    $('#zP').classList.remove('won');$('#zB').classList.remove('won');
    const flip=async(zone,c,third,scEl,cards)=>{const el=cardEl(c,third);zone.appendChild(el);await wait(380);el.classList.add('open');await wait(420);scEl.textContent=bsc(cards);};
    await flip(cP,h.P[0],false,sP,[h.P[0]]);await flip(cB,h.B[0],false,sB,[h.B[0]]);
    await flip(cP,h.P[1],false,sP,h.P.slice(0,2));await flip(cB,h.B[1],false,sB,h.B.slice(0,2));
    const nat=bsc(h.P.slice(0,2))>=8||bsc(h.B.slice(0,2))>=8;
    if(nat){banner('내추럴','win');await wait(700);}
    if(h.P[2]){await wait(300);await flip(cP,h.P[2],true,sP,h.P);}
    if(h.B[2]){await wait(300);await flip(cB,h.B[2],true,sB,h.B);}
    const w=h.ps>h.bs?0:h.bs>h.ps?1:2;
    if(w!==1)$('#zP').classList.toggle('won',w===0||w===2);if(w!==0)$('#zB').classList.toggle('won',w===1||w===2);
    await wait(200);banner(['플레이어 승','뱅커 승','타이'][w],r.pay>bet?'win':r.pay===bet?'win':'lose');
    this.info();
    return{pay:r.pay,fairPay:r.fairPay,manip:r.manip,text:`${h.ps} : ${h.bs} ${['플레이어','뱅커','타이'][w]}`};
  }};

/* ---------------- 7. slots ---------------- */
// RTP = Σ p³·pay3 + P(exactly two cherries)·0.5 = .32+.15625+.1458+.12096+.0625+.144 = 0.9495
const SYM=['cherry','lemon','bell','star','seven'],SP=[.40,.25,.18,.12,.05],PAY3=[5,10,25,70,500],CHERRY2=.5,SNAME=['체리','레몬','종','별','7'];
const SVG={
  cherry:`<svg viewBox="0 0 64 64"><path d="M30 8c-2 12-10 20-14 28M30 8c4 10 12 18 16 26" stroke="#2f8a3a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M30 8c8-4 16-2 20 2-6 4-14 4-20-2z" fill="#3fae4c"/><circle cx="16" cy="44" r="12" fill="#d2261c"/><circle cx="46" cy="42" r="12" fill="#e2382c"/><circle cx="12" cy="40" r="3.5" fill="#fff8"/><circle cx="42" cy="38" r="3.5" fill="#fff8"/></svg>`,
  lemon:`<svg viewBox="0 0 64 64"><ellipse cx="32" cy="34" rx="24" ry="18" fill="#f4d21f" transform="rotate(-20 32 34)"/><path d="M8 42l-4 4M56 26l4-4" stroke="#d1aa0c" stroke-width="5" stroke-linecap="round"/><ellipse cx="24" cy="28" rx="7" ry="4" fill="#fff6" transform="rotate(-20 24 28)"/></svg>`,
  bell:`<svg viewBox="0 0 64 64"><path d="M32 6c-12 0-18 10-18 22v12l-6 8h48l-6-8V28C50 16 44 6 32 6z" fill="#e8a91f" stroke="#9b6a0c" stroke-width="2"/><circle cx="32" cy="54" r="6" fill="#9b6a0c"/><path d="M22 22c2-6 6-9 10-9" stroke="#fff8" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
  star:`<svg viewBox="0 0 64 64"><path d="M32 4l8.5 18.5L60 24l-15 13.5L49 58 32 47.5 15 58l4-20.5L4 24l19.5-1.5z" fill="#3c8de0" stroke="#1d5aa0" stroke-width="2" stroke-linejoin="round"/><path d="M26 22l6-11" stroke="#fff9" stroke-width="3" stroke-linecap="round"/></svg>`,
  seven:`<svg viewBox="0 0 64 64"><text x="32" y="54" text-anchor="middle" font-family="Black Han Sans, Impact, sans-serif" font-size="60" fill="#d2261c" stroke="#7a1410" stroke-width="2.5">7</text></svg>`
};
function pickSym(){let u=rnd();for(let i=0;i<SP.length;i++){u-=SP[i];if(u<=0)return i;}return 4;}
function slotPay(o,bet){if(o[0]===o[1]&&o[1]===o[2])return Math.floor(bet*PAY3[o[0]]);const c=o.filter(v=>v===0).length;return c===2?Math.floor(bet*CHERRY2):0;}
GAMES.slot={id:'slot',vis:null,playLabel:'스핀',
  choices:()=>[],
  mount(st,extra){
    if(!this.vis)this.vis=[0,1,2].map(()=>[pickSym(),pickSym(),pickSym()]);
    st.innerHTML=`<div class="slot-scene"><div><div class="machine" id="mach"><div class="lights">${'<i></i>'.repeat(9)}</div><div class="reels">${[0,1,2].map(i=>`<div class="reel" id="reel${i}"><div class="strip">${this.vis[i].map(s=>`<div class="sym">${SVG[SYM[s]]}</div>`).join('')}</div></div>`).join('')}</div><div class="machine-label">LUCKY 7</div></div></div></div>`;
    extra.innerHTML=`<table class="paytable"><tr><td>7 7 7</td><td>500x</td></tr><tr><td>별 별 별</td><td>70x</td></tr><tr><td>종 종 종</td><td>25x</td></tr><tr><td>레몬 레몬 레몬</td><td>10x</td></tr><tr><td>체리 체리 체리</td><td>5x</td></tr><tr><td>체리 2개</td><td>0.5x</td></tr></table><div class="hint" style="margin-top:6px">심볼 확률: 체리 40% · 레몬 25% · 종 18% · 별 12% · 7 5%</div>`;
  },
  async play(bet){
    const r=resolve('slot',bet,()=>[pickSym(),pickSym(),pickSym()],o=>slotPay(o,bet));
    const o=r.o;const mach=$('#mach');mach.classList.remove('won');mach.classList.add('spin');
    let nearMiss=false;
    if(nm('slot')&&r.pay<bet&&rnd()<.6){o[0]=4;o[1]=4;if(o[2]===4)o[2]=3;nearMiss=true;}
    const final=o.map(v=>v);
    const vis=[0,1,2].map(i=>[nearMiss&&i===2?4:pickSym(),final[i],pickSym()]);
    const sz=$('#reel0').clientWidth;const proms=[];
    for(let i=0;i<3;i++){
      const reel=$('#reel'+i),strip=reel.querySelector('.strip');
      const N=24+i*8+(nearMiss&&i===2?14:0);
      const syms=[...this.vis[i]];for(let k=0;k<N;k++)syms.push(pickSym());syms.push(...vis[i]);
      strip.innerHTML=syms.map(s=>`<div class="sym">${SVG[SYM[s]]}</div>`).join('');
      strip.style.transition='none';strip.style.transform='translateY(0)';void strip.offsetWidth;
      const dur=1.3+i*.45+(nearMiss&&i===2?1.1:0);
      strip.style.transition=`transform ${dur}s cubic-bezier(.12,.6,.22,1.04)`;
      strip.style.transform=`translateY(${-(syms.length-3)*sz}px)`;
      proms.push(wait(dur*1000));
    }
    await Promise.all(proms);
    this.vis=vis;
    for(let i=0;i<3;i++){const strip=$('#reel'+i+' .strip');strip.style.transition='none';strip.innerHTML=vis[i].map(s=>`<div class="sym">${SVG[SYM[s]]}</div>`).join('');strip.style.transform='translateY(0)';}
    mach.classList.remove('spin');
    const pay=slotPay(final,bet);
    if(pay>0){mach.classList.add('won');banner(pay>=bet?'잭팟!':'당첨!','win');}
    else if(nearMiss)banner('아깝다!','lose');
    return{pay,fairPay:r.fairPay,manip:r.manip,text:final.map(v=>SNAME[v]).join(' ')};
  }};

/* ---------------- 8. crash ---------------- */
GAMES.crash={id:'crash',running:false,m:1,playLabel:'베팅하고 시작',
  choices:()=>[],
  mount(st,extra){
    st.innerHTML=`<div class="crash"><canvas id="cv"></canvas><div class="mult" id="cm">1.00x</div></div>`;
    extra.innerHTML=`<div><label class="lbl" for="autoCo" style="font-size:12px;color:var(--mute)">자동 캐시아웃 배율 (비우면 끔) · ${this.minOut().toFixed(2)}x부터 캐시아웃 가능</label><div class="amt-row" style="margin-top:4px"><input id="autoCo" type="number" min="1.01" step="0.01" placeholder="예: 2.00"><span class="num">x</span></div></div><div><div style="font-size:12px;color:var(--mute);margin:8px 0 4px">최근 10판 터진 배율</div><div class="crash-hist" id="chist"></div></div>`;
    const a=LS.get('he.auto','');$('#autoCo').value=a;$('#autoCo').addEventListener('change',e=>LS.set('he.auto',e.target.value));
    this.hist();requestAnimationFrame(()=>this.draw(0,1,false));
  },
  hist(){const el=$('#chist');if(!el)return;const h=(S.crashHist||[]).slice(-10).reverse();el.innerHTML=h.length?h.map(v=>`<span class="${v<1.5?'lo':v<3?'mid':'hi'}">${v.toFixed(2)}x</span>`).join(''):'<span class="hint">기록 없음</span>';},
  draw(t,m,bust,parts){
    const cv=$('#cv');if(!cv)return;const dpr=window.devicePixelRatio||1;const W=cv.clientWidth,H=cv.clientHeight;
    if(cv.width!==W*dpr){cv.width=W*dpr;cv.height=H*dpr;}const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
    const L=44,B=30,R=16,Tp=16;const xmax=Math.max(8,t*1.15),ymax=Math.max(2,m*1.15);
    const X=s=>L+(W-L-R)*s/xmax,Y=v=>H-B-(H-B-Tp)*(v-1)/(ymax-1);
    g.font='11px DM Mono, monospace';g.fillStyle='#ffffff88';g.strokeStyle='#ffffff18';g.lineWidth=1;
    const ys=[1,1.5,2,3,5,10,20,50,100,200,500,1000].filter(v=>v<=ymax);
    for(const v of ys){g.beginPath();g.moveTo(L,Y(v));g.lineTo(W-R,Y(v));g.stroke();g.fillText(v.toFixed(v<10?1:0)+'x',4,Y(v)+4);}
    const step=xmax>30?10:xmax>15?5:2;for(let s=0;s<=xmax;s+=step){g.fillText(s+'s',X(s)-6,H-10);}
    if(t>0){
      g.beginPath();g.moveTo(X(0),Y(1));const n=80;for(let k=1;k<=n;k++){const s=t*k/n;g.lineTo(X(s),Y(Math.exp(K*s*1000)));}
      const col=bust?'#b4473e':'#c9a560';
      g.lineTo(X(t),H-B);g.lineTo(X(0),H-B);g.closePath();g.fillStyle=bust?'#b4473e22':'#c9a56022';g.fill();
      g.beginPath();g.moveTo(X(0),Y(1));for(let k=1;k<=n;k++){const s=t*k/n;g.lineTo(X(s),Y(Math.exp(K*s*1000)));}
      g.strokeStyle=col;g.lineWidth=3;g.stroke();
      if(!bust){g.beginPath();g.arc(X(t),Y(m),6,0,7);g.fillStyle='#fff';g.fill();}
    }
    if(parts)for(const p of parts){g.globalAlpha=Math.max(0,p.l);g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,p.r,0,7);g.fill();}
    g.globalAlpha=1;this.tip={x:X(t),y:Y(m)};
  },
  minOut(){const v=+CFG.crashMin;return v>=1?v:1.1;},
  cashout(){if(this.running&&!this.out){if(this.m<this.minOut()){toast(this.minOut().toFixed(2)+'x부터 캐시아웃할 수 있습니다');return;}this.out=this.m;}},
  async play(bet){
    let U=rnd();let crash=0.97/(1-U);crash=crash<1?1:Math.floor(crash*100)/100;const cap=+CFG.crashCap||0;if(cap>=1.01)crash=Math.min(crash,cap);const fair=crash;
    let auto=parseFloat(($('#autoCo')||{}).value)||0;if(auto&&auto<this.minOut())auto=this.minOut();const b=bias('crash');let manip=false;
    if(b<0&&rnd()<-b){const c=auto>1.01?Math.max(1,Math.floor((auto-0.01-rnd()*.4)*100)/100):Math.floor((1+rnd()*.3)*100)/100;if(c<crash){crash=c;manip=true;}}
    else if(b>0&&rnd()<b){const c=auto>1.01?Math.floor((auto+0.05+rnd()*1.5)*100)/100:Math.floor((2+rnd()*4)*100)/100;if(c>crash){crash=c;manip=true;}}
    this.crash=crash;this.out=0;this.m=1;this.running=true;
    const cm=$('#cm');cm.className='mult';
    this.liveOverride=(want)=>{if(!this.running||this.out)return;if(want==='lose'){this.crash=this.m;manip=true;}else{this.crash=Math.max(this.crash,auto>1.01?auto+0.05:1000);manip=true;}};
    const t0=performance.now();let lastBtn=0,lastPres=0;
    const result=await new Promise(res=>{
      const loop=(now)=>{
        const ms=now-t0;let m=Math.floor(Math.exp(K*ms)*100)/100;
        if(this.crash<=1){m=1;}
        if(auto>1.01&&!this.out&&m>=auto&&auto<this.crash){this.out=auto;}
        if(this.out){this.m=this.out;this.running=false;return res({out:this.out,t:ms/1000});}
        if(m>=this.crash){this.m=this.crash;this.running=false;return res({bust:this.crash,t:Math.log(this.crash)/K/1000});}
        this.m=m;cm.textContent=m.toFixed(2)+'x';this.draw(ms/1000,m,false);
        if(now-lastBtn>80){lastBtn=now;setPlayBtn();}
        if(now-lastPres>250){lastPres=now;liveText='비행 중 '+m.toFixed(2)+'x';pushPresence();}
        requestAnimationFrame(loop);
      };requestAnimationFrame(loop);
    });
    setPlayBtn();
    S.crashHist=(S.crashHist||[]).concat([this.crash]).slice(-10);save();
    if(result.out){
      cm.textContent=result.out.toFixed(2)+'x';cm.className='mult out';this.draw(result.t,result.out,false);banner(result.out.toFixed(2)+'x 캐시아웃','win');
      // keep the line running to show where it would have crashed
      const pay=Math.floor(bet*result.out);
      await this.ghost(result.t,result.out);
      this.hist();
      const fp=fair>result.out?pay:0;
      return{pay,fairPay:fp,manip:manip&&fp!==pay,text:result.out.toFixed(2)+'x 캐시아웃 (터진 지점 '+this.crash.toFixed(2)+'x)'};
    }
    cm.textContent=result.bust.toFixed(2)+'x';cm.className='mult bust';
    await this.explode(result.t,result.bust);
    this.hist();
    const fp=(auto>1.01&&fair>auto)?Math.floor(bet*auto):0;
    return{pay:0,fairPay:fp,manip:manip&&this.crash!==fair,text:result.bust.toFixed(2)+'x에서 터짐'};
  },
  async ghost(t,out){ // after cashout, the curve continues to the bust point
    const cm=$('#cm');const tc=Math.log(this.crash)/K/1000;let tt=t;const sp=Math.max(1,(tc-t)/1.2);
    while(tt<tc&&tt-t<4){tt+=1/60*sp;const m=Math.min(this.crash,Math.exp(K*tt*1000));this.draw(tt,m,false);await wait(16);}
    await this.explode(Math.min(tt,tc),this.crash,true);cm.textContent=out.toFixed(2)+'x';
  },
  async explode(t,m,quiet){
    this.draw(t,m,true);const tip=this.tip;const parts=[];
    for(let i=0;i<46;i++){const a=rnd()*Math.PI*2,s=1+rnd()*5;parts.push({x:tip.x,y:tip.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:2+rnd()*4,l:1,c:['#b4473e','#c99561','#c9a560','#fff'][i%4]});}
    if(!quiet)banner('펑!','lose');
    for(let k=0;k<45;k++){for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=.12;p.l-=.022;}this.draw(t,m,true,parts);await wait(16);}
    this.draw(t,m,true);
  }};
const K=0.00006; // multiplier = e^(K·ms): 2x ≈ 11.6s, 5x ≈ 26.8s

