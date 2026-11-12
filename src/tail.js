
/* ---------------- lobby ---------------- */
const ART={
  coin:`<div class="mini-coin">앞</div>`,
  rps:`<div class="mini-glyph">✌️</div>`,
  horse:`<div class="mini-glyph" style="transform:scaleX(-1)">🏇</div>`,
  snail:`<div class="mini-glyph" style="transform:scaleX(-1)">🐌</div>`,
  oddeven:`<div class="mini-dice"><div class="die" style="width:48px;height:48px;padding:7px;border-radius:9px">${'<i></i>'.repeat(9)}</div><div class="die" style="width:48px;height:48px;padding:7px;border-radius:9px">${'<i></i>'.repeat(9)}</div></div>`,
  baccarat:`<div class="mini-cards"><span>A♠</span><span>9♥</span></div>`,
  slot:`<div class="mini-slot"><span>7</span><span>7</span><span>7</span></div>`,
  blackjack:`<div class="mini-cards"><span>A♣</span><span style="color:#16110f">K♠</span></div>`,
  roulette:`<svg width="86" height="86" viewBox="0 0 100 100" aria-hidden="true">${Array.from({length:18},(_,i)=>{const a0=i*20*Math.PI/180,a1=(i+1)*20*Math.PI/180;return `<path d="M50 50 L${50+46*Math.cos(a0)} ${50+46*Math.sin(a0)} A46 46 0 0 1 ${50+46*Math.cos(a1)} ${50+46*Math.sin(a1)} Z" fill="${i===0?'#2f6b45':i%2?'#9d2a20':'#16181a'}" stroke="#8a6a32" stroke-width=".6"/>`;}).join('')}<circle cx="50" cy="50" r="26" fill="#1c1e21" stroke="#8a6a32"/><circle cx="50" cy="50" r="7" fill="#a8823f"/><circle cx="74" cy="22" r="4" fill="#eeeae2"/></svg>`,
  crash:`<svg width="140" height="76" viewBox="0 0 150 80"><path d="M5 75 Q 90 72 140 10" stroke="#c9a560" stroke-width="3" fill="none"/><circle cx="140" cy="10" r="5" fill="#d9d3c8"/><text x="10" y="30" font-family="DM Mono, monospace" font-size="18" fill="#d9d3c8">2.41x</text></svg>`
};
$('#games').innerHTML=GIDS.map((id,i)=>`<button type="button" class="gcard" data-g="${id}"><div class="gart">${ART[id]}<span class="gkey">${String(i+1).padStart(2,'0')}</span></div><div class="gbody"><h3>${META[id].name}</h3><p>${META[id].desc}</p><div class="gmeta"><span>${META[id].pay}</span></div></div></button>`).join('');
document.querySelectorAll('.mini-dice .die').forEach((d,i)=>setDie(d,i?5:2));
$('#games').addEventListener('click',e=>{const c=e.target.closest('.gcard');if(c)openGame(c.dataset.g);});
function paintPaused(){
  document.querySelectorAll('.gcard').forEach(c=>{const p=isPaused(c.dataset.g);c.classList.toggle('paused',p);let b=c.querySelector('.pz');if(p&&!b){b=document.createElement('span');b.className='pz';b.textContent='일시 정지';c.querySelector('.gart').appendChild(b);}if(!p&&b)b.remove();});
  if(view==='game')setPlayBtn();
  const all=$('#pzAll');if(all){const p=CFG.paused||{};all.checked=!!p.all;GIDS.forEach(g=>{const el=$('#pz_'+g);if(el)el.checked=!!(p.games&&p.games[g]);});}
}

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
  $('#classTabs').innerHTML=[0,1,2,3,4,5,6,7].map(k=>`<button type="button" data-c="${k}" aria-pressed="${k===rankCls}">${k?k+'반':'전체'}</button>`).join('');
  const list=rankCls===0?(RANK.all||[]):(RANK.byClass[rankCls]||[]);
  tbl.innerHTML=`<thead><tr><th>순위</th><th>${rankCls===0?'반 · 번호':'번호'}</th><th>이름</th><th class="n">자산</th><th class="n">수익률</th><th class="n">판수</th></tr></thead><tbody>${
    list.length?list.map((u,i)=>`<tr class="${S.me&&u.sid===S.me.sid?'me':''}"><td><span class="medal ${i<3?'m'+(i+1):''}">${i+1}</span></td><td>${rankCls===0?u.grade+'학년 '+u.cls+'반 '+u.num+'번':u.grade+'학년 '+u.num+'번'}</td><td>${esc(u.name)}${u.real?' <span class="hint">('+esc(u.real)+')</span>':''}${S.me&&u.sid===S.me.sid?' <span class="tag on">나</span>':''}</td><td class="n">${fmt(u.bal)}${u.debt?' <span class="debt-tag">빚 '+fmt(u.debt)+'</span>':''}</td><td class="n ${u.rate>=0?'pos':'neg'}">${pfmt(u.rate)}</td><td class="n">${u.rounds}</td></tr>`).join('')
    :`<tr><td colspan="6" class="hint" style="text-align:center;padding:20px">${rankCls?rankCls+'반에는 ':''}아직 가입한 학생이 없습니다.</td></tr>`}</tbody>`;
}
$('#classBoard').addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b){rankCls=+b.dataset.c;renderRank();}});
$('#classTabs').addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b){rankCls=+b.dataset.c;renderRank();}});

