'use strict';
const $=s=>document.querySelector(s);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const rnd=Math.random;
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const fmt=n=>Math.floor(n).toLocaleString('ko-KR')+'P';
const sfmt=n=>(n>0?'+':n<0?'−':'')+Math.abs(Math.floor(n)).toLocaleString('ko-KR')+'P';
const pfmt=v=>(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(1)+'%';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const START=10000;
const clsLabel=u=>`${u.grade}학년 ${u.cls}반 ${u.num}번`;
function parseSid(sid){if(!/^\d{5}$/.test(sid))return null;const grade=+sid[0],cls=+sid.slice(1,3),num=+sid.slice(3,5);if(grade<1||cls<1||cls>7||num<1||num>19)return null;return{grade,cls,num};}

/* ---------------- state (balance and records live on the server) ---------------- */
const prefs=Object.assign({bet:500,crashHist:[]},LS.get('he.prefs',{}));
const S={me:null,admin:false,bal:0,stats:null,hist:[],mymail:[],chat:null,crashHist:prefs.crashHist,bet:prefs.bet};
let STABLE=null,CHATS={},SETTINGS={startBal:START};
// admin-set game odds (fractions). Missing → the game's normal odds.
function oddsP(k,def){const v=CFG.odds&&CFG.odds[k];return(typeof v==='number'&&v>=0&&v<=1)?v:def;}
function save(){prefs.bet=S.bet;prefs.crashHist=S.crashHist;LS.set('he.prefs',prefs);}

const META={
  coin:{name:'동전 뒤집기',desc:'앞면과 뒷면 중 하나를 고르세요.',pay:'적중 1.95배',rtp:97.5},
  rps:{name:'가위바위보',desc:'하우스와 한 판. 비기면 원금 반환.',pay:'승리 1.95배',rtp:98.3},
  horse:{name:'경마',desc:'말 6마리, 능력치마다 다른 배당.',pay:'배당 = 0.95 ÷ 승률',rtp:95},
  snail:{name:'달팽이 경주',desc:'네 마리 모두 승률 25%. 멈추고, 갑자기 달립니다.',pay:'적중 3.8배',rtp:95},
  oddeven:{name:'홀짝',desc:'주사위 두 개의 합이 홀수일까, 짝수일까.',pay:'적중 1.95배',rtp:97.5},
  baccarat:{name:'바카라',desc:'플레이어·뱅커·타이. 8덱 슈 사용.',pay:'P 2배 · B 1.95배 · T 9배',rtp:98.8},
  slot:{name:'슬롯머신',desc:'3릴, 다섯 가지 심볼.',pay:'777 = 500배',rtp:94.95},
  crash:{name:'그래프',desc:'터지기 전에 캐시아웃하세요.',pay:'캐시아웃 배율만큼',rtp:97},
  blackjack:{name:'블랙잭',desc:'직접 플레이하거나, 플레이어·딜러 승부를 맞히세요.',pay:'승리 2배 · 블랙잭 2.5배',rtp:99.5},
  roulette:{name:'룰렛',desc:'0부터 36까지 37칸 유럽식 룰렛.',pay:'숫자 36배 · 색 2배',rtp:97.3}
};
const GIDS=Object.keys(META);

/* ---------------- rigging config ---------------- */
const DEF_CFG={v:0,global:0,games:{},players:{},lure:{on:false,rounds:10,boost:0.5},nearMiss:false,reveal:false};
let CFG=JSON.parse(JSON.stringify(DEF_CFG));
let force=null;
function biasFor(g,key,rounds){
  let b=(+CFG.global||0)+(+(CFG.games||{})[g]||0)+(+((CFG.players||{})[key]||{}).bias||0);
  if(CFG.lure&&CFG.lure.on&&rounds<(+CFG.lure.rounds||0))b+=(+CFG.lure.boost||0);
  return Math.max(-1,Math.min(1,b));
}
function bias(g){
  if(force){const f=force;force=null;pushPresence();return f==='win'?1:-1;}
  return biasFor(g,S.me?S.me.sid:'',S.stats?S.stats.rounds:0);
}
function resolve(g,bet,gen,payOf){
  const b=bias(g);let o=gen(),pay=payOf(o);const fairPay=pay;let manip=false;
  if(b<0&&pay>=bet&&rnd()<-b){for(let i=0;i<120;i++){const o2=gen(),p2=payOf(o2);if(p2<bet){o=o2;pay=p2;manip=true;break;}}}
  else if(b>0&&pay<=bet&&rnd()<b){for(let i=0;i<120;i++){const o2=gen(),p2=payOf(o2);if(p2>bet){o=o2;pay=p2;manip=true;break;}}}
  return{o,pay,fairPay,manip,b};
}
const isPaused=g=>{const p=CFG.paused||{};return !!(p.all||(p.games&&p.games[g]));};
function applyCfg(d){
  if(!d||typeof d!=='object')return;
  if((+d.v||0)<(+CFG.v||0))return;
  CFG=Object.assign(JSON.parse(JSON.stringify(DEF_CFG)),JSON.parse(JSON.stringify(d)));
  CFG.lure=Object.assign({},DEF_CFG.lure,CFG.lure||{});
  checkReveal();
  paintPaused();
  if(S.admin)syncRigPanel();
}

/* ---------------- auto update (works inside the installed app too) ---------------- */
// The server stamps each deploy with a version. When it changes, reload, but never in the middle of a round.
const BUILD=(document.querySelector('meta[name=app-version]')||{}).content||'';
let updatePending=false;
function checkVersion(v){
  if(!v||!BUILD||v===BUILD)return false;
  if(busy){updatePending=true;return false;}
  toast('새 버전으로 업데이트합니다');
  setTimeout(()=>location.reload(),700);
  return true;
}
function pollVersion(){fetch('/version',{cache:'no-store'}).then(r=>r.json()).then(d=>checkVersion(d.v)).catch(()=>{});
  if(navigator.serviceWorker&&navigator.serviceWorker.getRegistration)navigator.serviceWorker.getRegistration().then(r=>r&&r.update()).catch(()=>{});}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pollVersion();});
