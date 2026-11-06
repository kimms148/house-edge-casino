
/* ---------------- 9. blackjack ---------------- */
// Two ways to play: play your own hand (hit / stand / double), or bet on who wins an auto-played hand.
// Every rule and the card "luck" of each side can be changed by the house (CFG.bj).
const BJ_DEF={payout:'3:2',s17:'stand',decks:6,dealerLuck:0,playerUnluck:0,tieHouse:false,betP:2.05,betD:1.75,betT:9};
const bjCfg=()=>Object.assign({},BJ_DEF,CFG.bj||{});
const BJ_PAY={'3:2':2.5,'6:5':2.2,'1:1':2};
function bjVal(h){let t=0,a=0;for(const c of h){t+=c.r===1?1:Math.min(10,c.r);if(c.r===1)a++;}let soft=false;if(a&&t+10<=21){t+=10;soft=true;}return{t,soft,bj:h.length===2&&t===21};}
const bjScore=h=>{const v=bjVal(h).t;return v>21?-1:v;};
function bjCardEl(c,down){const red=c.s===1||c.s===2;const d=document.createElement('div');d.className='card deal'+(down?'':' open');
  d.innerHTML=`<div class="in"><div class="f ${red?'red':''}"><span class="r">${RANKS[c.r]}</span><span class="s">${SUITS[c.s]}</span></div><div class="b"></div></div>`;return d;}
