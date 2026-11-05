
/* ---------------- lobby ---------------- */
const ART={
  coin:`<div class="mini-coin">앞</div>`,
  rps:`<div class="mini-glyph">✌️</div>`,
  horse:`<div class="mini-glyph" style="transform:scaleX(-1)">🏇</div>`,
  snail:`<div class="mini-glyph" style="transform:scaleX(-1)">🐌</div>`,
  oddeven:`<div class="mini-dice"><div class="die" style="width:48px;height:48px;padding:7px;border-radius:9px">${'<i></i>'.repeat(9)}</div><div class="die" style="width:48px;height:48px;padding:7px;border-radius:9px">${'<i></i>'.repeat(9)}</div></div>`,
  baccarat:`<div class="mini-cards"><span>A♠</span><span>9♥</span></div>`,
  slot:`<div class="mini-slot"><span>7</span><span>7</span><span>7</span></div>`,
  crash:`<svg width="140" height="76" viewBox="0 0 150 80"><path d="M5 75 Q 90 72 140 10" stroke="#c9a560" stroke-width="3" fill="none"/><circle cx="140" cy="10" r="5" fill="#d9d3c8"/><text x="10" y="30" font-family="DM Mono, monospace" font-size="18" fill="#d9d3c8">2.41x</text></svg>`
};
$('#games').innerHTML=GIDS.map((id,i)=>`<button type="button" class="gcard" data-g="${id}"><div class="gart">${ART[id]}<span class="gkey">${String(i+1).padStart(2,'0')}</span></div><div class="gbody"><h3>${META[id].name}</h3><p>${META[id].desc}</p><div class="gmeta"><span>${META[id].pay}</span><span>RTP ${META[id].rtp}%</span></div></div></button>`).join('');
document.querySelectorAll('.mini-dice .die').forEach((d,i)=>setDie(d,i?5:2));
$('#games').addEventListener('click',e=>{const c=e.target.closest('.gcard');if(c)openGame(c.dataset.g);});

/* ---------------- ranking ---------------- */
let rankCls=null;
function renderRank(){
  const board=$('#classBoard'),tbl=$('#rankTbl');
  if(!RANK){board.innerHTML='<div class="hint">랭킹을 불러오는 중…</div>';tbl.innerHTML='';return;}
  if(rankCls==null)rankCls=S.me?S.me.cls:1;
  $('#rankAt').textContent='갱신 '+new Date(RANK.at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  let place=0;
  board.innerHTML=RANK.classes.map(c=>{const has=c.avg!=null;if(has)place++;
    return `<button type="button" class="cboard ${has&&place===1?'first':''}" data-c="${c.cls}" aria-pressed="${c.cls===rankCls}"><span class="rk">${has?place+'위':'–'}</span><b>${c.cls}반</b><span class="rate ${has?(c.avg>=0?'pos':'neg'):''}">${has?pfmt(c.avg):'참가자 없음'}</span><small>${c.n}명${c.top?' · 1등 '+esc(c.top.name):''}</small></button>`;}).join('');
  $('#classTabs').innerHTML=[1,2,3,4,5,6,7].map(k=>`<button type="button" data-c="${k}" aria-pressed="${k===rankCls}">${k}반</button>`).join('');
  const list=RANK.byClass[rankCls]||[];
  tbl.innerHTML=`<thead><tr><th>순위</th><th>번호</th><th>이름</th><th class="n">자산</th><th class="n">수익률</th><th class="n">판수</th></tr></thead><tbody>${
    list.length?list.map((u,i)=>`<tr class="${S.me&&u.sid===S.me.sid?'me':''}"><td><span class="medal ${i<3?'m'+(i+1):''}">${i+1}</span></td><td>${u.grade}학년 ${u.num}번</td><td>${esc(u.name)}${S.me&&u.sid===S.me.sid?' <span class="tag on">나</span>':''}</td><td class="n">${fmt(u.bal)}</td><td class="n ${u.rate>=0?'pos':'neg'}">${pfmt(u.rate)}</td><td class="n">${u.rounds}</td></tr>`).join('')
    :`<tr><td colspan="6" class="hint" style="text-align:center;padding:20px">${rankCls}반에는 아직 가입한 학생이 없습니다.</td></tr>`}</tbody>`;
}
$('#classBoard').addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b){rankCls=+b.dataset.c;renderRank();}});
$('#classTabs').addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b){rankCls=+b.dataset.c;renderRank();}});