setInterval(pollVersion,5*60*1000);

/* ---------------- server connection ---------------- */
const SV={ws:null,ok:false,handlers:{},wait:null};
function svSend(m){if(SV.ws&&SV.ws.readyState===1){SV.ws.send(JSON.stringify(m));return true;}return false;}
function svConnect(){
  const url=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';
  let ws;try{ws=new WebSocket(url);}catch(e){setTimeout(svConnect,3000);return;}
  SV.ws=ws;
  ws.onopen=()=>{SV.ok=true;svSend({t:'hello',token:LS.get('he.token',null)});setConn();};
  ws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return}try{onServer(m)}catch(e){console.error(e)}};
  ws.onclose=()=>{SV.ok=false;setConn();if(SV.wait){SV.wait.res({t:'betno',msg:'서버 연결이 끊겼습니다.'});SV.wait=null;}setTimeout(svConnect,2000);};
}
function setConn(){
  $('#gateConn').textContent=SV.ok?'':'서버에 연결하는 중… (잠들어 있던 서버는 깨어나는 데 30초~1분 걸릴 수 있습니다)';
  const el=$('#netState');if(el)el.textContent=SV.ok?'실시간 서버 연결됨':'서버에 다시 연결하는 중…';
}
function onServer(m){
  switch(m.t){
    case 'welcome':
      if(checkVersion(m.ver))break;
      if(m.cfg)applyCfg(m.cfg);
      if(m.stable)onStable(m.stable);
      if(m.admin)enterAdmin();else if(m.me)enterPlayer(m.me,m.mymail);else{LS.del('he.token');showGate();}
      break;
    case 'authok':
      LS.set('he.token',m.token);
      if(m.admin)enterAdmin();else enterPlayer(m.me,m.mymail);
      break;
    case 'autherr':{const el=m.where==='signup'?$('#suErr'):$('#liErr');el.textContent=m.msg;break;}
    case 'kicked':toast('계정이 삭제되었습니다');doLogout(true);break;
    case 'betok':case 'betno':if(SV.wait){SV.wait.res(m);SV.wait=null;}break;
    case 'betaddok':case 'betaddno':if(SV.waitAdd){SV.waitAdd(m);SV.waitAdd=null;}if(m.t==='betaddok'){S.bal=m.bal;shownBal=S.bal;$('#balNum').textContent=fmt(S.bal);}else toast(m.msg);break;
    case 'bal':
      if(!S.me)break;
      S.bal=m.bal;if(m.stats)S.stats=m.stats;if('loan' in m)S.me.loan=m.loan;if('loanCount' in m)S.me.loanCount=m.loanCount;if('nextLoanAt' in m)S.me.nextLoanAt=m.nextLoanAt;if(m.h){S.hist.push(m.h);if(S.hist.length>300)S.hist.shift();}
      if(m.loanMsg)toast(m.loanMsg);
      if(view==='loan')renderLoan();
      if(!busy)updateBal();else shownBalPending=true;
      if(m.by==='admin'){if(m.delta>0)giftArrive(m.delta);else if(m.delta<0)toast('관리자가 '+fmt(-m.delta)+'를 회수했습니다');else if(!('delta' in m))toast('관리자가 포인트를 조정했습니다');}
      if(view==='stats')renderStats();
      break;
    case 'rank':RANK=m;if(view==='rank')renderRank();break;
    case 'msg':if(m.topic==='rig')applyCfg(m.data);else if(m.topic==='cmd')onCmd(m.data);break;
    case 'mailok':S.mymail=m.mymail||[];renderMyMail();$('#mailBody').value='';$('#mailCount').textContent='0 / 1000';toast('건의를 보냈습니다');break;
    case 'mymail':S.mymail=m.mymail||[];renderMyMail();break;
    case 'mailerr':toast(m.msg);break;
    case 'users':if(S.admin){USERS=m.users;renderAdmin();if(view==='chats')renderChats();}break;
    case 'mail':if(S.admin){INBOX=m.list;renderInbox();}break;
    case 'feed':if(S.admin)addFeed(m.e);break;
    case 'admack':toast(m.msg||(m.ok?'완료':'실패'));break;
    case 'loanerr':toast(m.msg);break;
    case 'stable':onStable(m.stable);break;
    case 'chat':S.chat=m.chat;handleChat();break;
    case 'chats':if(S.admin){CHATS=m.chats||{};renderChats();}break;
    case 'settings':if(S.admin){SETTINGS=m.settings||SETTINGS;syncOps();}break;
  }
}
function onCmd(d){
  if(!d||typeof d!=='object'||!S.me)return;
  if(d.type==='force'&&(d.want==='win'||d.want==='lose')){force=d.want;pushPresence();}
  else if(d.type==='clearforce'){force=null;pushPresence();}
  else if(d.type==='live'&&(d.want==='win'||d.want==='lose')){if(cur&&cur.liveOverride&&busy)cur.liveOverride(d.want);}
}
// blackjack double: ask the server to add to the stake of the round in progress
function betAdd(amount){return new Promise(res=>{if(!svSend({t:'betadd',amount}))return res(false);const tm=setTimeout(()=>{SV.waitAdd=null;res(false);},6000);SV.waitAdd=m=>{clearTimeout(tm);res(m.t==='betaddok');};});}
function betRequest(g,bet){
  return new Promise(res=>{
    if(!svSend({t:'bet',g,bet}))return res({t:'betno',msg:'서버에 연결되어 있지 않습니다.'});
    const timer=setTimeout(()=>{if(SV.wait&&SV.wait.res===done){SV.wait=null;res({t:'betno',msg:'서버 응답이 없습니다.'});}},6000);
    const done=m=>{clearTimeout(timer);res(m);};
    SV.wait={res:done};
  });
}

