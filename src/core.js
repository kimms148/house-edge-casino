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
function parseSid(sid){if(!/^\d{5}$/.test(sid))return null;const grade=+sid[0],cls=+sid.slice(1,3),num=+sid.slice(3,5);if(grade<1||grade>3||cls<1||cls>7||num<1||num>19)return null;return{grade,cls,num};}
const dispName=u=>u.nick||u.name;
// invite code from a friend's link (?inv=...) is kept until signup
(()=>{try{const q=new URLSearchParams(location.search).get('inv');if(q&&/^[0-9a-f]{6,20}$/.test(q)){sessionStorage.setItem('he.inv',q);history.replaceState(null,'',location.pathname);}}catch(e){}})();
const invCode=()=>{try{return sessionStorage.getItem('he.inv')||'';}catch(e){return'';}};
function gateNote(t){const el=$('#gateNote');el.textContent=t||'';el.hidden=!t;}

/* ---------------- state (balance and records live on the server) ---------------- */
const prefs=Object.assign({bet:500,crashHist:[]},LS.get('he.prefs',{}));
const S={me:null,admin:false,bal:0,stats:null,hist:[],mymail:[],chat:null,crashHist:prefs.crashHist,bet:prefs.bet};
let STABLE=null,CHATS={},SETTINGS={startBal:START};
// admin-set game odds (fractions). Missing → the game's normal odds.
// Games whose rules carry a plain win chance: a schedule rule for them is a win probability (%).
const DIRECT={coin:'coin',oddeven:'oddeven',rps:'rpsWin',roulette:'roul'};
// round-based schedule: "first N rounds → A, after that → B" (per student; per game for a game rule, all rounds for 전체)
function schedRule(g,total,per){const list=CFG.sched||[];const r=list.find(x=>x.g===g)||null;if(!r)return null;const n=r.g==='all'?total:per;return{r,v:n<(+r.n||0)?+r.a:+r.b};}
// balance rule: "보유 포인트가 X 이상(또는 미만)이면 → 값". If several match, the one whose line is closest to the balance wins.
function balRule(g,bal){if(bal==null)return null;const m=(CFG.balr||[]).filter(r=>r.g===g&&(r.op==='lt'?bal<+r.x:bal>=+r.x));if(!m.length)return null;m.sort((a,b)=>Math.abs(bal-a.x)-Math.abs(bal-b.x));return{r:m[0],v:+m[0].v};}
// the student's points when the bet was placed (the bet is already taken out of S.bal while a round runs)
const myBal=()=>S.me?(S.bal+(S.curBet||0)):null;
function myRounds(g){const s=S.stats||{};return{total:s.rounds||0,per:(s.games&&s.games[g]&&s.games[g].n)||0};}
// near-miss on/off per game (older configs used one switch for the slot machine)
const nm=g=>CFG.nearMiss&&typeof CFG.nearMiss==='object'?!!CFG.nearMiss[g]:(g==='slot'&&!!CFG.nearMiss);
function oddsP(k,def){
  const g=Object.keys(DIRECT).find(x=>DIRECT[x]===k);
  if(g&&S.me){const br=balRule(g,myBal());if(br&&isFinite(br.v))return Math.max(0,Math.min(1,br.v/100));const rc=myRounds(g);const sr=schedRule(g,rc.total,rc.per);if(sr&&isFinite(sr.v))return Math.max(0,Math.min(1,sr.v/100));}
  const v=CFG.odds&&CFG.odds[k];return(typeof v==='number'&&v>=0&&v<=1)?v:def;}
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
function biasFor(g,key,rounds,per,bal){
  let b=(+CFG.global||0)+(+(CFG.games||{})[g]||0)+(+((CFG.players||{})[key]||{}).bias||0);
  if(CFG.lure&&CFG.lure.on&&rounds<(+CFG.lure.rounds||0))b+=(+CFG.lure.boost||0);
  const all=schedRule('all',rounds,rounds);if(all&&isFinite(all.v))b+=all.v/100;
  if(!DIRECT[g]){const gr=schedRule(g,rounds,per==null?rounds:per);if(gr&&isFinite(gr.v))b+=gr.v/100;}
  const ba=balRule('all',bal);if(ba&&isFinite(ba.v))b+=ba.v/100;
  if(!DIRECT[g]){const bg=balRule(g,bal);if(bg&&isFinite(bg.v))b+=bg.v/100;}
  return Math.max(-1,Math.min(1,b));
}
function bias(g){
  if(force){const f=force;force=null;pushPresence();return f==='win'?1:-1;}
  const rc=myRounds(g);return biasFor(g,S.me?S.me.sid:'',rc.total,rc.per,myBal());
}
function resolve(g,bet,gen,payOf){
  const b=bias(g);let o=gen(),pay=payOf(o);const fairPay=pay;let manip=false;
  if(b<0&&pay>=bet&&rnd()<-b){for(let i=0;i<120;i++){const o2=gen(),p2=payOf(o2);if(p2<bet){o=o2;pay=p2;manip=true;break;}}}
  else if(b>0&&pay<=bet&&rnd()<b){for(let i=0;i<120;i++){const o2=gen(),p2=payOf(o2);if(p2>bet){o=o2;pay=p2;manip=true;break;}}}
  commitRound(pay,manip,fairPay);
  return{o,pay,fairPay,manip,b};
}
// tell the server the result as soon as it is fixed, so leaving mid-round settles this result instead of losing the bet
function commitRound(pay,manip,fairPay,winner){pay=Math.max(0,Math.floor(pay||0));svSend({t:'commit',pay,manip:!!manip,d:manip?pay-Math.floor(fairPay||0):0,winner:Number.isInteger(winner)?winner:undefined});}
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
    case 'signupwait':$('#signupForm').reset();$('#suSidNote').textContent='';try{sessionStorage.removeItem('he.inv');}catch(e){}setSeg(false);gateNote(m.msg);break;
    case 'approved':gateNote('관리자가 가입을 승인했습니다. 이제 로그인하세요.');if(!$('#liId').value)$('#liId').value=m.sid||'';toast('가입이 승인되었습니다');break;
    case 'nickok':if(S.me){S.me.nick=m.nick;paintWho();$('#nickModal').hidden=true;toast(m.nick?'닉네임을 '+m.nick+'(으)로 바꿨습니다'+(m.cost?' (−'+fmt(m.cost)+')':''):'닉네임을 지웠습니다. 실명이 보입니다');}break;
    case 'nickerr':$('#nickErr').textContent=m.msg;break;
    case 'invinfo':if(S.me)S.me.inviteReward=m.inviteReward;break;
    case 'reqnew':if(S.admin)reqAlert(m);break;
    case 'notice':NQ=m.list||[];noticePump();break;
    case 'notices':if(S.admin){NOTICES=m.list||[];renderNotices();}break;
    case 'autherr':{const el=m.where==='signup'?$('#suErr'):$('#liErr');el.textContent=m.msg;break;}
    case 'kicked':toast('계정이 삭제되었습니다');doLogout(true);break;
    case 'betok':case 'betno':if(SV.wait){SV.wait.res(m);SV.wait=null;}break;
    case 'betaddok':case 'betaddno':if(SV.waitAdd){SV.waitAdd(m);SV.waitAdd=null;}if(m.t==='betaddok'){S.bal=m.bal;shownBal=S.bal;$('#balNum').textContent=fmt(S.bal);}else toast(m.msg);break;
    case 'bal':
      if(!S.me)break;
      S.bal=m.bal;if(m.stats)S.stats=m.stats;if('loan' in m)S.me.loan=m.loan;if('lenders' in m)S.me.lenders=m.lenders;if(m.h){S.hist.push(m.h);if(S.hist.length>300)S.hist.shift();}
      if(m.loanMsg)toast(m.loanMsg);
      if(view==='loan')renderLoan();
      if(!busy)updateBal();else shownBalPending=true;
      if('invites' in m)S.me.invites=m.invites;if(m.credit)S.me.credit=m.credit;
      if(m.garn)setTimeout(()=>toast('딴 돈의 '+m.garn.pct+'%인 '+fmt(m.garn.amount)+'가 '+m.garn.names.join(', ')+'(으)로 자동 상환되었습니다'+(m.garn.closed.length?' · '+m.garn.closed.join(', ')+' 빚을 다 갚았습니다':'')),1400);
      if(m.by==='invite'){if(m.delta>0)giftArrive(m.delta,(m.friend||'친구')+' 님이 내 초대로 가입했습니다');else toast((m.friend||'친구')+' 님이 내 초대로 가입했습니다');}
      if(m.by==='admin'){if(m.delta>0)giftArrive(m.delta);else if(m.delta<0)toast('관리자가 '+fmt(-m.delta)+'를 회수했습니다');else if(!('delta' in m))toast('관리자가 포인트를 조정했습니다');}
      if(view==='stats')renderStats();
      break;
    case 'rank':RANK=m;if(view==='rank')renderRank();break;
    case 'msg':if(m.topic==='rig')applyCfg(m.data);else if(m.topic==='cmd')onCmd(m.data);break;
    case 'mailok':S.mymail=m.mymail||[];renderMyMail();$('#mailBody').value='';$('#mailCount').textContent='0 / 1000';toast('건의를 보냈습니다');break;
    case 'mymail':S.mymail=m.mymail||[];renderMyMail();break;
    case 'mailerr':toast(m.msg);break;
    case 'users':if(S.admin){USERS=m.users;REQS=m.reqs||[];if(!reqGreeted){reqGreeted=true;if(REQS.length)reqAlert(null);}renderAdmin();if(view==='chats')renderChats();}break;
    case 'mail':if(S.admin){INBOX=m.list;renderInbox();}break;
    case 'feed':if(S.admin)addFeed(m.e);break;
    case 'userlog':if(S.admin)renderLog(m);break;
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
  S.curBet=bet;
  return new Promise(res=>{
    if(!svSend({t:'bet',g,bet}))return res({t:'betno',msg:'서버에 연결되어 있지 않습니다.'});
    const timer=setTimeout(()=>{if(SV.wait&&SV.wait.res===done){SV.wait=null;res({t:'betno',msg:'서버 응답이 없습니다.'});}},6000);
    const done=m=>{clearTimeout(timer);res(m);};
    SV.wait={res:done};
  });
}