/* ---------------- stats ---------------- */
function renderStats(){
  if(!S.stats)return;const st=S.stats;
  $('#statKpis').innerHTML=`<div class="kpi"><span>총 판수</span><b>${st.rounds.toLocaleString()}</b></div><div class="kpi"><span>승률</span><b>${st.rounds?(st.wins/st.rounds*100).toFixed(1):'0.0'}%</b></div><div class="kpi"><span>총 베팅액</span><b>${fmt(st.wag)}</b></div><div class="kpi"><span>게임 누적 손익</span><b class="${st.net>=0?'pos':'neg'}">${sfmt(st.net)}</b></div><div class="kpi"><span>보유 포인트</span><b>${fmt(S.bal)}</b></div>`;
  $('#statTbl').innerHTML=`<thead><tr><th>게임</th><th class="n">판 수</th><th class="n">승률</th><th class="n">베팅액</th><th class="n">누적 손익</th><th class="n">실제 환급률</th></tr></thead><tbody>${GIDS.map(g=>{const r=(st.games&&st.games[g])||{n:0,w:0,net:0,wag:0};return`<tr><td>${META[g].name}</td><td class="n">${r.n}</td><td class="n">${r.n?(r.w/r.n*100).toFixed(1)+'%':'–'}</td><td class="n">${fmt(r.wag)}</td><td class="n ${r.net>=0?'pos':'neg'}">${sfmt(r.net)}</td><td class="n">${r.wag?((r.wag+r.net)/r.wag*100).toFixed(1)+'%':'–'}</td></tr>`;}).join('')}</tbody>`;
  const sel=$('#chartSel');const v=sel.value||'all';sel.innerHTML=`<option value="all">전체</option>`+GIDS.map(g=>`<option value="${g}">${META[g].name}</option>`).join('');sel.value=v;
  drawChart();
}
$('#chartSel').addEventListener('change',drawChart);
function drawChart(){
  const cv=$('#chart');const g=$('#chartSel').value||'all';const hs=g==='all'?S.hist:S.hist.filter(h=>h.g===g);
  const dpr=window.devicePixelRatio||1;const W=cv.clientWidth,H=260;if(!W)return;cv.width=W*dpr;cv.height=H*dpr;const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
  c.clearRect(0,0,W,H);c.font='11px DM Mono, monospace';
  const pts=[0];let acc=0;for(const h of hs){acc+=h.p-h.b;pts.push(acc);}
  if(pts.length<2){c.fillStyle='#8a857c';c.fillText('아직 기록이 없습니다.',16,H/2);return;}
  const L=70,R=14,T=14,B=26;let mn=Math.min(...pts),mx=Math.max(...pts);if(mn===mx){mn-=100;mx+=100;}const pad=(mx-mn)*.08;mn-=pad;mx+=pad;
  const X=i=>L+(W-L-R)*i/(pts.length-1),Y=v=>T+(H-T-B)*(mx-v)/(mx-mn);
  c.strokeStyle='#ffffff10';c.fillStyle='#8a857c';
  for(let k=0;k<=4;k++){const v=mn+(mx-mn)*k/4;c.beginPath();c.moveTo(L,Y(v));c.lineTo(W-R,Y(v));c.stroke();c.fillText(sfmt(v),4,Y(v)+4);}
  c.fillText('1판',L,H-8);c.fillText(hs.length+'판',W-R-40,H-8);
  if(mn<0&&mx>0){c.strokeStyle='#ffffff40';c.setLineDash([4,4]);c.beginPath();c.moveTo(L,Y(0));c.lineTo(W-R,Y(0));c.stroke();c.setLineDash([]);}
  const last=pts[pts.length-1];const col=last>=0?'#5a9e77':'#b4473e';
  c.beginPath();c.moveTo(X(0),Y(0));pts.forEach((v,i)=>c.lineTo(X(i),Y(v)));c.lineTo(X(pts.length-1),Y(Math.max(mn,Math.min(mx,0))));c.closePath();c.fillStyle=last>=0?'#5a9e771c':'#b4473e1c';c.fill();
  c.beginPath();pts.forEach((v,i)=>i?c.lineTo(X(i),Y(v)):c.moveTo(X(i),Y(v)));c.strokeStyle=col;c.lineWidth=2;c.stroke();
  c.beginPath();c.arc(X(pts.length-1),Y(last),4,0,7);c.fillStyle=col;c.fill();
}
window.addEventListener('resize',()=>{if(view==='stats')drawChart();});