/* loans: 10,000P, 20% simple interest per hour, usable for 24 hours */
const LOAN_TERM=24*3600*1000;
const LOAN_TIERS=[{amount:10000,rate:.2},{amount:50000,rate:.4},{amount:100000,rate:.6}];
const debtNow=l=>Math.floor(l.principal*(1+(l.rate||.2)*Math.max(0,(Date.now()-l.at)/3600000)));
/* horse/snail shared stable from the server */
function onStable(st){STABLE=st;for(const id of['horse','snail']){const g=GAMES[id];if(!g)continue;if(cur===g&&busy){g.pendingRefresh=true;continue;}if(cur===g&&view==='game')g.refresh();else g.field=null;}}
/* 1:1 chat from the house: takes over the screen once the current round is over */
function handleChat(){
  if(S.admin||!S.me)return;
  if(S.chat&&S.chat.open){if(busy)return;if(view!=='chat'){toast('관리자가 1:1 대화를 시작했습니다');show('chat');}else renderChat();}
  else if(view==='chat'){renderChat();toast('대화가 끝났습니다');setTimeout(()=>{if(view==='chat')show('lobby');},1200);}
}

/* presence: what the house sees about this player right now */
let presTimer=null,presLast=0,liveText='',playing=false,curBetInfo=null;
function pushPresence(){
  if(!S.me)return;
  const delay=Math.max(0,200-(Date.now()-presLast));clearTimeout(presTimer);
  presTimer=setTimeout(()=>{presLast=Date.now();
    svSend({t:'presence',p:{game:(playing||view==='game')&&cur?cur.id:view,st:playing?'play':'idle',bet:curBetInfo?curBetInfo.bet:0,pick:curBetInfo?String(curBetInfo.pick).slice(0,24):'',live:String(liveText).slice(0,60),force:force||''}});
  },delay);
}