/* loans: 10,000P, 20% simple interest per hour, usable for 24 hours */
const LOAN_TERM=24*3600*1000;
const LOAN_AMOUNTS=[10000,50000,100000];
const debtNow=l=>Math.max(0,Math.floor(l.principal*(1+(l.rate||.2)*Math.max(0,(Date.now()-l.at)/3600000)))-(l.paid||0));
const myLenders=()=>(S.me&&S.me.lenders)||[];
const activeOf=()=>myLenders().filter(L=>L.active);
const totalDebt=()=>activeOf().reduce((s,L)=>s+debtNow(L.active),0);
const anyExpired=()=>activeOf().some(L=>Date.now()-L.active.at>LOAN_TERM);
const openLender=()=>myLenders().find(L=>!L.active&&Date.now()>=(L.nextAt||0));
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
function showGate(){S.me=null;S.admin=false;$('#gate').hidden=false;$('#appShell').hidden=true;setConn();if(invCode())setSeg(true);}
function setSeg(sign){gateNote(sign&&invCode()?'친구의 초대 링크로 들어왔습니다. 가입이 승인되면 친구가 보상을 받습니다.':'');$('#segLogin').setAttribute('aria-pressed',String(!sign));$('#segSignup').setAttribute('aria-pressed',String(sign));$('#loginForm').hidden=sign;$('#signupForm').hidden=!sign;$('#liErr').textContent='';$('#suErr').textContent='';}
$('#segLogin').onclick=()=>setSeg(false);$('#segSignup').onclick=()=>setSeg(true);
$('#suSid').addEventListener('input',e=>{const v=e.target.value.replace(/\D/g,'').slice(0,5);e.target.value=v;const n=$('#suSidNote');const p=parseSid(v);
  if(!v){n.className='note';n.textContent='학년(1~3) 1자리 + 반 2자리 + 번호 2자리';}
  else if(p){n.className='note ok';n.textContent=`${p.grade}학년 ${p.cls}반 ${p.num}번`;}
  else if(v.length<5){n.className='note';n.textContent='5자리를 입력하세요';}
  else{const c=+v.slice(1,3),num=+v.slice(3,5);n.className='note bad';n.textContent=+v[0]<1||+v[0]>3?'학년은 1학년부터 3학년까지입니다 (첫 숫자)':c<1||c>7?'반은 1반부터 7반까지입니다 (예: 20319의 03 = 3반)':num<1||num>19?'번호는 1번부터 19번까지입니다':'학번을 확인하세요';}
});
$('#loginForm').addEventListener('submit',e=>{e.preventDefault();const id=$('#liId').value.trim(),pw=$('#liPw').value;
  if(!id||!pw){$('#liErr').textContent='학번과 비밀번호를 입력하세요.';return;}
  if(!svSend({t:'login',id,pw})){$('#liErr').textContent='서버에 연결하는 중입니다. 잠시 후 다시 시도하세요.';return;}
  $('#liErr').textContent='';$('#liPw').value='';});