GAMES.blackjack={id:'blackjack',mode:'play',shoe:[],choiceLabel:'누가 이길까',
  get playLabel(){return this.mode==='bet'?'베팅하고 시작':'베팅하고 카드 받기';},
  choices(){if(this.mode!=='bet')return[];const c=bjCfg();
    return[{label:'플레이어',sub:'승률 41.2% · '+c.betP+'배'},{label:'딜러',sub:'승률 49.1% · '+c.betD+'배'},{label:'무승부',sub:'확률 9.8% · '+c.betT+'배'}];},
  newShoe(){const n=Math.max(1,Math.min(8,Math.floor(bjCfg().decks)||6));const s=[];for(let k=0;k<n;k++)for(let su=0;su<4;su++)for(let r=1;r<=13;r++)s.push({r,s:su});this.shoe=shuffle(s);this.decks=n;},
  ensure(){const n=Math.max(1,Math.min(8,Math.floor(bjCfg().decks)||6));if(this.shoe.length<52*n*0.25||this.decks!==n)this.newShoe();},
  // draw one card; with some chance look at two and keep the one that helps (or hurts) this hand
  draw(sh,hand,good,bad,st){
    let c=sh.pop();
    const g=rnd()<good,b=!g&&rnd()<bad;
    if(g||b){const c2=sh.pop();const s1=bjScore(hand.concat([c])),s2=bjScore(hand.concat([c2]));
      const take2=g?s2>s1:s2<s1;if(take2){sh.unshift(c);c=c2;st.manip=true;}else sh.unshift(c2);}
    return c;
  },
  edges(b){const c=bjCfg();return{dGood:Math.min(1,(+c.dealerLuck||0)+Math.max(0,-b)),pBad:Math.min(1,(+c.playerUnluck||0)+Math.max(0,-b)),pGood:Math.max(0,b),dBad:Math.max(0,b)};},
  dealerPlays(sh,D,e,st){const c=bjCfg();for(;;){const v=bjVal(D);if(v.t>21||v.t>17||(v.t===17&&!(v.soft&&c.s17==='hit')))break;D.push(this.draw(sh,D,e.dGood,e.dBad,st));}},
  mount(st,extra){
    this.ensure();
    st.innerHTML=`<div class="bj"><div class="bj-row"><div class="bj-lbl">딜러 <span class="bj-sc" id="bjD">–</span></div><div class="hand-cards" id="bjDc"></div></div>
      <div class="bj-msg" id="bjMsg">베팅하고 시작하세요</div>
      <div class="bj-row"><div class="bj-lbl">플레이어 <span class="bj-sc" id="bjP">–</span></div><div class="hand-cards" id="bjPc"></div></div>
      <div class="bj-act" id="bjAct" hidden><button type="button" class="btn" data-a="hit">히트</button><button type="button" class="btn" data-a="stand">스탠드</button><button type="button" class="btn" data-a="double">더블</button></div>
      <div class="shoe-info" id="bjShoe"></div></div>`;
    const c=bjCfg();
    extra.innerHTML=`<div class="seg" role="group" aria-label="블랙잭 방식" style="margin-bottom:8px"><button type="button" data-m="play" aria-pressed="${this.mode==='play'}">직접 플레이</button><button type="button" data-m="bet" aria-pressed="${this.mode==='bet'}">승부 맞히기</button></div>
      <div class="hint">${this.mode==='play'?`블랙잭 ${c.payout} (원금 포함 ${BJ_PAY[c.payout]||2.5}배) · 이기면 2배 · 비기면 ${c.tieHouse?'하우스 승':'원금 반환'} · 딜러 소프트 17 ${c.s17==='hit'?'히트':'스탠드'} · ${this.decks}덱`:`플레이어 손은 17이 될 때까지 자동으로 받습니다. 플레이어·딜러에 걸었는데 비기면 원금을 돌려받습니다.`}</div>`;
    extra.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{if(busy)return;this.mode=b.dataset.m;choice=null;renderChoices();this.mount(stage,$('#gExtra'));setPlayBtn();});
    this.info();
  },
  info(){const el=$('#bjShoe');if(el)el.textContent=`${this.decks}덱 슈 · 남은 카드 ${this.shoe.length}장`;},
  async show(zone,c,down){const el=bjCardEl(c,true);zone.appendChild(el);await wait(330);if(!down)el.classList.add('open');await wait(300);return el;},
  paint(id,h,hide){$('#'+id).textContent=hide?'?':String(bjVal(h).t)+(bjVal(h).soft&&bjVal(h).t<21?' (소프트)':'');},
  async play(bet,pick){this.ensure();return this.mode==='bet'?this.playBet(bet,pick):this.playSelf(bet);},
  async playSelf(bet){
    const c=bjCfg(),e=this.edges(bias('blackjack')),st={manip:false},sh=this.shoe;
    const P=[],D=[];const pc=$('#bjPc'),dc=$('#bjDc'),msg=$('#bjMsg');pc.innerHTML=dc.innerHTML='';msg.textContent='';
    P.push(this.draw(sh,P,e.pGood,e.pBad,st));await this.show(pc,P[0]);this.paint('bjP',P);
    D.push(this.draw(sh,D,e.dGood,e.dBad,st));await this.show(dc,D[0]);this.paint('bjD',D);
    P.push(this.draw(sh,P,e.pGood,e.pBad,st));await this.show(pc,P[1]);this.paint('bjP',P);
    D.push(this.draw(sh,D,e.dGood,e.dBad,st));const hole=await this.show(dc,D[1],true);$('#bjD').textContent=String(bjVal([D[0]]).t)+' + ?';
    let total=bet;const reveal=()=>{hole.classList.add('open');this.paint('bjD',D);};
    const pv=bjVal(P),dv=bjVal(D);
    if(pv.bj||dv.bj){await wait(300);reveal();
      if(pv.bj&&dv.bj){msg.textContent='둘 다 블랙잭';return{pay:c.tieHouse?0:bet,bet,manip:st.manip,fairPay:bet,text:'둘 다 블랙잭'};}
      if(pv.bj){banner('블랙잭!','win');return{pay:Math.floor(bet*(BJ_PAY[c.payout]||2.5)),bet,manip:st.manip,fairPay:0,text:'블랙잭'};}
      banner('딜러 블랙잭','lose');return{pay:0,bet,manip:st.manip,fairPay:0,text:'딜러 블랙잭'};}
    // player decisions
    const act=$('#bjAct');let first=true;
    for(;;){
      if(bjVal(P).t>=21)break;
      act.hidden=false;act.querySelector('[data-a=double]').disabled=!first||S.bal<bet;msg.textContent='히트, 스탠드, 더블 중에 고르세요';
      const a=await new Promise(res=>{act.onclick=ev=>{const b=ev.target.closest('[data-a]');if(b&&!b.disabled)res(b.dataset.a);};});
      act.hidden=true;msg.textContent='';
      if(a==='stand')break;
      if(a==='double'){const ok=await betAdd(bet);if(!ok){first=false;continue;}total+=bet;P.push(this.draw(sh,P,e.pGood,e.pBad,st));await this.show(pc,P[P.length-1]);this.paint('bjP',P);break;}
      P.push(this.draw(sh,P,e.pGood,e.pBad,st));await this.show(pc,P[P.length-1]);this.paint('bjP',P);first=false;
    }
    act.hidden=true;
    const p=bjVal(P).t;
    if(p>21){reveal();banner('버스트','lose');return{pay:0,bet:total,manip:st.manip,fairPay:0,text:'버스트 '+p};}
    await wait(300);reveal();await wait(400);
    while(true){const v=bjVal(D);if(v.t>21||v.t>17||(v.t===17&&!(v.soft&&c.s17==='hit')))break;D.push(this.draw(sh,D,e.dGood,e.dBad,st));await this.show(dc,D[D.length-1]);this.paint('bjD',D);}
    const d=bjVal(D).t;this.info();
    if(d>21||p>d){banner('승리','win');return{pay:total*2,bet:total,manip:st.manip,fairPay:0,text:`${p} : ${d}${d>21?' 딜러 버스트':''}`};}
    if(p===d){banner('무승부',c.tieHouse?'lose':'win');return{pay:c.tieHouse?0:total,bet:total,manip:st.manip||c.tieHouse,fairPay:total,text:`${p} : ${d} 무승부${c.tieHouse?' (하우스 승)':''}`};}
    banner('패배','lose');return{pay:0,bet:total,manip:st.manip,fairPay:0,text:`${p} : ${d}`};
  },
  async playBet(bet,pick){
    const c=bjCfg(),e=this.edges(0);
    const gen=()=>{const sh=this.shoe.slice(),st={manip:false},P=[],D=[];
      P.push(this.draw(sh,P,0,e.pBad,st));D.push(this.draw(sh,D,e.dGood,0,st));P.push(this.draw(sh,P,0,e.pBad,st));D.push(this.draw(sh,D,e.dGood,0,st));
      let res;const pv=bjVal(P),dv=bjVal(D);
      if(pv.bj||dv.bj)res=pv.bj&&dv.bj?'T':pv.bj?'P':'D';
      else{while(bjVal(P).t<17)P.push(this.draw(sh,P,0,e.pBad,st));
        if(bjVal(P).t>21)res='D';else{this.dealerPlays(sh,D,{dGood:e.dGood,dBad:0},st);const p=bjVal(P).t,d=bjVal(D).t;res=d>21||p>d?'P':d>p?'D':'T';}}
      return{P,D,sh,res,manip:st.manip};};
    const payOf=o=>o.res==='T'?(pick===2?Math.floor(bet*c.betT):bet):(pick===(o.res==='P'?0:1)?Math.floor(bet*(o.res==='P'?c.betP:c.betD)):0);
    const r=resolve('blackjack',bet,gen,payOf);const o=r.o;this.shoe=o.sh;
    const pc=$('#bjPc'),dc=$('#bjDc');pc.innerHTML=dc.innerHTML='';$('#bjMsg').textContent='';
    await this.show(pc,o.P[0]);this.paint('bjP',o.P.slice(0,1));await this.show(dc,o.D[0]);this.paint('bjD',o.D.slice(0,1));
    await this.show(pc,o.P[1]);this.paint('bjP',o.P.slice(0,2));const hole=await this.show(dc,o.D[1],true);
    for(let i=2;i<o.P.length;i++){await this.show(pc,o.P[i]);this.paint('bjP',o.P.slice(0,i+1));}
    hole.classList.add('open');this.paint('bjD',o.D.slice(0,2));await wait(300);
    for(let i=2;i<o.D.length;i++){await this.show(dc,o.D[i]);this.paint('bjD',o.D.slice(0,i+1));}
    this.info();const name={P:'플레이어 승',D:'딜러 승',T:'무승부'}[o.res];banner(name,r.pay>bet?'win':r.pay===bet?'win':'lose');
    return{pay:r.pay,fairPay:r.fairPay,manip:r.manip||o.manip,text:`${bjVal(o.P).t} : ${bjVal(o.D).t} ${name}`};
  }};