/* ---------------- auth screens ---------------- */
function showGate(){S.me=null;S.admin=false;$('#gate').hidden=false;$('#appShell').hidden=true;setConn();}
function setSeg(sign){$('#segLogin').setAttribute('aria-pressed',String(!sign));$('#segSignup').setAttribute('aria-pressed',String(sign));$('#loginForm').hidden=sign;$('#signupForm').hidden=!sign;$('#liErr').textContent='';$('#suErr').textContent='';}
$('#segLogin').onclick=()=>setSeg(false);$('#segSignup').onclick=()=>setSeg(true);
$('#suSid').addEventListener('input',e=>{const v=e.target.value.replace(/\D/g,'').slice(0,5);e.target.value=v;const n=$('#suSidNote');const p=parseSid(v);
  if(!v){n.className='note';n.textContent='학년 1자리 + 반 2자리 + 번호 2자리';}
  else if(p){n.className='note ok';n.textContent=`${p.grade}학년 ${p.cls}반 ${p.num}번`;}
  else if(v.length<5){n.className='note';n.textContent='5자리를 입력하세요';}
  else{const c=+v.slice(1,3),num=+v.slice(3,5);n.className='note bad';n.textContent=c<1||c>7?'반은 1반부터 7반까지입니다 (예: 20319의 03 = 3반)':num<1||num>19?'번호는 1번부터 19번까지입니다':'학번을 확인하세요';}
});
$('#loginForm').addEventListener('submit',e=>{e.preventDefault();const id=$('#liId').value.trim(),pw=$('#liPw').value;
  if(!id||!pw){$('#liErr').textContent='학번과 비밀번호를 입력하세요.';return;}
  if(!svSend({t:'login',id,pw})){$('#liErr').textContent='서버에 연결하는 중입니다. 잠시 후 다시 시도하세요.';return;}
  $('#liErr').textContent='';$('#liPw').value='';});