/* ---------------- stats ---------------- */
function renderStats(){
  if(!S.stats)return;const st=S.stats;
  $('#statKpis').innerHTML=`<div class="kpi"><span>총 판수</span><b>${st.rounds.toLocaleString()}</b></div><div class="kpi"><span>승률</span><b>${st.rounds?(st.wins/st.rounds*100).toFixed(1):'0.0'}%</b></div><div class="kpi"><span>총 베팅액</span><b>${fmt(st.wag)}</b></div><div class="kpi"><span>게임 누적 손익</span><b class="${st.net>=0?'pos':'neg'}">${sfmt(st.net)}</b></div><div class="kpi"><span>보유 포인트</span><b>${fmt(S.bal)}</b></div>`;
  $('#statTbl').innerHTML=`<thead><tr><th>게임</th><th class="n">판 수</th><th class="n">승률</th><th class="n">베팅액</th><th class="n">누적 손익</th></tr></thead><tbody>${GIDS.map(g=>{const r=(st.games&&st.games[g])||{n:0,w:0,net:0,wag:0};return`<tr><td>${META[g].name}</td><td class="n">${r.n}</td><td class="n">${r.n?(r.w/r.n*100).toFixed(1)+'%':'–'}</td><td class="n">${fmt(r.wag)}</td><td class="n ${r.net>=0?'pos':'neg'}">${sfmt(r.net)}</td></tr>`;}).join('')}</tbody>`;
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
  ${(CFG.sched||[]).length?`<p>판수에 따라 확률이 바뀌도록 설정되어 있었습니다. ${(CFG.sched||[]).map(r=>(r.g==='all'?'모든 게임':META[r.g].name)+' 처음 '+r.n+'판 '+r.a+(DIRECT[r.g]?'%':'% 조정')+' → 이후 '+r.b+(DIRECT[r.g]?'%':'% 조정')).join(', ')}. 처음에 잘 되던 것은 계속 하게 만들기 위한 미끼였습니다.</p>`:''}
  ${(CFG.balr||[]).length?`<p>가진 포인트에 따라 확률이 바뀌도록 설정되어 있었습니다. ${CFG.balr.map(r=>(r.g==='all'?'모든 게임':META[r.g].name)+' '+fmt(r.x)+(r.op==='lt'?' 미만 ':' 이상 ')+r.v+(DIRECT[r.g]?'%':'% 조정')).join(', ')}.</p>`:''}
  <div class="help"><b>조작이 없어도 하우스가 이깁니다.</b> 모든 게임의 환급률은 100% 미만이라 오래 할수록 잃습니다. 불법 온라인 도박 사이트는 여기에 더해 결과 조작, 출금 거부, 개인정보 유출 위험까지 있습니다. 상담: 한국도박문제예방치유원 <b>1336</b></div>
  <div><button class="btn" type="button" id="rvClose">닫기</button></div></div>`;
  m.hidden=false;$('#rvClose').onclick=()=>m.hidden=true;
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#revealModal').hidden=true;$('#installModal').hidden=true;$('#inviteModal').hidden=true;$('#nickModal').hidden=true;$('#bacManual').hidden=true;if(!$('#tutModal').hidden)closeTut();}});

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
  <div><div style="font-size:13px;margin-bottom:6px">게임별 확률</div>
    <div class="odds-grid">
      <label for="od_coin">동전 적중</label><span class="cell"><input type="number" id="od_coin" min="0" max="100" step="1" placeholder="50">%</span>
      <label for="od_rpsWin">가위바위보</label><span class="cell">승 <input type="number" id="od_rpsWin" min="0" max="100" step="1" placeholder="33">% 무 <input type="number" id="od_rpsDraw" min="0" max="100" step="1" placeholder="33">%</span>
      <label for="od_oddeven">홀짝 적중</label><span class="cell"><input type="number" id="od_oddeven" min="0" max="100" step="1" placeholder="50">%</span>
      <label for="od_crash">그래프 상한</label><span class="cell"><input type="number" id="od_crash" min="1.01" step="0.1" placeholder="없음">x</span>
      <label for="od_cmin">그래프 최소 캐시아웃</label><span class="cell"><input type="number" id="od_cmin" min="1" step="0.05" placeholder="1.10">x</span>
    </div>
    <div class="sub" style="margin-top:4px">비워 두면 원래 확률(동전·홀짝 50%, 가위바위보 승 33%·무 33%, 상한 없음)을 씁니다. 그래프는 상한 배율에서 반드시 터집니다.</div>
    <div class="abtns" style="margin-top:6px"><button type="button" class="abtn" id="oddsReset">확률 원래대로</button><button type="button" class="abtn" id="stableReset">말·달팽이 전적 초기화</button></div>
  </div>
  <details class="sub-more"><summary>블랙잭 조건</summary><div class="odds-grid" style="margin-top:6px">
    <label for="bj_payout">블랙잭 배당</label><span class="cell"><select id="bj_payout"><option value="3:2">3:2 (2.5배)</option><option value="6:5">6:5 (2.2배)</option><option value="1:1">1:1 (2배)</option></select></span>
    <label for="bj_s17">딜러 소프트 17</label><span class="cell"><select id="bj_s17"><option value="stand">스탠드</option><option value="hit">히트</option></select></span>
    <label for="bj_decks">덱 수</label><span class="cell"><input type="number" id="bj_decks" min="1" max="8" step="1"></span>
    <label for="bj_dl">딜러 좋은 카드</label><span class="cell"><input type="number" id="bj_dl" min="0" max="100" step="5">%</span>
    <label for="bj_pu">플레이어 나쁜 카드</label><span class="cell"><input type="number" id="bj_pu" min="0" max="100" step="5">%</span>
    <label for="bj_tie">무승부</label><span class="cell"><select id="bj_tie"><option value="">원금 반환</option><option value="house">하우스 승</option></select></span>
    <label for="bj_bp">승부 맞히기 배당</label><span class="cell">P <input type="number" id="bj_bp" min="1" max="10" step="0.05">D <input type="number" id="bj_bd" min="1" max="10" step="0.05">T <input type="number" id="bj_bt" min="1" max="10" step="0.5"></span>
  </div><div class="sub" style="margin-top:4px">"좋은/나쁜 카드"는 카드를 두 장 보고 그쪽에 유리하거나 불리한 카드를 주는 확률입니다. 승부 맞히기 기본 배당은 P 2.05 · D 1.75 · T 9입니다.</div>
  <div class="abtns" style="margin-top:6px"><button type="button" class="abtn" id="bjReset">블랙잭 조건 원래대로</button></div></details>
  <details class="sub-more"><summary>룰렛 당첨 확률</summary><div class="odds-grid" style="margin-top:6px">${RBETS.map(b=>`<label for="ro_${b.k}">${b.label}</label><span class="cell"><input type="number" id="ro_${b.k}" min="0" max="100" step="0.5" placeholder="${(rOfficial(b)*100).toFixed(2)}">% <span class="sub">공식 ${(rOfficial(b)*100).toFixed(2)}%</span></span>`).join('')}</div>
  <div class="sub" style="margin-top:4px">비워 두면 공식 확률입니다. 학생 화면에는 항상 공식 확률이 표시됩니다.</div>
  <div class="abtns" style="margin-top:6px"><button type="button" class="abtn" id="roReset">룰렛 확률 원래대로</button></div></details>
  <details class="sub-more"><summary>게임별 추가 조작 (결과 재추첨)</summary>${GIDS.map(g=>`<div class="slider-row"><label for="rg_${g}" style="width:84px;font-size:12px">${META[g].name}</label><input type="range" id="rg_${g}" min="-100" max="100" step="5"><output id="rg_${g}V"></output></div>`).join('')}</details>
  <div class="toggle" style="display:block"><label>판수별 확률</label><div class="sub">학생마다 판수를 세서, 정한 판수까지는 앞 값을, 그다음부터는 뒤 값을 씁니다. 동전·홀짝·가위바위보·룰렛은 <b>승리 확률 %</b>, 나머지 게임과 '전체'는 <b>승률 조정 %</b>(−100~+100, 위 슬라이더와 같은 뜻)입니다.</div>
    <div id="schedList" style="display:grid;gap:6px;margin-top:6px"></div>
    <div class="abtns" style="margin-top:6px"><button type="button" class="abtn" id="schedAdd">규칙 추가</button></div></div>
  <div class="toggle" style="display:block"><label>보유 포인트별 확률</label><div class="sub">학생이 베팅할 때 가진 포인트에 따라 확률을 바꿉니다. 예: 50,000P 이상이면 동전 승리 확률 30%. 같은 게임에 규칙이 여러 개 맞으면 기준선이 학생 포인트에 가장 가까운 규칙을 씁니다. 판수별 확률보다 먼저 적용됩니다. 단위는 판수별 확률과 같습니다.</div>
    <div id="balrList" style="display:grid;gap:6px;margin-top:6px"></div>
    <div class="abtns" style="margin-top:6px"><button type="button" class="abtn" id="balrAdd">규칙 추가</button></div></div>
  <div class="toggle" style="display:block"><label>니어미스 연출</label><div class="sub">진 판을 '아깝게 놓친 것처럼' 보여 줍니다. 결과(승패·금액)는 바뀌지 않습니다.</div>
    <div class="pause-grid" style="margin-top:6px">
      <label title="진 판을 7·7·(빗나감)으로"><input type="checkbox" class="nmc" data-g="slot">슬롯 (7·7·빗나감)</label>
      <label title="고른 숫자 바로 옆 칸에 멈춤"><input type="checkbox" class="nmc" data-g="roulette">룰렛 (바로 옆 칸)</label>
      <label title="고른 말이 코 차이로 2등"><input type="checkbox" class="nmc" data-g="horse">경마 (코 차이 2등)</label>
      <label title="고른 달팽이가 간발의 차로 2등"><input type="checkbox" class="nmc" data-g="snail">달팽이 (간발의 차)</label>
      <label title="버스트할 때 딱 22로"><input type="checkbox" class="nmc" data-g="blackjack">블랙잭 (22로 버스트)</label>
    </div></div>
  <div class="toggle"><span><label for="rgReveal">폭로 모드</label><div class="sub">모든 학생에게 조작 사실과 개인별 피해를 공개합니다.</div></span><input type="checkbox" id="rgReveal"></div>
  <div class="abtns" style="margin-top:6px"><button type="button" class="abtn l" id="allLose">전원 다음 판 패배</button><button type="button" class="abtn w" id="allWin">전원 다음 판 승리</button><button type="button" class="abtn" id="rigReset">조작 모두 초기화</button></div>`;
  const bind=(id,fn)=>$(id).addEventListener('input',fn);
  bind('#rgGlobal',e=>{CFG.global=e.target.value/100;$('#rgGlobalV').textContent=biasText(CFG.global);saveCfg();refreshEff();});
  GIDS.forEach(g=>bind('#rg_'+g,e=>{CFG.games[g]=e.target.value/100;$('#rg_'+g+'V').textContent=biasText(CFG.games[g]);saveCfg();refreshEff();}));
  // old single "lure" switch becomes a schedule rule
  if(CFG.lure&&CFG.lure.on&&!(CFG.sched&&CFG.sched.length)){CFG.sched=[{g:'all',n:CFG.lure.rounds,a:Math.round(CFG.lure.boost*100),b:0}];CFG.lure.on=false;saveCfg();}
  $('#schedAdd').onclick=()=>{CFG.sched=(CFG.sched||[]).concat([{g:'coin',n:10,a:70,b:30}]);saveCfg();paintSched();refreshEff();};
  $('#schedList').addEventListener('change',readSched);
  $('#balrAdd').onclick=()=>{CFG.balr=(CFG.balr||[]).concat([{g:'coin',op:'ge',x:50000,v:30}]);saveCfg();paintBalr();refreshEff();};
  $('#balrList').addEventListener('change',readBalr);
  $('#balrList').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b)return;CFG.balr.splice(+b.dataset.del,1);saveCfg();paintBalr();refreshEff();});
  $('#schedList').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b)return;CFG.sched.splice(+b.dataset.del,1);saveCfg();paintSched();refreshEff();});
  document.querySelectorAll('.nmc').forEach(cb=>cb.addEventListener('change',()=>{const o={};document.querySelectorAll('.nmc').forEach(x=>{if(x.checked)o[x.dataset.g]=true;});CFG.nearMiss=o;saveCfg();}));
  paintSched();paintBalr();
  $('#rgReveal').addEventListener('change',e=>{CFG.reveal=e.target.checked;saveCfg();toast(CFG.reveal?'모든 학생에게 공개합니다':'공개를 껐습니다');});
  const oddsIds={coin:'od_coin',rpsWin:'od_rpsWin',rpsDraw:'od_rpsDraw',oddeven:'od_oddeven'};
  for(const k in oddsIds)$('#'+oddsIds[k]).addEventListener('change',e=>{CFG.odds=Object.assign({},CFG.odds||{});const v=e.target.value.trim();
    if(v===''){delete CFG.odds[k];}else{const p=Math.max(0,Math.min(100,+v))/100;CFG.odds[k]=p;e.target.value=Math.round(p*1000)/10;}
    if((CFG.odds.rpsWin||0)+(CFG.odds.rpsDraw||0)>1){toast('가위바위보 승+무가 100%를 넘을 수 없습니다');CFG.odds.rpsDraw=Math.max(0,1-(CFG.odds.rpsWin||0));$('#od_rpsDraw').value=Math.round(CFG.odds.rpsDraw*1000)/10;}
    saveCfg();});
  $('#od_crash').addEventListener('change',e=>{const v=parseFloat(e.target.value);CFG.crashCap=v>=1.01?Math.round(v*100)/100:0;if(!CFG.crashCap)e.target.value='';saveCfg();});
  const bjSet=()=>{const n=(id,lo,hi,div)=>{const v=$('#'+id).value.trim();if(v==='')return undefined;return Math.max(lo,Math.min(hi,+v))/(div||1);};
    const bj={payout:$('#bj_payout').value,s17:$('#bj_s17').value,tieHouse:$('#bj_tie').value==='house'};
    const d=n('bj_decks',1,8);if(d)bj.decks=Math.floor(d);const dl=n('bj_dl',0,100,100);if(dl!=null)bj.dealerLuck=dl;const pu=n('bj_pu',0,100,100);if(pu!=null)bj.playerUnluck=pu;
    const bp=n('bj_bp',1,10),bd=n('bj_bd',1,10),bt=n('bj_bt',1,10);if(bp)bj.betP=bp;if(bd)bj.betD=bd;if(bt)bj.betT=bt;
    CFG.bj=bj;saveCfg();};
  ['bj_payout','bj_s17','bj_decks','bj_dl','bj_pu','bj_tie','bj_bp','bj_bd','bj_bt'].forEach(id=>$('#'+id).addEventListener('change',bjSet));
  $('#bjReset').onclick=()=>{CFG.bj={};saveCfg();syncRigPanel();toast('블랙잭 조건을 원래대로 돌렸습니다');};
  RBETS.forEach(b=>$('#ro_'+b.k).addEventListener('change',e=>{CFG.roul=Object.assign({},CFG.roul||{});const v=e.target.value.trim();if(v==='')delete CFG.roul[b.k];else{CFG.roul[b.k]=Math.max(0,Math.min(100,+v))/100;}saveCfg();}));
  $('#roReset').onclick=()=>{CFG.roul={};saveCfg();syncRigPanel();toast('룰렛 확률을 원래대로 돌렸습니다');};
  $('#od_cmin').addEventListener('change',e=>{const v=parseFloat(e.target.value);CFG.crashMin=v>=1?Math.round(v*100)/100:undefined;saveCfg();toast('그래프는 이제 '+(CFG.crashMin||1.1).toFixed(2)+'x부터 캐시아웃할 수 있습니다');});
  $('#oddsReset').onclick=()=>{CFG.odds={};CFG.crashCap=0;CFG.crashMin=undefined;saveCfg();syncRigPanel();toast('게임 확률을 원래대로 돌렸습니다');};
  let srArm=0;$('#stableReset').onclick=e=>{if(Date.now()-srArm>3000){srArm=Date.now();e.target.textContent='한 번 더 누르면 초기화';return;}e.target.textContent='말·달팽이 전적 초기화';svSend({t:'adm',op:'stablereset'});};
  buildOps();
  $('#allLose').onclick=()=>sendCmd('all','force',{want:'lose'});
  $('#allWin').onclick=()=>sendCmd('all','force',{want:'win'});
  $('#rigReset').onclick=()=>{const keep=CFG.reveal,keepP=CFG.paused,keepO=CFG.odds,keepC=CFG.crashCap;CFG=JSON.parse(JSON.stringify(DEF_CFG));CFG.reveal=keep;CFG.paused=keepP;CFG.odds=keepO;CFG.crashCap=keepC;saveCfg();syncRigPanel();refreshEff();sendCmd('all','clearforce');};
  syncRigPanel();
}
const unitOf=g=>DIRECT[g]?'% 승리 확률':'% 승률 조정';
function paintSched(){const el=$('#schedList');if(!el)return;const list=CFG.sched||[];
  el.innerHTML=list.length?list.map((r,i)=>`<div class="abtns" data-i="${i}" style="background:var(--steel);border:1px solid var(--sline);border-radius:6px;padding:6px">
    <select data-k="g" style="background:var(--steel2);border:1px solid var(--sline);color:var(--sink);border-radius:4px;font-size:12px;padding:2px 4px"><option value="all">전체 게임</option>${GIDS.map(g=>`<option value="${g}" ${r.g===g?'selected':''}>${META[g].name}</option>`).join('')}</select>
    <span style="font-size:12px">처음</span><input type="number" data-k="n" min="0" max="10000" value="${r.n}" style="width:56px"><span style="font-size:12px">판까지</span>
    <input type="number" data-k="a" value="${r.a}" style="width:56px"><span style="font-size:12px">→ 그 뒤</span><input type="number" data-k="b" value="${r.b}" style="width:56px">
    <span class="sub">${unitOf(r.g)}</span><button type="button" class="abtn l" data-del="${i}" aria-label="규칙 삭제">삭제</button></div>`).join('')
    :'<div class="sub">규칙이 없습니다. 예: 동전 처음 10판까지 70% → 그 뒤 30%</div>';
  list.forEach((r,i)=>{const s=el.querySelector(`[data-i="${i}"] select`);if(s)s.value=r.g;});}