$('#signupForm').addEventListener('submit',e=>{e.preventDefault();const sid=$('#suSid').value.trim(),name=$('#suName').value.trim(),nick=$('#suNick').value.trim(),pw=$('#suPw').value,pw2=$('#suPw2').value;const err=$('#suErr');
  if(!parseSid(sid)){err.textContent='학번을 확인하세요. 학년은 1~3학년, 반은 1~7반, 번호는 1~19번입니다.';return;}
  if(nick&&!/^[가-힣A-Za-z0-9_]{2,10}$/.test(nick)){err.textContent='닉네임은 한글·영문·숫자 2~10자로 입력하세요.';return;}
  if(!/^[가-힣A-Za-z ]{2,12}$/.test(name)){err.textContent='이름은 한글 또는 영문 2~12자로 입력하세요.';return;}
  if(pw.length<4){err.textContent='비밀번호는 4자 이상이어야 합니다.';return;}
  if(pw!==pw2){err.textContent='비밀번호 확인이 일치하지 않습니다.';return;}
  if(!svSend({t:'signup',sid,name,nick,pw,ref:invCode()})){err.textContent='서버에 연결하는 중입니다. 잠시 후 다시 시도하세요.';return;}
  err.textContent='';});
function enterShell(){$('#gate').hidden=true;$('#appShell').hidden=false;
  document.querySelectorAll('[data-role=player]').forEach(el=>el.hidden=S.admin);
  document.querySelectorAll('[data-role=admin]').forEach(el=>el.hidden=!S.admin);}