$('#signupForm').addEventListener('submit',e=>{e.preventDefault();const sid=$('#suSid').value.trim(),name=$('#suName').value.trim(),pw=$('#suPw').value,pw2=$('#suPw2').value;const err=$('#suErr');
  if(!parseSid(sid)){err.textContent='학번을 확인하세요. 반은 1~7반, 번호는 1~19번입니다.';return;}
  if(!/^[가-힣A-Za-z ]{2,12}$/.test(name)){err.textContent='이름은 한글 또는 영문 2~12자로 입력하세요.';return;}
  if(pw.length<4){err.textContent='비밀번호는 4자 이상이어야 합니다.';return;}
  if(pw!==pw2){err.textContent='비밀번호 확인이 일치하지 않습니다.';return;}
  if(!svSend({t:'signup',sid,name,pw})){err.textContent='서버에 연결하는 중입니다. 잠시 후 다시 시도하세요.';return;}
  err.textContent='';});
function enterShell(){$('#gate').hidden=true;$('#appShell').hidden=false;
  document.querySelectorAll('[data-role=player]').forEach(el=>el.hidden=S.admin);
  document.querySelectorAll('[data-role=admin]').forEach(el=>el.hidden=!S.admin);}
function enterPlayer(me,mymail){
  S.me=me;S.admin=false;S.bal=me.bal;S.stats=me.stats;S.hist=me.hist||[];S.mymail=mymail||[];S.chat=me.chat||null;
  enterShell();$('#whoText').innerHTML=`<b>${esc(me.name)}</b> · ${esc(clsLabel(me))}`;
  shownBal=S.bal;$('#balNum').textContent=fmt(S.bal);updateBal();renderMyMail();
  if(!['lobby','rank','stats','mail','game'].includes(view)||view==='game'&&!cur)view='lobby';
  show(view==='game'?'game':view);pushPresence();checkReveal();handleChat();
}
function enterAdmin(){
  S.me=null;S.admin=true;enterShell();$('#whoText').innerHTML='<b>관리자</b>';
  if(!rigBuilt){buildRigPanel();rigBuilt=true;}
  show(['admin','inbox','rank'].includes(view)?view:'admin');setConn();
}
function doLogout(local){
  if(!local)svSend({t:'logout',token:LS.get('he.token',null)});
  LS.del('he.token');busy=false;playing=false;cur=null;view='lobby';USERS=[];INBOX=[];
  $('#liId').value='';setSeg(false);showGate();
}
$('#logoutBtn').onclick=()=>{if(busy){toast('판이 끝난 뒤에 로그아웃할 수 있습니다');return;}doLogout(false);};

/* ---------------- views ---------------- */
let view='lobby',cur=null,busy=false,choice=null,RANK=null,USERS=[],INBOX=[],rigBuilt=false;
function show(v){
  if(busy&&v!=='game'){toast('판이 끝난 뒤에 이동할 수 있습니다');return;}
  if(!S.admin&&S.chat&&S.chat.open&&v!=='chat'){toast('관리자와 대화가 끝날 때까지 다른 화면으로 갈 수 없습니다');v='chat';}
  view=v;
  for(const id of['lobby','game','rank','stats','loan','chat','mail','admin','inbox','chats'])$('#v-'+id).hidden=id!==v;
  document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.v===v||(v==='game'&&b.dataset.v==='lobby'))));
  if(v==='stats')renderStats();
  if(v==='rank'){if(!RANK)svSend({t:'rank'});renderRank();}
  if(v==='admin')renderAdmin();
  if(v==='inbox')renderInbox();
  if(v==='mail')renderMyMail();
  if(v==='loan')renderLoan();
  if(v==='chat')renderChat();
  if(v==='chats')renderChats();
  pushPresence();window.scrollTo({top:0});
}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b)show(b.dataset.v);});
$('#brand').onclick=()=>show(S.admin?'admin':'lobby');
$('#backBtn').onclick=()=>show('lobby');