/* ---------------- 10. roulette (European, single zero) ---------------- */
const RW=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const REDS=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const RBETS=[
  {k:'red',label:'빨강',pay:2,win:n=>REDS.has(n)},{k:'black',label:'검정',pay:2,win:n=>n>0&&!REDS.has(n)},
  {k:'odd',label:'홀',pay:2,win:n=>n>0&&n%2===1},{k:'even',label:'짝',pay:2,win:n=>n>0&&n%2===0},
  {k:'low',label:'1~18',pay:2,win:n=>n>=1&&n<=18},{k:'high',label:'19~36',pay:2,win:n=>n>=19},
  {k:'d1',label:'1~12',pay:3,win:n=>n>=1&&n<=12},{k:'d2',label:'13~24',pay:3,win:n=>n>=13&&n<=24},{k:'d3',label:'25~36',pay:3,win:n=>n>=25},
  {k:'num',label:'숫자 하나',pay:36,win:(n,x)=>n===x}];
const rOfficial=b=>b.k==='num'?1/37:[...Array(37).keys()].filter(n=>b.win(n,-1)).length/37;
const rColor=n=>n===0?'#2f6b45':REDS.has(n)?'#9d2a20':'#16181a';
GAMES.roulette={id:'roulette',angle:0,choiceLabel:'베팅 종류',
  choices:()=>RBETS.map(b=>({label:b.label,html:`<b>${b.label}</b><small>${(rOfficial(b)*100).toFixed(2)}% · ${b.pay}배</small>`})),
  num(){const v=Math.floor(+($('#rNum')||{}).value);return v>=0&&v<=36?v:17;},
  mount(st,extra){
    st.innerHTML=`<div class="roul"><canvas id="rCv" width="340" height="340"></canvas><div class="roul-hist" id="rHist"></div></div>`;
    extra.innerHTML=`<div class="amt-row"><label class="lbl" for="rNum" style="white-space:nowrap">숫자 하나에 걸 숫자</label><input id="rNum" type="number" min="0" max="36" value="${LS.get('he.rnum',17)}" style="font-size:15px;padding:6px 8px"></div>
      <table class="paytable" style="margin-top:8px"><tr><td>공식 당첨 확률</td><td style="color:var(--mute)">배당 (원금 포함)</td></tr>
      <tr><td>숫자 하나 (0 포함) 1/37 = 2.70%</td><td>36배</td></tr><tr><td>빨강·검정·홀·짝·1~18·19~36 18/37 = 48.65%</td><td>2배</td></tr><tr><td>1~12·13~24·25~36 12/37 = 32.43%</td><td>3배</td></tr></table>
      <div class="hint" style="margin-top:6px">0이 나오면 숫자 하나에 0을 건 경우만 이깁니다. 그래서 이론 환급률은 97.3%입니다.</div>`;
    $('#rNum').addEventListener('change',e=>{const v=Math.max(0,Math.min(36,Math.floor(+e.target.value)||0));e.target.value=v;LS.set('he.rnum',v);});
    this.draw(this.angle,null,null);this.hist();
  },
  hist(){const el=$('#rHist');if(!el)return;const h=LS.get('he.rhist',[]);el.innerHTML=h.length?h.slice(-12).reverse().map(n=>`<span style="background:${rColor(n)}">${n}</span>`).join(''):'';},
  draw(wa,ball,hit){
    const cv=$('#rCv');if(!cv)return;const g=cv.getContext('2d');const W=cv.width,c=W/2,R=W/2-8,seg=Math.PI*2/37;
    g.clearRect(0,0,W,W);
    g.beginPath();g.arc(c,c,R+6,0,7);g.fillStyle='#3a2a18';g.fill();
    g.beginPath();g.arc(c,c,R,0,7);g.fillStyle='#24190f';g.fill();
    for(let i=0;i<37;i++){const a0=wa+i*seg-Math.PI/2-seg/2;
      g.beginPath();g.moveTo(c,c);g.arc(c,c,R*0.93,a0,a0+seg);g.closePath();g.fillStyle=rColor(RW[i]);if(hit!=null&&RW[i]===hit)g.fillStyle='#c9a560';g.fill();
      g.strokeStyle='#8a6a32';g.lineWidth=1;g.stroke();
      g.save();g.translate(c,c);g.rotate(a0+seg/2+Math.PI/2);g.fillStyle=hit!=null&&RW[i]===hit?'#16110a':'#e4ded2';g.font='bold 11px DM Mono, monospace';g.textAlign='center';g.fillText(String(RW[i]),0,-R*0.82);g.restore();}
    g.beginPath();g.arc(c,c,R*0.62,0,7);g.fillStyle='#1c1e21';g.fill();g.strokeStyle='#8a6a32';g.lineWidth=2;g.stroke();
    g.beginPath();g.arc(c,c,R*0.16,0,7);g.fillStyle='#a8823f';g.fill();
    for(let k=0;k<4;k++){g.save();g.translate(c,c);g.rotate(wa+k*Math.PI/2);g.fillStyle='#a8823f';g.fillRect(-3,-R*0.58,6,R*0.42);g.restore();}
    g.beginPath();g.moveTo(c-9,2);g.lineTo(c+9,2);g.lineTo(c,18);g.closePath();g.fillStyle='#c9a560';g.fill();
    if(ball){g.beginPath();g.arc(c+Math.cos(ball.a)*ball.r*R,c+Math.sin(ball.a)*ball.r*R,6,0,7);g.fillStyle='#eeeae2';g.fill();g.strokeStyle='#0008';g.stroke();}
  },
  async play(bet,pick){
    const bt=RBETS[pick],x=this.num();
    const gen=()=>{const p=CFG.roul&&CFG.roul[bt.k];
      if(typeof p==='number'&&p>=0&&p<=1){const want=rnd()<p;const pool=[...Array(37).keys()].filter(n=>!!bt.win(n,x)===want);return pool.length?pool[Math.floor(rnd()*pool.length)]:Math.floor(rnd()*37);}
      return Math.floor(rnd()*37);};
    const r=resolve('roulette',bet,gen,n=>bt.win(n,x)?bet*bt.pay:0);const n=r.o;
    if(bt.k==='num'&&curBetInfo)curBetInfo.pick='숫자 '+x;
    const seg=Math.PI*2/37,idx=RW.indexOf(n);
    const start=this.angle,target=-idx*seg;let delta=((target-start)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);const total=delta+Math.PI*2*4;
    const b0=rnd()*Math.PI*2,bEnd=-Math.PI/2,bTot=((b0-bEnd)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)+Math.PI*2*7;
    const T=5200,t0=performance.now();
    await new Promise(res=>{const step=now=>{const k=Math.min(1,(now-t0)/T),ease=1-Math.pow(1-k,3);
      const wa=start+total*ease,ba=b0-bTot*(1-Math.pow(1-k,2.4)),br=k<0.7?0.97:0.97-0.22*Math.min(1,(k-0.7)/0.25);
      this.draw(wa,{a:ba,r:br},null);liveText='룰렛 회전 중';if(k<1)requestAnimationFrame(step);else{this.angle=wa%(Math.PI*2);res();}};requestAnimationFrame(step);});
    this.draw(this.angle,{a:-Math.PI/2,r:0.75},n);
    const h=LS.get('he.rhist',[]);h.push(n);LS.set('he.rhist',h.slice(-30));this.hist();
    const col=n===0?'초록':REDS.has(n)?'빨강':'검정';
    banner(n+' '+col,r.pay>0?'win':'lose');
    return{pay:r.pay,fairPay:r.fairPay,manip:r.manip,text:`${n} (${col})`};
  }};