function paintBalr(){const el=$('#balrList');if(!el)return;const list=CFG.balr||[];const sel='background:var(--steel2);border:1px solid var(--sline);color:var(--sink);border-radius:4px;font-size:12px;padding:2px 4px';
  el.innerHTML=list.length?list.map((r,i)=>`<div class="abtns" data-i="${i}" style="background:var(--steel);border:1px solid var(--sline);border-radius:6px;padding:6px">
    <select data-k="g" style="${sel}"><option value="all">전체 게임</option>${GIDS.map(g=>`<option value="${g}">${META[g].name}</option>`).join('')}</select>
    <span style="font-size:12px">보유</span><input type="number" data-k="x" min="0" step="1000" value="${r.x}" style="width:84px"><span style="font-size:12px">P</span>
    <select data-k="op" style="${sel}"><option value="ge">이상이면</option><option value="lt">미만이면</option></select>
    <input type="number" data-k="v" value="${r.v}" style="width:56px"><span class="sub">${unitOf(r.g)}</span><button type="button" class="abtn l" data-del="${i}" aria-label="규칙 삭제">삭제</button></div>`).join('')
    :'<div class="sub">규칙이 없습니다. 예: 동전 · 보유 50,000P 이상이면 30%</div>';
  list.forEach((r,i)=>{const row=el.querySelector(`[data-i="${i}"]`);if(!row)return;row.querySelector('[data-k="g"]').value=r.g;row.querySelector('[data-k="op"]').value=r.op==='lt'?'lt':'ge';});}
function readBalr(){const rows=[...document.querySelectorAll('#balrList [data-i]')];
  CFG.balr=rows.map(row=>{const v=k=>row.querySelector(`[data-k="${k}"]`).value;const g=v('g');const lim=DIRECT[g]?[0,100]:[-100,100];return{g,op:v('op')==='lt'?'lt':'ge',x:Math.max(0,Math.floor(+v('x')||0)),v:Math.max(lim[0],Math.min(lim[1],Math.round(+v('v')||0)))};});
  saveCfg();paintBalr();refreshEff();}
function readSched(){const rows=[...document.querySelectorAll('#schedList [data-i]')];
  CFG.sched=rows.map(row=>{const v=k=>row.querySelector(`[data-k="${k}"]`).value;const g=v('g');const lim=DIRECT[g]?[0,100]:[-100,100];const c=x=>Math.max(lim[0],Math.min(lim[1],Math.round(+x||0)));return{g,n:Math.max(0,Math.floor(+v('n')||0)),a:c(v('a')),b:c(v('b'))};});
  saveCfg();paintSched();refreshEff();}
function syncRigPanel(){
  if(!$('#rgGlobal'))return;const act=document.activeElement;
  const setR=(id,v)=>{const el=$(id);if(el&&el!==act)el.value=pct(v);const o=$(id+'V');if(o)o.textContent=biasText(v);};
  setR('#rgGlobal',CFG.global);GIDS.forEach(g=>setR('#rg_'+g,CFG.games[g]||0));
  $('#rgReveal').checked=!!CFG.reveal;
  document.querySelectorAll('.nmc').forEach(x=>{x.checked=nm(x.dataset.g);});
  if(!$('#schedList').contains(act))paintSched();
  if(!$('#balrList').contains(act))paintBalr();
  if($('#od_cmin')!==act)$('#od_cmin').value=+CFG.crashMin>=1?CFG.crashMin:'';
  const od=CFG.odds||{};for(const [k,id] of [['coin','od_coin'],['rpsWin','od_rpsWin'],['rpsDraw','od_rpsDraw'],['oddeven','od_oddeven']]){const el=$('#'+id);if(el&&el!==act)el.value=typeof od[k]==='number'?Math.round(od[k]*1000)/10:'';}
  if($('#od_crash')!==act)$('#od_crash').value=CFG.crashCap>=1.01?CFG.crashCap:'';
  const bj=Object.assign({},BJ_DEF,CFG.bj||{});const sv=(id,v)=>{const el=$('#'+id);if(el&&el!==act)el.value=v;};
  sv('bj_payout',bj.payout);sv('bj_s17',bj.s17);sv('bj_decks',bj.decks);sv('bj_dl',Math.round(bj.dealerLuck*100));sv('bj_pu',Math.round(bj.playerUnluck*100));sv('bj_tie',bj.tieHouse?'house':'');sv('bj_bp',bj.betP);sv('bj_bd',bj.betD);sv('bj_bt',bj.betT);
  RBETS.forEach(b=>{const v=CFG.roul&&CFG.roul[b.k];sv('ro_'+b.k,typeof v==='number'?Math.round(v*1000)/10:'');});
  rows.forEach(r=>{const v=((CFG.players||{})[r.sid]||{}).bias||0;if(r.slider!==act)r.slider.value=pct(v);r.out.textContent=biasText(v);});
}
function refreshEff(){rows.forEach(r=>r.updateEff());}
['#fCls','#fOnline','#fQ'].forEach(id=>$(id).addEventListener('input',()=>renderAdmin()));
function renderAdmin(){
  if(!S.admin)return;
  const users=USERS||[];
  const lent=users.reduce((a,u)=>a+(u.loan?u.loan.principal:0),0),owed=users.reduce((a,u)=>a+(u.loan?u.loan.debt:0),0),nLoan=users.filter(u=>u.loan).length;
  const ls=users.reduce((a,u)=>{const s=u.loanStats||{};a.lent+=s.lent||0;a.repaid+=s.repaid||0;a.interest+=s.interest||0;a.forgiven+=s.forgiven||0;return a;},{lent:0,repaid:0,interest:0,forgiven:0});
  const tot=users.reduce((a,u)=>a+u.bal,0),house=users.reduce((a,u)=>a-u.stats.net,0),online=users.filter(u=>u.online).length,live=users.filter(u=>u.pending).length,man=users.reduce((a,u)=>a+u.stats.manip,0),broke=users.filter(u=>u.bal<1).length;
  $('#akpis').innerHTML=`<div class="akpi"><span>가입 학생</span><b>${users.length}명</b></div><div class="akpi"><span>접속 중</span><b>${online}명</b></div><div class="akpi"><span>진행 중인 판</span><b>${live}</b></div><div class="akpi"><span>학생 자산 합계</span><b>${fmt(tot)}</b></div><div class="akpi"><span>하우스 수익 (게임만)</span><b class="${house>=0?'pos':'neg'}">${sfmt(house)}</b><small>대출은 포함하지 않음</small></div><div class="akpi"><span>빌려준 돈 (아직 못 받음)</span><b>${fmt(lent)}</b><small>${nLoan}명 · 이자 포함 받을 돈 ${fmt(owed)}</small></div><div class="akpi"><span>대출 누적</span><b>${fmt(ls.lent)}</b><small>상환 ${fmt(ls.repaid)} · 받은 이자 ${fmt(ls.interest)}${ls.forgiven?' · 탕감 '+fmt(ls.forgiven):''}</small></div><div class="akpi"><span>조작된 판 · 파산</span><b>${man} · ${broke}명</b></div>`;
  renderReqs();
  if(view!=='admin')return;
  const fc=$('#fCls').value,fo=$('#fOnline').value,q=$('#fQ').value.trim();
  const body=$('#admBody');const seen=new Set();
  const ordered=users.slice().sort((a,b)=>(!!b.online-!!a.online)||a.cls-b.cls||a.num-b.num);const want=[];
  for(const u of ordered){
    if(fc&&String(u.cls)!==fc)continue;if(fo==='on'&&!u.online)continue;if(q&&!(u.name.includes(q)||u.sid.includes(q)||(u.nick||'').includes(q)))continue;
    seen.add(u.sid);let r=rows.get(u.sid);
    if(!r){r=makeRow(u);rows.set(u.sid,r);}
    want.push(r.tr);r.update(u);
  }
  for(const [sid,r] of rows)if(!seen.has(sid)){r.tr.remove();rows.delete(sid);}
  // move a card only when its place really changed, so typing and clicking in a card is never interrupted
  want.forEach((tr,i)=>{if(body.children[i]!==tr)body.insertBefore(tr,body.children[i]||null);});
  $('#admEmpty').hidden=seen.size>0;
  $('#admEmpty').textContent=users.length?'조건에 맞는 학생이 없습니다.':'아직 가입한 학생이 없습니다.';
}
/* ---------------- notices: a must-read announcement to every student ---------------- */
let ntCur=null,ntTimer=null;
function noticePump(){const m=$('#noticeModal');
  if(!S.me||!NQ.length){if(!m.hidden)m.hidden=true;ntCur=null;clearInterval(ntTimer);return;}
  if(ntCur&&!m.hidden&&NQ.some(n=>n.id===ntCur))return;
  if(busy)return;
  const n=NQ[0];ntCur=n.id;$('#ntBody').textContent=n.text;
  $('#ntMeta').textContent=new Date(n.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})+(NQ.length>1?' · 읽지 않은 공지 '+NQ.length+'개':'');
  m.hidden=false;m.scrollTop=0;let left=3;const b=$('#ntOk');b.disabled=true;b.textContent='확인했습니다 ('+left+')';clearInterval(ntTimer);
  ntTimer=setInterval(()=>{left--;if(left<=0){clearInterval(ntTimer);b.disabled=false;b.textContent='확인했습니다';b.focus();}else b.textContent='확인했습니다 ('+left+')';},1000);}