/* balance */
let shownBal=0,shownBalPending=false;
function updateBal(){
  shownBalPending=false;
  const el=$('#bal');const from=shownBal,to=S.bal;shownBal=to;
  el.classList.remove('up','down');void el.offsetWidth;if(to>from)el.classList.add('up');else if(to<from)el.classList.add('down');
  const t0=performance.now(),dur=500;
  (function step(t){const k=Math.min(1,(t-t0)/dur);$('#balNum').textContent=fmt(from+(to-from)*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(step);})(t0);
  const loan=S.me&&S.me.loan;const debt=loan?debtNow(loan):0;
  $('#debtTag').hidden=!loan;if(loan)$('#debtTag').textContent='빚 '+fmt(debt);
  const expired=loan&&Date.now()-loan.at>LOAN_TERM;
  const broke=(S.bal<1||expired)&&!busy;
  $('#brokeMsg').hidden=!broke;$('#playBtn').hidden=broke&&!busy;
  if(broke){$('#brokeMsg b').textContent=expired?'대출 사용 기간이 끝났습니다':'포인트를 모두 잃었습니다';
    const next=Date.now()>=(S.me.nextLoanAt||0)?LOAN_TIERS[Math.min(S.me.loanCount||0,2)]:null;
    $('#brokeText').textContent=expired?'대출 탭에서 갚아야 다시 게임을 할 수 있습니다.':loan?'이미 받은 대출이 있어 더 빌릴 수 없습니다.':next?'무료 충전은 없습니다. '+((S.me.loanCount||0)+1)+'차 대출('+fmt(next.amount)+')을 받을 수 있습니다.':'대출은 하루에 한 번입니다. 대출 탭에서 다시 빌릴 수 있는 시각을 확인하세요.';
    $('#brokeLoan').textContent=expired||loan?'대출 탭으로 가기':next?'대출 받으러 가기':'대출 기록 보기';}
  if(S.bet>S.bal&&S.bal>=1&&!busy)setBet(S.bal);
}
function toast(msg){const d=document.createElement('div');d.textContent=msg;$('#toast').appendChild(d);setTimeout(()=>d.remove(),2400);}

/* bet */
const betIn=$('#betAmt');
function setBet(v){v=Math.floor(+v||0);if(v<1)v=1;if(S.bal>=1&&v>S.bal)v=Math.floor(S.bal);S.bet=v;betIn.value=v;save();}
betIn.addEventListener('change',()=>setBet(betIn.value));
betIn.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();setBet(betIn.value);play();}});
document.querySelector('.quick').addEventListener('click',e=>{const b=e.target.closest('button[data-q]');if(!b||busy)return;const q=b.dataset.q;
  if(q==='p100')setBet(S.bet+100);else if(q==='p1000')setBet(S.bet+1000);else if(q==='half')setBet(Math.floor(S.bal/2));else if(q==='max')setBet(S.bal);});