/* ---------------- suggestion box ---------------- */
const dt=t=>{const d=new Date(t);return`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
$('#mailBody').addEventListener('input',e=>{$('#mailCount').textContent=e.target.value.length+' / 1000';});
$('#mailForm').addEventListener('submit',e=>{e.preventDefault();const body=$('#mailBody').value.trim();if(!body){toast('내용을 입력하세요');return;}if(!svSend({t:'mail',body}))toast('서버에 연결되어 있지 않습니다');});
function renderMyMail(){
  const el=$('#myMail');if(!el)return;
  if(!S.mymail.length){el.innerHTML='<div class="hint">아직 보낸 건의가 없습니다.</div>';return;}
  el.innerHTML='';
  for(const m of S.mymail){const d=document.createElement('div');d.className='mitem';
    d.innerHTML=`<div class="meta"><span>${dt(m.t)}</span><span class="tag ${m.read?'on':''}">${m.read?'관리자가 읽음':'안 읽음'}</span></div><p></p>`;d.querySelector('p').textContent=m.body;el.appendChild(d);}
}

/* ---------------- reveal ---------------- */
let revealShown=false;
function checkReveal(){
  $('#revealBar').hidden=!(CFG.reveal&&S.me);
  if(CFG.reveal&&!revealShown&&S.me){revealShown=true;openReveal();}
  if(!CFG.reveal)revealShown=false;
}
$('#revealOpen').onclick=openReveal;
function openReveal(){
  if(!S.stats)return;const st=S.stats;let fairExp=0;
  for(const g of GIDS){const r=st.games&&st.games[g];if(r)fairExp+=r.wag*(META[g].rtp/100-1);}
  const m=$('#revealModal');
  m.innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-labelledby="rvT" style="border-color:#4a1d19"><div class="eyebrow">공개</div><h2 id="rvT" style="color:#e08a80">이 카지노는 조작되어 있었습니다</h2>
  <p>플레이하는 동안 관리자는 실시간으로 당신의 포인트를 보고, 확률을 바꾸고, 진행 중인 판의 결과를 뒤집을 수 있었습니다. 화면에는 아무 표시도 나타나지 않았습니다.</p>
  <div class="big"><div class="kpi"><span>플레이한 판</span><b>${st.rounds}</b></div><div class="kpi"><span>결과가 바뀐 판</span><b class="neg">${st.manip}</b></div><div class="kpi"><span>조작으로 달라진 포인트</span><b class="${st.md>=0?'pos':'neg'}">${sfmt(st.md)}</b></div><div class="kpi"><span>실제 게임 손익</span><b class="${st.net>=0?'pos':'neg'}">${sfmt(st.net)}</b></div><div class="kpi"><span>공정했다면 기대 손익</span><b>${sfmt(fairExp)}</b></div><div class="kpi"><span>남은 포인트</span><b>${fmt(S.bal)}</b></div></div>
  ${CFG.lure&&CFG.lure.on?`<p>처음 ${CFG.lure.rounds}판은 이기기 쉽게 설정되어 있었습니다. 초반의 승리는 계속 하게 만들기 위한 미끼였습니다.</p>`:''}
  <div class="help"><b>조작이 없어도 하우스가 이깁니다.</b> 모든 게임의 환급률은 100% 미만이라 오래 할수록 잃습니다. 불법 온라인 도박 사이트는 여기에 더해 결과 조작, 출금 거부, 개인정보 유출 위험까지 있습니다. 상담: 한국도박문제예방치유원 <b>1336</b></div>
  <div><button class="btn" type="button" id="rvClose">닫기</button></div></div>`;
  m.hidden=false;$('#rvClose').onclick=()=>m.hidden=true;
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#revealModal').hidden=true;$('#installModal').hidden=true;}});

/* ---------------- admin console ---------------- */
const rows=new Map();const feed=[];
const pct=v=>Math.round((+v||0)*100);
const biasText=v=>{const p=pct(v);return(p>0?'+':'')+p+'%';};
function sendCmd(to,type,extra){if(!svSend({t:'emit',topic:'cmd',data:Object.assign({to,type},extra||{})}))toast('서버에 연결되어 있지 않습니다');else toast('명령을 보냈습니다');}
let rigTimer=null;
function saveCfg(){CFG.v=Date.now();clearTimeout(rigTimer);rigTimer=setTimeout(()=>svSend({t:'emit',topic:'rig',data:CFG}),250);}
function buildRigPanel(){
  const el=$('#rigList');
  el.innerHTML=`
  <div><label for="rgGlobal">전체 학생 승률 조정</label><div class="slider-row"><input type="range" id="rgGlobal" min="-100" max="100" step="5"><output id="rgGlobalV"></output></div>
  <div class="sub">음수: 학생이 이긴 판을 그 확률로 패배로 바꿉니다. 양수: 진 판을 승리로 바꿉니다.</div></div>
  <div><div style="font-size:13px;margin-bottom:4px">게임별 조정</div>${GIDS.map(g=>`<div class="slider-row"><label for="rg_${g}" style="width:84px;font-size:12px">${META[g].name}</label><input type="range" id="rg_${g}" min="-100" max="100" step="5"><output id="rg_${g}V"></output></div>`).join('')}</div>
  <div class="toggle"><span><label for="rgLure">미끼 모드</label><div class="sub">처음 몇 판은 승률을 올려 줍니다.</div></span><input type="checkbox" id="rgLure"></div>
  <div class="slider-row"><label for="rgLureN" style="font-size:12px;width:84px">대상 판수</label><input type="number" id="rgLureN" min="1" max="200" style="width:64px"><label for="rgLureB" style="font-size:12px">보정</label><input type="range" id="rgLureB" min="0" max="100" step="5"><output id="rgLureBV"></output></div>
  <div class="toggle"><span><label for="rgNear">니어미스 연출</label><div class="sub">슬롯에서 진 판을 7·7·(아깝게 빗나감)으로 보여 줍니다.</div></span><input type="checkbox" id="rgNear"></div>
  <div class="toggle"><span><label for="rgReveal">폭로 모드</label><div class="sub">모든 학생에게 조작 사실과 개인별 피해를 공개합니다.</div></span><input type="checkbox" id="rgReveal"></div>
  <div class="abtns" style="margin-top:6px"><button type="button" class="abtn l" id="allLose">전원 다음 판 패배</button><button type="button" class="abtn w" id="allWin">전원 다음 판 승리</button><button type="button" class="abtn" id="rigReset">조작 모두 초기화</button></div>`;
  const bind=(id,fn)=>$(id).addEventListener('input',fn);
  bind('#rgGlobal',e=>{CFG.global=e.target.value/100;$('#rgGlobalV').textContent=biasText(CFG.global);saveCfg();refreshEff();});
  GIDS.forEach(g=>bind('#rg_'+g,e=>{CFG.games[g]=e.target.value/100;$('#rg_'+g+'V').textContent=biasText(CFG.games[g]);saveCfg();refreshEff();}));
  $('#rgLure').addEventListener('change',e=>{CFG.lure.on=e.target.checked;saveCfg();refreshEff();});
  $('#rgLureN').addEventListener('change',e=>{CFG.lure.rounds=Math.max(1,Math.floor(+e.target.value||10));saveCfg();refreshEff();});
  bind('#rgLureB',e=>{CFG.lure.boost=e.target.value/100;$('#rgLureBV').textContent=biasText(CFG.lure.boost);saveCfg();refreshEff();});
  $('#rgNear').addEventListener('change',e=>{CFG.nearMiss=e.target.checked;saveCfg();});
  $('#rgReveal').addEventListener('change',e=>{CFG.reveal=e.target.checked;saveCfg();toast(CFG.reveal?'모든 학생에게 공개합니다':'공개를 껐습니다');});
  $('#allLose').onclick=()=>sendCmd('all','force',{want:'lose'});
  $('#allWin').onclick=()=>sendCmd('all','force',{want:'win'});
  $('#rigReset').onclick=()=>{const keep=CFG.reveal;CFG=JSON.parse(JSON.stringify(DEF_CFG));CFG.reveal=keep;saveCfg();syncRigPanel();refreshEff();sendCmd('all','clearforce');};
  syncRigPanel();
}
function syncRigPanel(){
  if(!$('#rgGlobal'))return;const act=document.activeElement;
  const setR=(id,v)=>{const el=$(id);if(el&&el!==act)el.value=pct(v);const o=$(id+'V');if(o)o.textContent=biasText(v);};
  setR('#rgGlobal',CFG.global);GIDS.forEach(g=>setR('#rg_'+g,CFG.games[g]||0));setR('#rgLureB',CFG.lure.boost);
  $('#rgLure').checked=!!CFG.lure.on;if($('#rgLureN')!==act)$('#rgLureN').value=CFG.lure.rounds;$('#rgNear').checked=!!CFG.nearMiss;$('#rgReveal').checked=!!CFG.reveal;
  rows.forEach(r=>{const v=((CFG.players||{})[r.sid]||{}).bias||0;if(r.slider!==act)r.slider.value=pct(v);r.out.textContent=biasText(v);});
}
function refreshEff(){rows.forEach(r=>r.updateEff());}
['#fCls','#fOnline','#fQ'].forEach(id=>$(id).addEventListener('input',()=>renderAdmin()));
function renderAdmin(){
  if(!S.admin)return;
  const users=USERS||[];
  const tot=users.reduce((a,u)=>a+u.bal,0),house=users.reduce((a,u)=>a-u.stats.net,0),online=users.filter(u=>u.online).length,live=users.filter(u=>u.pending).length,man=users.reduce((a,u)=>a+u.stats.manip,0),broke=users.filter(u=>u.bal<1).length;
  $('#akpis').innerHTML=`<div class="akpi"><span>가입 학생</span><b>${users.length}명</b></div><div class="akpi"><span>접속 중</span><b>${online}명</b></div><div class="akpi"><span>진행 중인 판</span><b>${live}</b></div><div class="akpi"><span>학생 자산 합계</span><b>${fmt(tot)}</b></div><div class="akpi"><span>하우스 게임 수익</span><b class="${house>=0?'pos':'neg'}">${sfmt(house)}</b></div><div class="akpi"><span>조작된 판 · 파산</span><b>${man} · ${broke}명</b></div>`;
  if(view!=='admin')return;
  const fc=$('#fCls').value,fo=$('#fOnline').value,q=$('#fQ').value.trim();
  const body=$('#admBody');const seen=new Set();
  for(const u of users){
    if(fc&&String(u.cls)!==fc)continue;if(fo==='on'&&!u.online)continue;if(q&&!(u.name.includes(q)||u.sid.includes(q)))continue;
    seen.add(u.sid);let r=rows.get(u.sid);
    if(!r){r=makeRow(u);rows.set(u.sid,r);}
    body.appendChild(r.tr);r.update(u);
  }
  for(const [sid,r] of rows)if(!seen.has(sid)){r.tr.remove();rows.delete(sid);}
  $('#admEmpty').hidden=seen.size>0;
  $('#admEmpty').textContent=users.length?'조건에 맞는 학생이 없습니다.':'아직 가입한 학생이 없습니다.';
}
function makeRow(u){
  const tr=document.createElement('tr');const sid=u.sid;
  tr.innerHTML=`<td class="pname"><b></b><small></small></td><td class="n bl"></td><td class="n rt"></td><td class="st"></td><td class="n rw"></td><td class="n man"></td>
  <td><div class="ctl"><div class="slider-row"><input type="range" min="-100" max="100" step="5" aria-label="개인 승률 조정"><output></output></div><div class="hint eff" style="color:var(--smute);font-size:11px"></div>
  <div class="abtns"><button type="button" class="abtn w" data-c="fw">다음 판 승리</button><button type="button" class="abtn l" data-c="fl">다음 판 패배</button><button type="button" class="abtn w" data-c="lw">이번 판 승리</button><button type="button" class="abtn l" data-c="ll">이번 판 패배</button></div></div></td>
  <td><div class="ctl" style="min-width:200px"><div class="abtns"><input type="number" min="0" step="1000" placeholder="금액" aria-label="지급·회수 금액" class="amt"><button type="button" class="abtn w" data-c="add">지급</button><button type="button" class="abtn l" data-c="sub">회수</button><button type="button" class="abtn" data-c="set">설정</button></div>
  <details class="more"><summary>더보기</summary><div class="abtns" style="margin-top:5px"><input type="text" placeholder="새 비밀번호" aria-label="새 비밀번호" class="npw"><button type="button" class="abtn" data-c="pw">비밀번호 변경</button></div><div class="abtns" style="margin-top:5px"><button type="button" class="abtn l" data-c="del">계정 삭제</button></div></details></div></td>`;
  const r={tr,sid,u,slider:tr.querySelector('input[type=range]'),out:tr.querySelector('output'),amt:tr.querySelector('.amt'),npw:tr.querySelector('.npw'),delArm:0};
  const v=((CFG.players||{})[sid]||{}).bias||0;r.slider.value=pct(v);r.out.textContent=biasText(v);
  r.slider.addEventListener('input',()=>{CFG.players[sid]=Object.assign({},CFG.players[sid]||{},{bias:r.slider.value/100});r.out.textContent=biasText(CFG.players[sid].bias);saveCfg();r.updateEff();});
  tr.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(!b)return;const c=b.dataset.c;
    if(c==='fw')sendCmd(sid,'force',{want:'win'});else if(c==='fl')sendCmd(sid,'force',{want:'lose'});
    else if(c==='lw')sendCmd(sid,'live',{want:'win'});else if(c==='ll')sendCmd(sid,'live',{want:'lose'});
    else if(c==='add'||c==='sub'||c==='set'){const a=Math.floor(+r.amt.value);if(!(a>=0)||r.amt.value===''){toast('금액을 입력하세요');return;}svSend({t:'adm',op:c,sid,amount:a});r.amt.value='';}
    else if(c==='pw'){const p=r.npw.value;if(p.length<4){toast('새 비밀번호는 4자 이상이어야 합니다');return;}svSend({t:'adm',op:'pw',sid,pw:p});r.npw.value='';}
    else if(c==='del'){if(Date.now()-r.delArm>3000){r.delArm=Date.now();b.textContent='한 번 더 누르면 삭제';return;}svSend({t:'adm',op:'del',sid});}
  });
  r.updateEff=()=>{const p=r.u.presence||{};const g=GIDS.includes(p.game)?p.game:null;const e=biasFor(g||'_',sid,r.u.stats.rounds);tr.querySelector('.eff').textContent=(g?META[g].name+' ':'')+'실제 적용 '+biasText(e)+(p.force?` · 대기: 다음 판 ${p.force==='win'?'승리':'패배'}`:'');};
  r.update=(nu)=>{r.u=nu;const p=nu.presence||{};
    tr.querySelector('.pname b').innerHTML=`<span class="odot ${nu.online?'on':''}"></span>${esc(nu.name)}`;
    tr.querySelector('.pname small').textContent=`${nu.sid} · ${nu.grade}학년 ${nu.cls}반 ${nu.num}번`;
    tr.querySelector('.bl').textContent=fmt(nu.bal);
    const rate=(nu.bal-START)/START*100;const rt=tr.querySelector('.rt');rt.textContent=pfmt(rate);rt.className='n rt '+(rate>=0?'pos':'neg');
    const st=tr.querySelector('.st');const g=META[nu.pending?nu.pending.g:p.game];
    if(nu.pending){st.innerHTML=`<span class="st-play">${esc(g?g.name:'')}</span><div class="hint" style="color:var(--sink)">베팅 ${fmt(nu.pending.bet)}${p.pick?' · '+esc(p.pick):''}</div><div class="hint" style="color:var(--cyan)">${esc(p.live||'')}</div>`;}
    else st.innerHTML=`<span class="st-idle">${!nu.online?'오프라인':g?esc(g.name)+' 대기':({lobby:'로비',rank:'랭킹',stats:'기록',mail:'건의함'})[p.game]||'접속 중'}</span>${nu.bal<1?' <span class="tag" style="color:#e08a80;border-color:#5a2420">파산</span>':''}`;
    tr.querySelector('.rw').textContent=`${nu.stats.rounds} · ${nu.stats.rounds?Math.round(nu.stats.wins/nu.stats.rounds*100):0}%`;
    tr.querySelector('.man').textContent=nu.stats.manip+(nu.stats.md?` (${sfmt(nu.stats.md)})`:'');
    const canLive=!!nu.pending&&nu.online&&['horse','snail','crash'].includes(nu.pending.g);
    tr.querySelectorAll('[data-c=lw],[data-c=ll]').forEach(b=>{b.disabled=!canLive;b.title=canLive?'':'경마·달팽이·그래프 게임이 진행 중일 때만 쓸 수 있습니다';});
    tr.querySelectorAll('[data-c=fw],[data-c=fl]').forEach(b=>{b.disabled=!nu.online;b.title=nu.online?'':'접속 중일 때만 쓸 수 있습니다';});
    tr.querySelector('[data-c=ll]').textContent=nu.pending&&nu.pending.g==='crash'?'지금 터뜨리기':'이번 판 패배';
    r.updateEff();};
  return r;
}
function addFeed(e){feed.unshift(e);if(feed.length>80)feed.pop();
  const el=$('#feed');el.innerHTML=feed.map(f=>{const d=new Date(f.t);const net=f.p-f.b;return`<div><span style="color:var(--smute)">${[d.getHours(),d.getMinutes(),d.getSeconds()].map(v=>String(v).padStart(2,'0')).join(':')}</span><b>${f.cls}반 ${f.num}번 ${esc(f.name)}</b><span>${esc((META[f.g]||{}).name||f.g)}</span><span>베팅 ${fmt(f.b)}</span><span class="${net>=0?'pos':'neg'}">${sfmt(net)}</span>${f.m?'<span class="tg">조작됨</span>':''}</div>`;}).join('');}