$('#ntOk').onclick=()=>{if(!ntCur||$('#ntOk').disabled)return;if(!svSend({t:'noticeack',id:ntCur})){toast('서버에 연결된 뒤에 다시 누르세요');return;}NQ=NQ.filter(n=>n.id!==ntCur);ntCur=null;$('#noticeModal').hidden=true;noticePump();};
setInterval(noticePump,700);
function renderNotices(){const el=$('#ntList');if(!el)return;
  el.innerHTML=NOTICES.length?NOTICES.map(n=>`<div class="nt-item"><div class="nt-text">${esc(n.text)}</div><div class="nt-foot"><span>${new Date(n.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · <b>읽음 ${n.read} / ${n.total}명</b></span><button type="button" class="abtn l" data-ntdel="${esc(n.id)}">삭제</button></div>${n.unread.length?`<details><summary>안 읽은 학생 ${n.total-n.read}명</summary><div class="nt-un">${n.unread.map(esc).join(', ')}</div></details>`:n.total?'<div class="nt-un">모두 읽었습니다.</div>':''}</div>`).join(''):'<div class="hint" style="color:var(--smute)">보낸 공지가 없습니다.</div>';}
$('#ntText').addEventListener('input',()=>{$('#ntCount').textContent=$('#ntText').value.length+' / 500';});
$('#ntSend').onclick=()=>{const v=$('#ntText').value.trim();if(v.length<2){toast('공지 내용을 적으세요');return;}if(!confirm('모든 학생에게 이 공지를 보냅니다.\n\n'+v))return;if(svSend({t:'adm',op:'notice',text:v})){$('#ntText').value='';$('#ntCount').textContent='0 / 500';}};
$('#ntList').addEventListener('click',e=>{const b=e.target.closest('[data-ntdel]');if(!b)return;if(b.dataset.arm)svSend({t:'adm',op:'noticedel',id:b.dataset.ntdel});else{b.dataset.arm='1';b.textContent='한 번 더 누르면 삭제';}});
/* ---------------- admin alert for a new signup request ---------------- */
function beep(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ac=beep.ac||(beep.ac=new C());if(ac.state==='suspended')ac.resume();[880,1175].forEach((f,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;o.connect(g);g.connect(ac.destination);const t=ac.currentTime+i*.16;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.18,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.15);o.start(t);o.stop(t+.16);});}catch(e){}}
function reqAlert(m){
  const d=document.createElement('div');d.className='req-alert';d.dataset.t=Date.now();if(m)d.dataset.sid=m.sid;else{const old=$('#reqAlert').querySelector('[data-sum]');if(old)old.remove();d.dataset.sum='1';}
  d.innerHTML=m?`<b>새 가입 요청</b><span>${esc(m.name)} · 학번 ${esc(m.sid)}</span><span class="abtns"><button type="button" class="abtn w" data-a="ok">승인</button><button type="button" class="abtn" data-a="see">요청 보기</button><button type="button" class="abtn" data-a="x">닫기</button></span>`
    :`<b>가입 요청 ${REQS.length}명이 기다리고 있습니다</b><span class="abtns"><button type="button" class="abtn w" data-a="see">요청 보기</button><button type="button" class="abtn" data-a="x">닫기</button></span>`;
  d.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;if(b.dataset.a==='ok')svSend({t:'adm',op:'approve',sid:m.sid});if(b.dataset.a==='see'){show('admin');setTimeout(()=>$('#reqBox').scrollIntoView({block:'center'}),50);}d.remove();};
  $('#reqAlert').appendChild(d);
  if(m){beep();try{if(window.Notification&&Notification.permission==='granted'&&document.hidden)new Notification('하우스 엣지 · 새 가입 요청',{body:m.name+' (학번 '+m.sid+')',tag:'req-'+m.sid});}catch(e){}}
}
// signup requests waiting for approval
function renderReqs(){const n=REQS.length;document.title=S.admin&&n?'('+n+') 가입 요청 · '+BASE_TITLE:BASE_TITLE;
  $('#reqAlert').querySelectorAll('[data-sid]').forEach(d=>{if(Date.now()-d.dataset.t>3000&&!REQS.some(q=>q.sid===d.dataset.sid))d.remove();});if(!n){const s=$('#reqAlert').querySelector('[data-sum]');if(s)s.remove();}const bd=$('#reqBadge');bd.hidden=!n;bd.textContent=n;$('#reqBox').hidden=!n;$('#reqCount').textContent=n?n+'명':'';
  $('#reqList').innerHTML=REQS.map(q=>`<div class="req-row"><span><b>${esc(q.name)}</b>${q.nick?' ('+esc(q.nick)+')':''} · ${q.grade}학년 ${q.cls}반 ${q.num}번 <small>학번 ${esc(q.sid)} · ${new Date(q.created).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}${q.ref?' · 초대한 학생: '+esc(q.ref):''}</small></span><span class="abtns"><button type="button" class="abtn w" data-ok="${esc(q.sid)}">승인</button><button type="button" class="abtn l" data-no="${esc(q.sid)}">거절</button></span></div>`).join('');}
$('#reqList').addEventListener('click',e=>{const a=e.target.closest('[data-ok]'),b=e.target.closest('[data-no]');if(a)svSend({t:'adm',op:'approve',sid:a.dataset.ok});else if(b){if(b.dataset.arm){svSend({t:'adm',op:'del',sid:b.dataset.no});}else{b.dataset.arm='1';b.textContent='한 번 더 누르면 거절';}}});
$('#reqAll').onclick=()=>svSend({t:'adm',op:'approveall'});
// invite link and nickname (player)
$('#inviteBtn').onclick=()=>{if(!S.me)return;const r=S.me.inviteReward||0;$('#invLink').value=location.origin+'/?inv='+S.me.inv;
  $('#invLead').textContent='아래 링크를 친구에게 보내세요. 친구가 이 링크로 가입하고 관리자가 승인하면 '+(r>0?fmt(r)+'를 받습니다.':'초대 횟수가 기록됩니다.');
  $('#invCount').textContent='지금까지 내 링크로 가입한 친구: '+(S.me.invites||0)+'명';$('#invCopy').textContent='링크 복사';$('#inviteModal').hidden=false;};