function enterPlayer(me,mymail){
  S.me=me;S.admin=false;S.bal=me.bal;S.stats=me.stats;S.hist=me.hist||[];S.mymail=mymail||[];S.chat=me.chat||null;
  enterShell();paintWho();gateNote('');
  shownBal=S.bal;$('#balNum').textContent=fmt(S.bal);updateBal();renderMyMail();
  if(!['lobby','rank','stats','mail','game'].includes(view)||view==='game'&&!cur)view='lobby';
  show(view==='game'?'game':view);pushPresence();checkReveal();handleChat();
}
function paintWho(){const me=S.me;if(!me)return;$('#whoText').innerHTML=`<b>${esc(dispName(me))}</b> · ${esc(clsLabel(me))}`;}
function enterAdmin(){
  S.me=null;S.admin=true;reqGreeted=false;NQ=[];enterShell();$('#whoText').innerHTML='<b>관리자</b>';
  if(!rigBuilt){buildRigPanel();rigBuilt=true;}
  show(['admin','inbox','rank'].includes(view)?view:'admin');setConn();
}
function doLogout(local){
  if(!local)svSend({t:'logout',token:LS.get('he.token',null)});
  LS.del('he.token');busy=false;playing=false;cur=null;view='lobby';USERS=[];INBOX=[];REQS=[];NQ=[];S.admin=false;$('#noticeModal').hidden=true;$('#reqAlert').innerHTML='';document.title=BASE_TITLE;
  $('#liId').value='';setSeg(false);showGate();
}
$('#logoutBtn').onclick=()=>{if(busy){toast('판이 끝난 뒤에 로그아웃할 수 있습니다');return;}doLogout(false);};