/* ---------------- game framework ---------------- */
const GAMES={};
const stage=$('#stage');
function openGame(id){
  cur=GAMES[id];choice=null;busy=false;playing=false;liveText='';curBetInfo=null;
  $('#gTitle').textContent=META[id].name;$('#gRule').textContent=META[id].pay+' · 이론 환급률 '+META[id].rtp+'%';
  $('#result').textContent='';$('#result').className='result';
  stage.innerHTML='';$('#gExtra').innerHTML='';
  cur.mount(stage,$('#gExtra'));
  renderChoices();setBet(S.bet);setPlayBtn();
  show('game');updateBal();
}
function renderChoices(){
  const wrap=$('#choices');const list=cur.choices();wrap.className='choices'+(cur.listChoices?' list':'');
  $('#choiceLbl').textContent=cur.choiceLabel||'선택';
  $('#choiceLbl').parentElement.hidden=!list.length;
  wrap.innerHTML=list.map((c,i)=>`<button type="button" class="choice" data-i="${i}" aria-pressed="${choice===i}"><span class="k">${i+1}</span>${c.html||`<b>${esc(c.label)}</b>${c.sub?`<small>${esc(c.sub)}</small>`:''}`}</button>`).join('');
}
$('#choices').addEventListener('click',e=>{const b=e.target.closest('.choice');if(b)choose(+b.dataset.i);});
function choose(i){if(busy||!cur)return;const list=cur.choices();if(i<0||i>=list.length)return;choice=i;renderChoices();}
function setPlayBtn(){
  const b=$('#playBtn');
  if(cur&&cur.id==='crash'&&busy&&GAMES.crash.running){b.classList.add('cash');b.disabled=false;b.textContent='캐시아웃 '+GAMES.crash.m.toFixed(2)+'x';return;}
  const pz=!busy&&cur&&isPaused(cur.id);
  b.classList.remove('cash');b.disabled=busy||pz;b.textContent=busy?'진행 중…':pz?'관리자가 이 게임을 멈췄습니다':(cur&&cur.playLabel)||'베팅';
}
async function play(){
  if(!cur||!S.me)return;
  if(busy){if(cur.id==='crash')cur.cashout();return;}
  if(S.bal<1){toast('포인트가 없습니다');return;}
  setBet(betIn.value);const bet=S.bet;
  if(bet>S.bal){toast('보유 포인트보다 많이 걸 수 없습니다');return;}
  const list=cur.choices();
  if(cur.listChoices&&!list.length){toast('출전 정보를 불러오는 중입니다');return;}
  if(list.length&&choice==null){toast((cur.choiceLabel||'선택')+'을(를) 먼저 고르세요');return;}
  if(S.chat&&S.chat.open){handleChat();return;}
  if(isPaused(cur.id)){toast('지금은 관리자가 이 게임을 멈춰 두었습니다');setPlayBtn();return;}
  busy=true;setPlayBtn();
  const ack=await betRequest(cur.id,bet);
  if(ack.t!=='betok'){busy=false;setPlayBtn();toast(ack.msg||'베팅할 수 없습니다');if(ack.bal!=null){S.bal=ack.bal;updateBal();}return;}
  playing=true;S.bal=ack.bal;shownBal=S.bal+bet;updateBal();
  const pick=list.length?list[choice].label:'';
  curBetInfo={bet,pick};liveText='';pushPresence();
  $('#result').textContent='';$('#result').className='result';
  let r;
  try{r=await cur.play(bet,choice);}catch(e){console.error(e);r={pay:bet,manip:false,fairPay:bet,text:'오류로 원금 반환'};}
  const pay=Math.max(0,Math.floor(r.pay||0));
  svSend({t:'settle',pay,manip:!!r.manip,d:r.manip?pay-Math.floor(r.fairPay||0):0,winner:Number.isInteger(r.winner)?r.winner:undefined});
  showResult(r.bet||bet,pay,r.text);
  busy=false;playing=false;curBetInfo=null;liveText='';setPlayBtn();
  updateBal();pushPresence(); // the server answers with the new balance
  if(cur.after)cur.after();
  if(cur&&cur.pendingStable&&cur.refresh){cur.pendingStable=false;}
  if(S.chat&&S.chat.open)setTimeout(handleChat,1200);
  if(updatePending){updatePending=false;setTimeout(()=>{if(!busy){toast('새 버전으로 업데이트합니다');setTimeout(()=>location.reload(),700);}else updatePending=true;},1800);}
}
$('#playBtn').onclick=play;
function showResult(bet,pay,text){
  const el=$('#result');const net=pay-bet;
  el.className='result '+(net>0?'win':net<0?(pay>0?'push':'lose'):'push');
  el.innerHTML=`<b>${esc(text||'')}${text?' · ':''}${pay>0?(net>0?'당첨 ':net===0?'원금 반환 ':'일부 당첨 ')+fmt(pay):'꽝 '+sfmt(-bet)}</b>`;
}
function banner(text,cls){const b=document.createElement('div');b.className='banner show '+cls;b.textContent=text;stage.appendChild(b);setTimeout(()=>b.remove(),1700);}