$('#invCopy').onclick=async()=>{const el=$('#invLink');let ok=false;try{await navigator.clipboard.writeText(el.value);ok=true;}catch(e){el.select();try{ok=document.execCommand('copy');}catch(e2){}}$('#invCopy').textContent=ok?'복사했습니다':'링크를 길게 눌러 복사하세요';};
$('#invClose').onclick=()=>{$('#inviteModal').hidden=true;};
$('#bmClose').onclick=()=>{$('#bacManual').hidden=true;};
$('#bacManual').addEventListener('click',e=>{if(e.target.id==='bacManual')e.currentTarget.hidden=true;});
const nickCost=()=>S.me&&S.me.nickCost!=null?S.me.nickCost:500000;
const nickPaint=()=>{const v=$('#nickIn').value.trim();$('#nickSave').textContent=v?fmt(nickCost())+' 내고 변경':'닉네임 지우기 (무료)';};
$('#nickIn').addEventListener('input',nickPaint);
$('#nickBtn').onclick=()=>{if(!S.me)return;$('#nickIn').value=S.me.nick||'';$('#nickErr').textContent='';$('#nickCostTxt').textContent='닉네임을 바꾸는 데 '+fmt(nickCost())+'가 듭니다.';nickPaint();$('#nickModal').hidden=false;$('#nickIn').focus();};
$('#nickClose').onclick=()=>{$('#nickModal').hidden=true;};
$('#nickForm').addEventListener('submit',e=>{e.preventDefault();const v=$('#nickIn').value.trim();if(v&&!/^[가-힣A-Za-z0-9_]{2,10}$/.test(v)){$('#nickErr').textContent='닉네임은 한글·영문·숫자 2~10자로 입력하세요.';return;}if(v&&S.bal<nickCost()){$('#nickErr').textContent='닉네임을 바꾸려면 '+fmt(nickCost())+'가 필요합니다. (보유 '+fmt(S.bal)+')';return;}$('#nickErr').textContent='';svSend({t:'nick',nick:v});});
function makeRow(u){
  const tr=document.createElement('div');tr.className='pcard';const sid=u.sid;
  tr.innerHTML=`<div class="pc-top"><span class="odot"></span><b class="pc-name"></b><span class="pc-id"></span><span class="pc-st"></span></div>
  <div class="pc-money"><b class="bl"></b><span class="pc-rate rt"></span><span class="pc-loan"></span></div>
  <div class="pc-live" hidden></div>
  <div class="pc-meta"></div>
  <div class="abtns"><button type="button" class="abtn w" data-c="fw">다음 판 승</button><button type="button" class="abtn l" data-c="fl">다음 판 패</button><button type="button" class="abtn w" data-c="lw">이번 판 승</button><button type="button" class="abtn l" data-c="ll">이번 판 패</button><button type="button" class="abtn" data-c="chat">메시지</button><button type="button" class="abtn" data-c="log">로그</button><button type="button" class="abtn" data-c="loanreset">대출 초기화</button></div>
  <div class="abtns"><input type="number" min="0" step="1000" placeholder="금액" aria-label="지급·회수 금액" class="amt"><button type="button" class="abtn w" data-c="add">지급</button><button type="button" class="abtn l" data-c="sub">회수</button><button type="button" class="abtn" data-c="set">설정</button></div>
  <details class="more"><summary>개인 확률 · 비밀번호 · 계정</summary>
    <div class="slider-row" style="margin-top:6px"><input type="range" min="-100" max="100" step="5" aria-label="개인 승률 조정"><output></output></div><div class="hint eff" style="color:var(--smute);font-size:11px"></div>
    <div class="abtns" style="margin-top:5px"><input type="text" placeholder="새 비밀번호" aria-label="새 비밀번호" class="npw" autocomplete="off"><button type="button" class="abtn" data-c="pw">비밀번호 변경</button></div>
    <div class="abtns" style="margin-top:5px"><button type="button" class="abtn" data-c="forgive">대출 없애기</button><button type="button" class="abtn l" data-c="del">계정 삭제</button></div></details>`;
  const r={tr,sid,u,slider:tr.querySelector('input[type=range]'),out:tr.querySelector('output'),amt:tr.querySelector('.amt'),npw:tr.querySelector('.npw'),delArm:0};
  const v=((CFG.players||{})[sid]||{}).bias||0;r.slider.value=pct(v);r.out.textContent=biasText(v);
  r.slider.addEventListener('input',()=>{CFG.players[sid]=Object.assign({},CFG.players[sid]||{},{bias:r.slider.value/100});r.out.textContent=biasText(CFG.players[sid].bias);saveCfg();r.updateEff();});
  tr.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(!b)return;const c=b.dataset.c;
    if(c==='fw')sendCmd(sid,'force',{want:'win'});else if(c==='fl')sendCmd(sid,'force',{want:'lose'});
    else if(c==='lw')sendCmd(sid,'live',{want:'win'});else if(c==='ll')sendCmd(sid,'live',{want:'lose'});
    else if(c==='add'||c==='sub'||c==='set'){const a=Math.floor(+r.amt.value);if(!(a>=0)||r.amt.value===''){toast('금액을 입력하세요');return;}svSend({t:'adm',op:c,sid,amount:a});r.amt.value='';}
    else if(c==='chat'){admChat=sid;show('chats');}
    else if(c==='log'){openLog(sid);}
    else if(c==='forgive'){svSend({t:'adm',op:'forgive',sid});}
    else if(c==='loanreset'){if(Date.now()-(r.lrArm||0)>3000){r.lrArm=Date.now();b.textContent='한 번 더 누르면 초기화';return;}b.textContent='대출 초기화';svSend({t:'adm',op:'loanreset',sid});}
    else if(c==='pw'){const p=r.npw.value;if(p.length<4){toast('새 비밀번호는 4자 이상이어야 합니다');return;}svSend({t:'adm',op:'pw',sid,pw:p});r.npw.value='';}
    else if(c==='del'){if(Date.now()-r.delArm>3000){r.delArm=Date.now();b.textContent='한 번 더 누르면 삭제';return;}svSend({t:'adm',op:'del',sid});}
  });
  r.updateEff=()=>{const p=r.u.presence||{};const g=GIDS.includes(p.game)?p.game:null;const e=biasFor(g||'_',sid,r.u.stats.rounds,r.u.stats.rounds,r.u.bal+((r.u.pending&&r.u.pending.bet)||0));tr.querySelector('.eff').textContent=(g?META[g].name+' ':'')+'실제 적용 '+biasText(e)+(p.force?` · 대기: 다음 판 ${p.force==='win'?'승리':'패배'}`:'');
    const pm=tr.querySelector('.pc-meta');const s=r.u.stats;pm.textContent=`${s.rounds}판 · 승률 ${s.rounds?Math.round(s.wins/s.rounds*100):0}% · 조작 ${s.manip}판${s.md?' ('+sfmt(s.md)+')':''}${Math.round(e*100)?' · 확률 '+biasText(e):''}${p.force?' · 다음 판 '+(p.force==='win'?'승리':'패배')+' 대기':''}`;};
  r.update=(nu)=>{r.u=nu;const p=nu.presence||{};
    tr.querySelector('.odot').className='odot'+(nu.online?' on':'');
    tr.querySelector('.pc-name').textContent=nu.name+(nu.nick?' ('+nu.nick+')':'');
    tr.querySelector('.pc-id').textContent=`${nu.cls}반 ${nu.num}번`;tr.title=`${nu.sid} · ${nu.grade}학년 ${nu.cls}반 ${nu.num}번`;
    tr.querySelector('.bl').textContent=fmt(nu.bal);
    const debt=nu.loan?nu.loan.debt:0;const rate=(nu.bal-debt-(nu.start||START))/Math.max(1,nu.start||START)*100;const rt=tr.querySelector('.rt');rt.textContent=pfmt(rate);rt.className='pc-rate rt '+(rate>=0?'pos':'neg');
    const ln=tr.querySelector('.pc-loan');ln.className='pc-loan'+(nu.loan&&nu.loan.expired?' bad':'');
    ln.textContent=nu.loan?(nu.loan.list||[]).map(l=>`${l.name} ${l.n}번째 ${fmt(l.principal)}(${Math.round(l.rate*100)}%) 빚 ${fmt(l.debt)}${l.expired?' 만기':''}`).join(' · '):nu.loanCount?`대출 ${nu.loanCount}번 받음 · 지금은 없음`:'';if(ln.textContent&&nu.credit)ln.textContent+=' · 신용 '+nu.credit.grade+'('+nu.credit.score+')';ln.hidden=!ln.textContent;
    const g=META[nu.pending?nu.pending.g:p.game];const stEl=tr.querySelector('.pc-st');
    let stTxt,stCls='';
    if(nu.chatOpen){stTxt='대화 중';stCls='chat';}
    else if(nu.pending){stTxt=(g?g.name:'')+' 진행 중';stCls='play';}
    else if(!nu.online)stTxt='오프라인';
    else stTxt=g?g.name+' 대기':({lobby:'로비',rank:'랭킹',stats:'기록',mail:'건의함',loan:'대출',chat:'대화'})[p.game]||'접속 중';
    if(!nu.pending&&nu.bal<1&&!nu.chatOpen){stTxt+=' · 파산';stCls='bad';}
    stEl.textContent=stTxt;stEl.className='pc-st '+stCls;
    const lv=tr.querySelector('.pc-live');lv.hidden=!nu.pending;if(nu.pending)lv.textContent=`베팅 ${fmt(nu.pending.bet)}${p.pick?' · '+p.pick:''}${p.live?' · '+p.live:''}`;
    tr.classList.toggle('playing',!!nu.pending);tr.classList.toggle('broke',!nu.pending&&nu.bal<1);tr.classList.toggle('offline',!nu.online);
    tr.querySelector('[data-c=chat]').textContent=nu.chatOpen?'대화 중':'메시지';
    tr.querySelector('[data-c=forgive]').hidden=!nu.loan;
    const lr=tr.querySelector('[data-c=loanreset]');lr.hidden=!(nu.loan||nu.loanCount);lr.title='지금 대출과 빚을 없애고, 대출 단계(1차부터)를 처음으로 돌립니다';
    const canLive=!!nu.pending&&nu.online&&['horse','snail','crash'].includes(nu.pending.g);
    tr.querySelectorAll('[data-c=lw],[data-c=ll]').forEach(b=>{b.disabled=!canLive;b.title=canLive?'':'경마·달팽이·그래프 게임이 진행 중일 때만 쓸 수 있습니다';});
    tr.querySelectorAll('[data-c=fw],[data-c=fl]').forEach(b=>{b.disabled=!nu.online;b.title=nu.online?'':'접속 중일 때만 쓸 수 있습니다';});
    tr.querySelector('[data-c=ll]').textContent=nu.pending&&nu.pending.g==='crash'?'지금 터뜨리기':'이번 판 패';
    r.updateEff();};
  return r;
}
/* one student's log (admin) */
let logSid=null,logData=null;
function openLog(sid){logSid=sid;logData=null;$('#logBody').innerHTML='<tr><td colspan="6" class="empty-note">불러오는 중…</td></tr>';$('#logKpis').innerHTML='';
  const u=(USERS||[]).find(x=>x.sid===sid);$('#logT').textContent=u?`${u.cls}반 ${u.num}번 ${u.name} 로그`:'학생 로그';
  $('#logGame').innerHTML='<option value="">모든 게임</option>'+GIDS.map(g=>`<option value="${g}">${META[g].name}</option>`).join('');
  $('#logModal').hidden=false;svSend({t:'adm',op:'userlog',sid});}