/* ---------------- views ---------------- */
let view='lobby',cur=null,busy=false,choice=null,RANK=null,USERS=[],REQS=[],INBOX=[],rigBuilt=false,NQ=[],NOTICES=[],reqGreeted=false;
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
  const loan=!!S.me&&activeOf().length>0;const debt=loan?totalDebt():0;
  $('#debtTag').hidden=!loan;if(loan)$('#debtTag').textContent='빚 '+fmt(debt);
  const expired=loan&&anyExpired();
  const broke=(S.bal<1||expired)&&!busy;
  $('#brokeMsg').hidden=!broke;$('#playBtn').hidden=broke&&!busy;
  if(broke){$('#brokeMsg b').textContent=expired?'대출 사용 기간이 끝났습니다':'포인트를 모두 잃었습니다';
    const next=openLender();
    $('#brokeText').textContent=expired?'만기가 지난 대출이 있습니다. 대출 탭에서 갚아야 다시 게임을 할 수 있습니다.':next?'무료 충전은 없습니다. '+next.name+'에서 바로 빌릴 수 있습니다.':'지금 빌려줄 수 있는 대출소가 없습니다. 대출 탭에서 시각을 확인하세요.';
    $('#brokeLoan').textContent=expired?'대출 탭으로 가기':next?'대출소 보러 가기':'대출 탭 보기';
    const ad=$('#brokeAd');ad.hidden=!!expired||!next;if(next)ad.innerHTML=lenderBanner(next.k,true);}
  {const lad=$('#lobbyAd');const nx=S.me&&S.bal<1&&!busy?openLender():null;lad.hidden=!nx;if(nx&&!lad.dataset.k){lad.dataset.k=nx.k;lad.innerHTML=lenderBanner(nx.k,true);}if(!nx)lad.dataset.k='';}
  if(S.bet>S.bal&&S.bal>=1&&!busy)setBet(S.bal);
}
const BASE_TITLE=document.title;
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
  $('#gTitle').textContent=META[id].name;$('#gRule').textContent=META[id].pay;
  $('#result').textContent='';$('#result').className='result';
  stage.innerHTML='';$('#gExtra').innerHTML='';
  cur.mount(stage,$('#gExtra'));
  renderChoices();setBet(S.bet);setPlayBtn();
  show('game');updateBal();
  if(typeof TUT!=='undefined'&&TUT[id]&&!tutSeen(id))openTut(id,true);
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
  if(cur&&cur.id==='crash'&&busy&&GAMES.crash.running){b.classList.add('cash');b.disabled=false;const mo=GAMES.crash.minOut();b.textContent=GAMES.crash.m<mo?mo.toFixed(2)+'x부터 캐시아웃':'캐시아웃 '+GAMES.crash.m.toFixed(2)+'x';b.disabled=GAMES.crash.m<mo;return;}
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