/* inbox (admin) */
$('#inboxFilter').addEventListener('change',renderInbox);
function renderInbox(){
  const unread=(INBOX||[]).filter(m=>!m.read).length;const bd=$('#inboxBadge');bd.hidden=!unread;bd.textContent=unread;
  if(view!=='inbox')return;
  const el=$('#inboxList');const f=$('#inboxFilter').value;const list=(INBOX||[]).filter(m=>f!=='unread'||!m.read);
  if(!list.length){el.innerHTML='<div class="empty-note">받은 건의가 없습니다.</div>';return;}
  el.innerHTML='';
  for(const m of list){const d=document.createElement('div');d.className='mitem'+(m.read?'':' unread');
    d.innerHTML=`<div class="meta"><span><b style="color:var(--sink);font-weight:500"></b> · ${m.grade||''}학년 ${m.cls}반 ${m.num}번 · ${dt(m.t)}</span><span class="abtns"><button type="button" class="abtn" data-a="read">${m.read?'안 읽음으로':'읽음 표시'}</button><button type="button" class="abtn l" data-a="del">삭제</button></span></div><p></p>`;
    d.querySelector('.meta b').textContent=m.name;d.querySelector('p').textContent=m.body;
    let arm=0;d.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;
      if(b.dataset.a==='read')svSend({t:'adm',op:'mailread',id:m.id});
      else{if(Date.now()-arm>3000){arm=Date.now();b.textContent='한 번 더 누르면 삭제';return;}svSend({t:'adm',op:'maildel',id:m.id});}});
    el.appendChild(d);}
}

/* ---------------- app install (PWA) ---------------- */
(function(){
  if(!location.protocol.startsWith('http'))return;
  const standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
  const ua=navigator.userAgent;
  const os=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)?'ios':/android/i.test(ua)?'android':'desktop';
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(()=>{});
  let deferred=null;const btn=$('#installBtn');
  if(!standalone)btn.hidden=false;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;if(!standalone)btn.hidden=false;});
  window.addEventListener('appinstalled',()=>{deferred=null;btn.hidden=true;$('#installModal').hidden=true;toast('앱이 설치되었습니다');});
  btn.onclick=async()=>{
    if(deferred){deferred.prompt();try{const r=await deferred.userChoice;if(r&&r.outcome==='accepted')btn.hidden=true;}catch(e){}deferred=null;return;}
    document.querySelectorAll('#installModal .step').forEach(s=>s.classList.toggle('here',s.dataset.os===os));
    const steps=$('#installModal .steps');const here=steps.querySelector('.here');if(here)steps.prepend(here);
    $('#installModal').hidden=false;
  };
  $('#installClose').onclick=()=>{$('#installModal').hidden=true;};
})();

/* ---------------- boot ---------------- */
setBet(S.bet);showGate();svConnect();