function closeLog(){$('#logModal').hidden=true;logSid=null;svSend({t:'adm',op:'userlogclose'});}
$('#logClose').onclick=closeLog;
$('#logModal').addEventListener('click',e=>{if(e.target.id==='logModal')closeLog();});
$('#logFilter').addEventListener('change',()=>logData&&renderLog(logData));
$('#logGame').addEventListener('change',()=>logData&&renderLog(logData));
function renderLog(m){
  if(m.sid!==logSid)return;logData=m;const st=m.stats||{};
  $('#logKpis').innerHTML=`<div class="akpi"><span>지금 잔액</span><b>${fmt(m.bal)}</b></div><div class="akpi"><span>판수 · 승률</span><b>${st.rounds||0} · ${st.rounds?Math.round(st.wins/st.rounds*100):0}%</b></div><div class="akpi"><span>총 베팅</span><b>${fmt(st.wag||0)}</b></div><div class="akpi"><span>게임 손익</span><b class="${(st.net||0)>=0?'pos':'neg'}">${sfmt(st.net||0)}</b></div><div class="akpi"><span>조작된 판</span><b>${st.manip||0}</b><small>${st.md?'조작으로 '+sfmt(st.md):''}</small></div>`;
  const f=$('#logFilter').value,gf=$('#logGame').value;
  let rows=(m.hist||[]).map(h=>({t:h.t,game:h.g,b:h.b,p:h.p,d:h.p-h.b,m:h.m,md:h.d}));
  rows=rows.concat((m.events||[]).map(e=>({t:e.t,ev:e,d:e.d,bal:e.b})));
  if(f==='game')rows=rows.filter(r=>r.game);if(f==='money')rows=rows.filter(r=>r.ev);if(f==='manip')rows=rows.filter(r=>r.m);
  if(gf)rows=rows.filter(r=>r.game===gf);
  rows.sort((a,b)=>b.t-a.t);
  const when=t=>{const d=new Date(t);return (d.getMonth()+1)+'/'+d.getDate()+' '+[d.getHours(),d.getMinutes(),d.getSeconds()].map(v=>String(v).padStart(2,'0')).join(':');};
  $('#logCount').textContent=rows.length+'건 (게임 기록은 최근 300판까지)';
  $('#logBody').innerHTML=rows.length?rows.map(r=>r.ev
    ?`<tr><td>${when(r.t)}</td><td><span class="tag" style="color:${r.ev.k==='give'||r.ev.k==='loan'?'#74c79a':r.ev.k==='take'||r.ev.k==='repay'?'#e08a80':'var(--sink)'}">${({give:'지급',take:'회수',loan:'대출',repay:'상환',admin:'관리'})[r.ev.k]||r.ev.k}</span> ${esc(r.ev.x)}</td><td class="n">–</td><td class="n">–</td><td class="n ${r.d>0?'pos':r.d<0?'neg':''}">${r.d?sfmt(r.d):'–'}</td><td class="n">${fmt(r.bal)}</td></tr>`
    :`<tr><td>${when(r.t)}</td><td>${esc((META[r.game]||{}).name||r.game)}${r.m?' <span class="tag" style="color:#d9a66b;border-color:#6a5530">조작됨'+(r.md?' '+sfmt(r.md):'')+'</span>':''}</td><td class="n">${fmt(r.b)}</td><td class="n">${fmt(r.p)}</td><td class="n ${r.d>0?'pos':r.d<0?'neg':''}">${sfmt(r.d)}</td><td class="n">–</td></tr>`).join('')
    :'<tr><td colspan="6" class="empty-note">기록이 없습니다.</td></tr>';
}

function addFeed(e){feed.unshift(e);if(feed.length>80)feed.pop();
  const el=$('#feed');el.innerHTML=feed.map(f=>{const d=new Date(f.t);const net=f.p-f.b;return`<div><span style="color:var(--smute)">${[d.getHours(),d.getMinutes(),d.getSeconds()].map(v=>String(v).padStart(2,'0')).join(':')}</span><b><button type="button" class="abtn" data-log="${f.sid}" style="padding:0 6px">${f.cls}반 ${f.num}번 ${esc(f.name)}</button></b><span>${esc((META[f.g]||{}).name||f.g)}</span><span>베팅 ${fmt(f.b)}</span><span class="${net>=0?'pos':'neg'}">${sfmt(net)}</span>${f.m?'<span class="tg">조작됨</span>':''}</div>`;}).join('');}

$('#feed').addEventListener('click',e=>{const b=e.target.closest('[data-log]');if(b)openLog(b.dataset.log);});
/* inbox (admin) */
$('#inboxFilter').addEventListener('change',renderInbox);
$('#inboxReadAll').onclick=()=>svSend({t:'adm',op:'mailreadall'});
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

/* ---------------- admin top-up: coins fly into the balance ---------------- */
function giftArrive(amount,text){
  const wrap=document.createElement('div');wrap.className='gift';wrap.innerHTML='<div class="gbox"><span>'+esc(text||'관리자가 용돈을 지급했습니다')+'</span><b>+'+fmt(amount)+'</b></div>';document.body.appendChild(wrap);
  const box=wrap.querySelector('.gbox'),bal=$('#bal');
  setTimeout(()=>{const a=box.getBoundingClientRect(),b=bal.getBoundingClientRect();const n=Math.min(18,6+Math.floor(Math.log10(Math.max(10,amount))*3));
    for(let i=0;i<n;i++){const c=document.createElement('div');c.className='coin-fly';c.style.left=(a.left+a.width/2-9+(rnd()-.5)*60)+'px';c.style.top=(a.top+a.height/2-9)+'px';wrap.appendChild(c);
      const dx=b.left+14-parseFloat(c.style.left),dy=b.top+b.height/2-9-parseFloat(c.style.top);
      c.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx*0.5+(rnd()-.5)*120}px,${dy*0.5-80}px) scale(1.2)`,opacity:1,offset:.5},{transform:`translate(${dx}px,${dy}px) scale(.6)`,opacity:.2}],{duration:900+rnd()*300,delay:i*60,easing:'cubic-bezier(.5,0,.6,1)',fill:'forwards'});}
    setTimeout(()=>{bal.classList.remove('gifted');void bal.offsetWidth;bal.classList.add('gifted');},900);
  },500);
  setTimeout(()=>wrap.remove(),2700);
}

/* ---------------- ops settings (admin): start points, give to everyone ---------------- */
function buildOps(){
  $('#opsList').innerHTML=`
  <div><div class="toggle" style="border-top:0;padding-top:0"><span><label for="pzAll">모든 게임 정지</label><div class="sub">켜면 새 판을 시작할 수 없습니다. 진행 중인 판은 끝까지 진행됩니다.</div></span><input type="checkbox" id="pzAll"></div>
  <div class="sub">게임별 정지</div><div class="pause-grid">${GIDS.map(g=>`<label><input type="checkbox" id="pz_${g}" data-g="${g}">${META[g].name}</label>`).join('')}</div></div>
  <div style="border-top:1px solid var(--sline);padding-top:10px"></div>
  <div><label for="opStart">가입 시 지급 포인트</label><div class="abtns" style="margin-top:4px"><input type="number" id="opStart" min="0" step="1000"><button type="button" class="abtn" id="opStartSave">저장</button></div><div class="sub">이미 가입한 학생에게는 영향이 없습니다. 수익률은 각자 가입할 때 받은 포인트를 기준으로 계산합니다.</div></div>
  <div><label for="opInv">친구 초대 보상</label><div class="abtns" style="margin-top:4px"><input type="number" id="opInv" min="0" step="500"><button type="button" class="abtn" id="opInvSave">저장</button></div><div class="sub">초대 링크로 가입한 친구를 승인하면 링크 주인에게 이만큼 지급합니다. 0이면 보상 없이 횟수만 셉니다.</div></div>
  <div><label for="opGarn">대출 자동 상환 비율 (%)</label><div class="abtns" style="margin-top:4px"><input type="number" id="opGarn" min="0" max="100" step="5"><button type="button" class="abtn" id="opGarnSave">저장</button></div><div class="sub">빚이 있는 학생이 게임에서 이기면 딴 돈(순이익)의 이만큼이 자동으로 대출소에 갑니다. 0이면 끕니다.</div></div>
  <div class="toggle" style="display:block"><label for="opAllAmt">한꺼번에 지급 · 회수</label><div class="abtns" style="margin-top:4px"><select id="opAllCls" style="background:var(--steel);border:1px solid var(--sline);color:var(--sink);border-radius:4px;padding:3px 6px;font-size:12px"><option value="0">전체</option>${[1,2,3,4,5,6,7].map(k=>`<option value="${k}">${k}반</option>`).join('')}</select><input type="number" id="opAllAmt" min="1" step="1000" placeholder="금액"><button type="button" class="abtn w" id="opAllGive">지급</button><button type="button" class="abtn l" id="opAllTake">회수</button></div></div>`;
  $('#opsList').insertAdjacentHTML('beforeend',`<div class="toggle" style="display:block"><label>모든 학생 계정 삭제</label><div class="sub">가입한 학생과 가입 요청, 포인트·기록·대출·대화·건의를 전부 지웁니다. 되돌릴 수 없습니다. 확률 설정과 운영 설정은 그대로 둡니다.</div><div class="abtns" style="margin-top:4px"><button type="button" class="abtn l" id="opDelAll">모든 학생 삭제…</button></div></div>`);
  if(window.Notification){$('#opsList').insertAdjacentHTML('afterbegin',`<div><label>가입 요청 알림</label><div class="sub">새 가입 요청이 오면 어느 화면에 있든 오른쪽 위에 알림 카드가 뜨고 소리가 납니다. 다른 탭을 보고 있을 때도 알림을 받으려면 브라우저 알림을 켜세요.</div><div class="abtns" style="margin-top:4px"><button type="button" class="abtn" id="opNotif"></button></div><div style="border-top:1px solid var(--sline);margin-top:10px"></div></div>`);
    const pn=()=>{const p=Notification.permission;$('#opNotif').textContent=p==='granted'?'브라우저 알림 켜짐':p==='denied'?'브라우저에서 알림이 차단됨':'브라우저 알림 켜기';$('#opNotif').disabled=p!=='default';};pn();
    $('#opNotif').onclick=()=>{try{const r=Notification.requestPermission(pn);if(r&&r.then)r.then(pn);}catch(e){}};}
  $('#opDelAll').onclick=()=>{const n=(USERS||[]).length+(REQS||[]).length;const v=prompt('학생 '+n+'명(가입 요청 포함)의 계정과 기록을 모두 지웁니다. 되돌릴 수 없습니다.\n계속하려면 아래에 "모두 삭제"라고 입력하세요.');if(v==null)return;if(v.trim()!=='모두 삭제'){toast('문구가 달라서 삭제하지 않았습니다');return;}svSend({t:'adm',op:'delall',confirm:'모두 삭제'});};
  const setP=()=>{CFG.paused={all:$('#pzAll').checked,games:{}};GIDS.forEach(g=>{if($('#pz_'+g).checked)CFG.paused.games[g]=true;});saveCfg();paintPaused();};
  $('#pzAll').addEventListener('change',()=>{setP();toast($('#pzAll').checked?'모든 게임을 멈췄습니다':'모든 게임을 다시 열었습니다');});
  GIDS.forEach(g=>$('#pz_'+g).addEventListener('change',e=>{setP();toast(META[g].name+(e.target.checked?' 정지':' 다시 시작'));}));
  paintPaused();
  $('#opStartSave').onclick=()=>{const v=Math.floor(+$('#opStart').value);if(!(v>=0)||$('#opStart').value===''){toast('포인트를 입력하세요');return;}svSend({t:'adm',op:'settings',startBal:v});};
  $('#opInvSave').onclick=()=>{const v=Math.floor(+$('#opInv').value);if(!(v>=0)||$('#opInv').value===''){toast('포인트를 입력하세요');return;}svSend({t:'adm',op:'settings',inviteReward:v});};
  $('#opGarnSave').onclick=()=>{const v=Math.floor(+$('#opGarn').value);if(!(v>=0&&v<=100)||$('#opGarn').value===''){toast('0~100 사이로 입력하세요');return;}svSend({t:'adm',op:'settings',garnish:v});};
  const all=take=>{const a=Math.floor(+$('#opAllAmt').value);if(!(a>0)){toast('금액을 입력하세요');return;}svSend({t:'adm',op:'giveall',amount:a,cls:+$('#opAllCls').value,take});$('#opAllAmt').value='';};
  $('#opAllGive').onclick=()=>all(false);$('#opAllTake').onclick=()=>all(true);
  syncOps();
}
function syncOps(){const el=$('#opStart');if(el&&el!==document.activeElement)el.value=SETTINGS.startBal;const gn=$('#opGarn');if(gn&&gn!==document.activeElement)gn.value=SETTINGS.garnish==null?30:SETTINGS.garnish;const iv=$('#opInv');if(iv&&iv!==document.activeElement)iv.value=SETTINGS.inviteReward==null?1000:SETTINGS.inviteReward;}

/* ---------------- loan (player): three lenders ---------------- */
const LENDER_ART={
  gold:{en:'GOLD BRIDGE CAPITAL',copy:'다음 판이 당신을 기다립니다',fine:'업계 최저 금리 시간당 10%부터 · 3분 입금',mark:'⛩'},
  moon:{en:'BLACKMOON CREDIT',copy:'심사 없이 3초 입금',fine:'다른 곳에서 거절당해도 OK · 시간당 20%부터',mark:'☾'},
  red:{en:'REDLINE LOAN',copy:'어디서도 안 될 때, 여기선 됩니다',fine:'신용 무관 · 연체자 환영 · 시간당 40%부터',mark:'☎'}};
const LENDER_NAME={gold:'골드브릿지 캐피탈',moon:'블랙문 크레딧',red:'레드라인 대부'};
function lenderBanner(k,ad){const A=LENDER_ART[k];return`<div class="bn ${k}"><span class="bn-en">${A.en}</span><span class="bn-name">${LENDER_NAME[k]}</span><span class="bn-copy">${A.copy}</span><span class="bn-fine">${A.fine}</span><span class="bn-mark" aria-hidden="true">${A.mark}</span>${ad?'<span class="bn-cta">지금 바로 빌리기 →</span>':''}</div>`;}
let loanTimer=null;
const hm=ms=>{const m=Math.max(0,Math.floor(ms/60000));return Math.floor(m/60)+'시간 '+(m%60)+'분';};
const whenTxt=t=>{const d=new Date(t);return(d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
const loanAmt={};
function borrowForm(L,more){const cr=S.me.credit||{},lmin=cr.min||1000,avail=L.avail==null?(cr.avail==null?100000:cr.avail):L.avail,cnt=L.count||0,rate=L.rates[Math.min(cnt,2)],a=L.active,exp=!!(a&&a.at+LOAN_TERM<=Date.now());
  if(loanAmt[L.k]==null||loanAmt[L.k]>avail)loanAmt[L.k]=avail;const amt=Math.max(0,Math.floor(+loanAmt[L.k]||0));
  const lock=!!L.locked,full=avail<lmin,off=lock||full||exp,can=S.bal<1&&!busy&&!off;
  return `<div class="row"><span>${more?'더 빌릴 금액':'빌릴 금액'} (${fmt(lmin)} ~ ${fmt(avail)})</span><span class="loan-in"><input type="number" data-amt="${L.k}" min="${lmin}" max="${avail}" step="1000" value="${amt||''}" aria-label="${L.name} 빌릴 금액" ${off?'disabled':''}>P</span></div>
          <div class="row"><span>${more?'더 빌리면 바뀌는 이자 (빚 전체)':'시간당 이자'}</span><b>시간당 ${Math.round(rate*100)}%</b></div>
          ${more?'':`<div class="row"><span>24시간 뒤 갚을 돈</span><b style="color:#e08a80" data-due="${L.k}">${fmt(amt*(1+rate*24))}</b></div>
          <div class="row"><span>필요한 신용 등급</span><b style="color:${lock?'#e08a80':'inherit'}">${L.min?L.minGrade+' 이상':'누구나'}</b></div>`}
          <div class="row"><span>이 대출소 한도 (등급 한도 × ${L.mult||1})</span><b>${fmt(L.cap==null?avail:L.cap)}</b></div>
          <button class="btn ${more?'':'primary'}" type="button" data-loan="${L.k}" data-rate="${rate}" data-max="${avail}" ${can?'':'disabled'}>${lock?'신용 등급 부족':exp?'만기 지남 · 먼저 갚기':full?'한도를 모두 썼습니다':more?'더 빌리기':'빌리기'}</button>
          <div class="hint">${lock?'지금 등급('+(cr.grade||'B')+')으로는 여기서 빌릴 수 없습니다.':exp?'만기가 지난 대출은 갚아야 더 빌릴 수 있습니다.':full?'이 대출소의 한도('+fmt(L.cap||0)+')를 모두 빌렸습니다.':can?(more?'기한은 처음 빌린 때부터 24시간 그대로입니다.':''):'포인트가 0P일 때만 빌릴 수 있습니다. (지금 '+fmt(S.bal)+')'}</div>`;}
function renderLoan(){
  const el=$('#loanCard');if(!el||!S.me)return;clearInterval(loanTimer);
  const paint=()=>{
    const Ls=myLenders();const td=totalDebt();
    $('#loanTotal').textContent=td?'빚 합계 '+fmt(td)+' ('+activeOf().length+'곳)':'';
    const cr=S.me.credit||{score:50,grade:'B'},gp=S.me.garnish==null?30:S.me.garnish;
    $('#creditBar').innerHTML=`<span>신용 등급</span><span class="cg ${cr.grade}">${cr.grade}</span><span>${cr.score}점 / 100</span><span class="meter"><i style="width:${cr.score}%"></i></span><span><b>등급 한도 ${fmt(cr.limit||100000)}</b> · 대출소에 따라 1~5배</span><span class="hint">${td&&gp?'빚이 있는 동안 딴 돈의 '+gp+'%가 자동 상환됩니다':'등급이 오르면 한도가 늘어납니다'}</span>`;
    el.innerHTML=Ls.map(L=>{
      const a=L.active,cnt=L.count||0,ti=Math.min(cnt,2);
      const tiers=`<div class="tiers">${L.rates.map((rt,i)=>`<span class="${!a&&i===ti?'next':i<ti?'used':''}">${i===2?'3번째~':(i+1)+'번째'}<br>시간당 ${Math.round(rt*100)}%</span>`).join('')}</div>`;
      let body;
      if(a){const debt=debtNow(a),left=a.at+LOAN_TERM-Date.now(),exp=left<=0,hrs=(Date.now()-a.at)/3600000;
        body=`<div class="eyebrow" style="color:${exp?'#e08a80':'var(--mute)'}">${a.n}번째 대출 · ${exp?'만기 지남 · 게임 불가':'사용 중'}</div>
          <div><div class="hint">지금 갚아야 할 금액</div><div class="loan-big">${fmt(debt)}</div></div>
          <div class="row"><span>빌린 돈</span><b>${fmt(a.principal)}</b></div>
          <div class="row"><span>지금까지 붙은 이자 (지금 시간당 ${Math.round(a.rate*100)}%)</span><b>${fmt(debt+(a.paid||0)-a.principal)}</b></div>
          ${a.paid?`<div class="row"><span>자동 상환으로 이미 낸 돈</span><b>−${fmt(a.paid)}</b></div>`:''}
          <div class="row"><span>${exp?'사용 기간':'게임에 쓸 수 있는 남은 시간'}</span><b style="color:${exp?'#e08a80':'inherit'}">${exp?'끝남':hm(left)}</b></div>
          <button class="btn primary" type="button" data-repay="${L.k}" ${S.bal>=debt&&!busy?'':'disabled'}>${fmt(debt)} 갚기</button>
          <div class="hint">${S.bal>=debt?'':'갚으려면 '+fmt(debt-S.bal)+'가 더 필요합니다.'}</div>
          <div class="topup"><div class="eyebrow">더 빌리기 · ${cnt+1}번째</div>${borrowForm(L,true)}</div>`;}
      else body=`<div class="eyebrow">${cnt}번 빌림 · 다음은 ${cnt+1}번째</div>${borrowForm(L,false)}`;
      return`<div class="lender">${lenderBanner(L.k)}<div class="lbody">${tiers}${body}</div></div>`;
    }).join('');
  };
  paint();loanTimer=setInterval(()=>{if(view!=='loan'){clearInterval(loanTimer);return;}if(!el.contains(document.activeElement))paint();},1000);
}
$('#loanCard').addEventListener('click',e=>{const b=e.target.closest('[data-pct]');if(!b||b.disabled)return;const i=$('#loanCard').querySelector('[data-amt="'+b.dataset.k+'"]');if(!i)return;
  i.value=Math.max(+b.dataset.min,Math.floor(+b.dataset.max*(+b.dataset.pct)/100));i.dispatchEvent(new Event('input',{bubbles:true}));});
$('#loanCard').addEventListener('input',e=>{const i=e.target.closest('[data-amt]');if(!i)return;const k=i.dataset.amt;loanAmt[k]=Math.max(0,Math.floor(+i.value||0));
  $('#loanCard').querySelectorAll('[data-pct][data-k="'+k+'"]').forEach(b=>b.setAttribute('aria-pressed',String(loanAmt[k]===Math.max(+b.dataset.min,Math.floor(+b.dataset.max*(+b.dataset.pct)/100)))));
  const due=$('#loanCard').querySelector('[data-due="'+k+'"]'),btn=$('#loanCard').querySelector('[data-loan="'+k+'"]');if(due&&btn)due.textContent=fmt(loanAmt[k]*(1+(+btn.dataset.rate)*24));});
$('#loanCard').addEventListener('click',e=>{const b=e.target.closest('[data-loan],[data-repay]');if(!b||b.disabled)return;
  if(b.dataset.loan){const cr=S.me.credit||{},a=Math.floor(+loanAmt[b.dataset.loan]||0);if(a<(cr.min||1000)){toast('빌릴 금액을 '+fmt(cr.min||1000)+' 이상으로 적으세요');return;}if(a>+b.dataset.max){toast('이 대출소에서 더 빌릴 수 있는 돈은 '+fmt(+b.dataset.max)+'까지입니다');return;}}
  const m=b.dataset.loan?{t:'loan',k:b.dataset.loan,amount:Math.floor(+loanAmt[b.dataset.loan]||0)}:{t:'repay',k:b.dataset.repay};if(!svSend(m))toast('서버에 연결되어 있지 않습니다');});
['#lobbyAd','#brokeAd'].forEach(id=>$(id).addEventListener('click',()=>show('loan')));
$('#brokeLoan').onclick=()=>show('loan');
setInterval(()=>{if(S.me&&activeOf().length&&!busy)updateBal();},30000);

/* ---------------- 1:1 chat ---------------- */
const tm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
function paintLog(el,msgs,mine,key){
  const sig=(key||'')+'|'+(msgs||[]).length+'|'+(((msgs||[]).at(-1)||{}).t||0);if(el._sig===sig)return;el._sig=sig;
  el.innerHTML='';
  for(const m of msgs||[]){const d=document.createElement('div');d.className='bubble '+(m.from==='system'?'sys':m.from===mine?'me':'them');d.textContent=m.body;
    if(m.from!=='system'){const s=document.createElement('small');s.textContent=(m.from===mine?'나':m.from==='admin'?'관리자':'학생')+' · '+tm(m.t);d.appendChild(s);}
    el.appendChild(d);}
  el.scrollTop=el.scrollHeight;
}
function renderChat(){
  const ch=S.chat;paintLog($('#chatLog'),ch?ch.msgs:[],'user');
  const open=!!(ch&&ch.open);$('#chatIn').disabled=!open;$('#chatState').textContent=open?'대화 중':'대화가 끝났습니다';
}
$('#chatForm').addEventListener('submit',e=>{e.preventDefault();const v=$('#chatIn').value.trim();if(!v)return;if(svSend({t:'chat',body:v}))$('#chatIn').value='';else toast('서버에 연결되어 있지 않습니다');});

let admChat=null;
function renderChats(){
  const list=Object.entries(CHATS||{}).filter(([,c])=>c&&Array.isArray(c.msgs));const unread=list.reduce((a,[,c])=>a+(c.unread||0),0);
  const bd=$('#chatBadge');bd.hidden=!unread;bd.textContent=unread;
  if(view!=='chats')return;
  const pick=$('#chatPick');const cur0=pick.value;
  const psig=(USERS||[]).map(u=>u.sid+(u.online?'+':'-')).join();
  if(pick._sig!==psig&&document.activeElement!==pick){pick._sig=psig;pick.innerHTML='<option value="">새 대화: 학생 고르기</option>'+(USERS||[]).slice().sort((a,b)=>a.cls-b.cls||a.num-b.num).map(u=>`<option value="${u.sid}">${u.cls}반 ${u.num}번 ${esc(u.name)}${u.online?' (접속 중)':''}</option>`).join('');pick.value=cur0;}
  if(admChat&&!CHATS[admChat]){const nu=(USERS||[]).find(x=>x.sid===admChat);if(nu)list.push([admChat,{name:nu.name,cls:nu.cls,num:nu.num,open:false,unread:0,msgs:[],fresh:true}]);}
  if(document.activeElement!==pick)pick.value=admChat&&[...pick.options].some(o=>o.value===admChat)?admChat:'';
  list.sort((a,b)=>(!!b[1].fresh-!!a[1].fresh)||(b[1].open-a[1].open)||((b[1].msgs.at(-1)||{}).t||0)-((a[1].msgs.at(-1)||{}).t||0));
  const cl=$('#convList');const csig=admChat+'|'+list.map(([sid,c])=>sid+':'+(c.open?1:0)+':'+(c.unread||0)+':'+c.msgs.length+':'+((c.msgs.at(-1)||{}).t||0)).join();
  if(cl._sig!==csig){cl._sig=csig;cl.innerHTML='';
  if(!list.length)cl.innerHTML='<div class="empty-note">아직 대화가 없습니다.</div>';
  for(const [sid,c] of list){const b=document.createElement('button');b.type='button';b.className='conv';b.setAttribute('aria-pressed',String(sid===admChat));
    const last=c.msgs[c.msgs.length-1];
    b.innerHTML=`<span><b style="font-weight:500"></b> ${c.open?'<span class="tag on">대화 중</span>':''} ${c.unread?'<span class="badge" style="display:inline-block;min-width:18px;padding:0 5px;border-radius:9px;background:var(--red);color:#fff;font-size:11px;text-align:center">'+c.unread+'</span>':''}</span><small></small>`;
    b.querySelector('b').textContent=c.cls+'반 '+c.num+'번 '+c.name;b.querySelector('small').textContent=last?last.body:c.fresh?'새 대화 · 메시지를 보내면 시작됩니다':'';
    b.onclick=()=>{admChat=sid;renderChats();};cl.appendChild(b);}}
  const c=admChat&&CHATS[admChat];const u=admChat&&(USERS||[]).find(x=>x.sid===admChat);
  $('#admChatTitle').textContent=admChat?((u?u.cls+'반 '+u.num+'번 '+u.name:(c?c.name:admChat))):'대화를 고르세요';
  $('#admChatIn').disabled=!admChat;$('#admChatClose').hidden=!(c&&c.open);
  $('#admChatState').textContent=!admChat?'':c&&c.open?(u&&u.pending?'학생이 판을 끝내면 대화 화면으로 넘어갑니다':'대화 중 · 학생은 게임을 할 수 없습니다'):'메시지를 보내면 대화가 시작됩니다';
  paintLog($('#admChatLog'),c?c.msgs:[],'admin',admChat);
  if(c&&c.unread)svSend({t:'adm',op:'chatseen',sid:admChat});
}
$('#chatPick').addEventListener('change',e=>{if(e.target.value){admChat=e.target.value;e.target.blur();renderChats();$('#admChatIn').closest('.chat-box').scrollIntoView({block:'nearest'});$('#admChatIn').focus();toast('대화 상대를 골랐습니다. 메시지를 적어 보내세요');}});
$('#admChatForm').addEventListener('submit',e=>{e.preventDefault();const v=$('#admChatIn').value.trim();if(!v||!admChat)return;if(svSend({t:'adm',op:'chat',sid:admChat,body:v}))$('#admChatIn').value='';});
let ccArm=0;$('#admChatClose').onclick=e=>{if(!admChat)return;if(Date.now()-ccArm>3000){ccArm=Date.now();e.target.textContent='한 번 더 누르면 끝내기';return;}e.target.textContent='대화 끝내기';svSend({t:'adm',op:'chatclose',sid:admChat});};

/* ---------------- app install (PWA) ---------------- */
(function(){
  if(!location.protocol.startsWith('http'))return;
  const standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
  const ua=navigator.userAgent;
  const os=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)?'ios':/android/i.test(ua)?'android':'desktop';
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(()=>{});
  let deferred=null,installed=false;const btn=$('#installBtn'),gbtn=$('#gateInstall');
  if(!standalone){btn.hidden=false;gbtn.hidden=false;$('#gateInstallNote').hidden=false;}
  // Already installed on this device (Chrome/Edge)? Then the button explains how to open it instead.
  const markInstalled=()=>{installed=true;btn.lastChild.textContent='앱으로 열기';gbtn.lastChild.textContent='앱이 이미 설치되어 있습니다 · 앱으로 열기';$('#gateInstallNote').textContent='설치한 앱을 열어서 회원가입하세요.';$('#instDone').hidden=false;$('#instLead').hidden=true;$('#installModal .steps').hidden=true;};
  if(navigator.getInstalledRelatedApps)navigator.getInstalledRelatedApps().then(l=>{if(l&&l.length)markInstalled();}).catch(()=>{});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;if(!standalone){btn.hidden=false;gbtn.hidden=false;}});
  window.addEventListener('appinstalled',()=>{deferred=null;markInstalled();$('#installModal').hidden=true;toast('앱이 설치되었습니다. 작업 표시줄이나 홈 화면 아이콘으로 여세요');});
  btn.onclick=gbtn.onclick=async()=>{
    if(installed){$('#installModal').hidden=false;return;}
    if(deferred){deferred.prompt();try{const r=await deferred.userChoice;if(r&&r.outcome==='accepted')markInstalled();}catch(e){}deferred=null;return;}
    document.querySelectorAll('#installModal .step').forEach(s=>s.classList.toggle('here',s.dataset.os===os));
    const steps=$('#installModal .steps');const here=steps.querySelector('.here');if(here)steps.prepend(here);
    $('#installModal').hidden=false;
  };
  $('#installClose').onclick=()=>{$('#installModal').hidden=true;};
  // First time someone opens the signup form in a browser tab: suggest installing the app first.
  $('#segSignup').addEventListener('click',()=>{if(standalone||LS.get('he.installAsked',false))return;LS.set('he.installAsked',true);gbtn.click();});
})();

/* ---------------- boot ---------------- */
setBet(S.bet);showGate();svConnect();
