
/* ---------------- how to play: a short animated walkthrough before each game ---------------- */
// Each game is a few steps: a caption and a small scene that animates. Plays once automatically
// (unless "다시 보지 않기" is ticked), can be replayed, and reopened from the "게임 방법" button.
const pill=(t,on,cls)=>`<span class="tp ${on?'on':''} ${cls||''}">${t}</span>`;
const betTag=v=>`<span class="tbet">베팅 ${v}</span>`;
const res=(t,w)=>`<div class="tres ${w?'win':'lose'}">${t}</div>`;
const mini=(r,s,red)=>`<span class="tcard ${red?'red':''}">${r}<i>${s}</i></span>`;
const TUT={
  coin:{steps:[
    {t:'앞면 또는 뒷면 중 하나를 고르고, 걸 금액을 정합니다.',s:`<div class="trow">${pill('앞면',1)}${pill('뒷면')}</div>${betTag('1,000P')}`},
    {t:'베팅하면 동전이 공중에서 돌아갑니다.',s:`<div class="tcoin spin">앞</div>`},
    {t:'나온 면이 고른 면과 같으면 건 돈의 1.95배를 받습니다.',s:`<div class="tcoin">앞</div>${res('앞면! +1,950P',1)}`},
    {t:'다르면 건 돈을 모두 잃습니다. 맞힐 확률은 50%인데 배당이 2배가 아니라 1.95배라서, 오래 하면 조금씩 잃습니다.',s:`<div class="tcoin back">뒤</div>${res('뒷면… −1,000P',0)}`}]},
  rps:{steps:[
    {t:'가위, 바위, 보 중 하나를 고르고 금액을 정합니다.',s:`<div class="trow">${pill('✌️ 가위')}${pill('✊ 바위',1)}${pill('✋ 보')}</div>${betTag('1,000P')}`},
    {t:'"가위, 바위, 보!" 하우스도 무작위로 하나를 냅니다.',s:`<div class="trow big"><span class="shake">✊</span><b>VS</b><span class="shake">✊</span></div>`},
    {t:'이기면 1.95배, 비기면 건 돈을 그대로 돌려받습니다.',s:`<div class="trow big"><span>✊</span><b>VS</b><span>✌️</span></div>${res('승리 +1,950P',1)}`},
    {t:'지면 건 돈을 잃습니다.',s:`<div class="trow big"><span>✊</span><b>VS</b><span>✋</span></div>${res('패배 −1,000P',0)}`}]},
  horse:{steps:[
    {t:'말 6마리 중 우승할 말 하나를 고릅니다. 말마다 이번 판 승률과 배당이 적혀 있습니다.',s:`<div class="tlist"><div>1 번개발굽 <small>승률 28% · 3.35배</small></div><div class="on">4 적토마 <small>승률 5% · 18.5배</small></div><div>6 꼬마별 <small>승률 31% · 3.06배</small></div></div>`},
    {t:'배당 = 0.95 ÷ 승률입니다. 승률이 낮은 말일수록 맞히면 크게 받습니다.',s:`<div class="tformula">0.95 ÷ 5% = <b>19배</b></div>`},
    {t:'출발! 매 순간 속도가 조금씩 바뀌며 달립니다.',s:`<div class="trace">${[0,1,2].map(i=>`<div class="tlane"><span class="trun r${i}">🏇</span></div>`).join('')}</div>`},
    {t:'고른 말이 1등이면 배당만큼 받습니다. 이긴 말은 다음 판 승률이 내려가고, 진 말들은 올라갑니다.',s:`${res('4번 적토마 우승! ×18.5',1)}`}]},
  snail:{steps:[
    {t:'달팽이 4마리 중 하나를 고릅니다. 이번 판 승률과 배당을 확인하세요.',s:`<div class="trow">${pill('1 느림보')}${pill('2 끈적이',1)}${pill('3 총알')}${pill('4 껍데기왕')}</div>`},
    {t:'천천히 기어가다가 가끔 멈추고, 갑자기 빨라지기도 합니다.',s:`<div class="trace snail">${[0,1,2].map(i=>`<div class="tlane"><span class="trun s${i}">🐌</span></div>`).join('')}</div>`},
    {t:'고른 달팽이가 1등이면 배당만큼 받습니다. 이긴 달팽이는 다음 판 승률이 내려갑니다.',s:`${res('2번 끈적이 우승!',1)}`}]},
  oddeven:{steps:[
    {t:'주사위 두 개를 굴려 나온 합이 홀수일지 짝수일지 고릅니다.',s:`<div class="trow">${pill('홀',1)}${pill('짝')}</div>${betTag('1,000P')}`},
    {t:'주사위가 굴러갑니다.',s:`<div class="trow big"><span class="tdie roll">⚂</span><span class="tdie roll">⚄</span></div>`},
    {t:'3 + 4 = 7, 홀수! 맞히면 1.95배를 받습니다.',s:`<div class="trow big"><span class="tdie">⚂</span><span class="tdie">⚃</span></div>${res('합 7 홀 · +1,950P',1)}`}]},
  baccarat:{steps:[
    {t:'플레이어, 뱅커, 타이(무승부) 중 어디가 이길지 겁니다. 내가 카드를 고르는 게임이 아닙니다.',s:`<div class="trow">${pill('플레이어 2배',1)}${pill('뱅커 1.95배')}${pill('타이 9배')}</div>`},
    {t:'양쪽에 카드를 2장씩 줍니다. 10·J·Q·K는 0점, A는 1점이고, 합의 일의 자리만 셉니다.',s:`<div class="trow">${mini('7','♠')}${mini('8','♥',1)}<b class="tarrow">= 15 → 5점</b></div>`},
    {t:'정해진 규칙에 따라 3번째 카드를 받기도 합니다. 9에 더 가까운 쪽이 이깁니다.',s:`<div class="trow"><span class="tsc">플레이어 8</span><b>VS</b><span class="tsc">뱅커 5</span></div>${res('플레이어 승 · ×2',1)}`},
    {t:'타이가 나오면 플레이어·뱅커에 건 돈은 그대로 돌려받습니다.',s:`${res('타이 · 원금 반환',1)}`},
    {t:'직접 플레이로 바꾸면 내가 플레이어 자리에 앉습니다. 내 카드를 눌러서 열고, 합이 5일 때만 한 장 더 받을지 고릅니다. 자세한 규칙은 오른쪽 "바카라 설명서"에 있습니다.',s:`<div class="trow">${mini('2','♣')}${mini('3','♦',1)}<b class="tarrow">= 5 → 받기 / 멈추기</b></div>`}]},
  slot:{steps:[
    {t:'금액을 정하고 스핀을 누르면 릴 3개가 돌아갑니다.',s:`<div class="treels"><span class="spin">🍒</span><span class="spin">🔔</span><span class="spin">⭐</span></div>`},
    {t:'가운데 줄에 같은 그림 3개가 나오면 그림마다 정해진 배당을 받습니다. 7·7·7은 500배입니다.',s:`<div class="treels"><span>7</span><span>7</span><span>7</span></div>${res('잭팟 ×500',1)}`},
    {t:'체리 2개는 0.5배를 줍니다. "당첨!"이라고 뜨지만 실제로는 건 돈보다 적게 받는 것입니다.',s:`<div class="treels"><span>🍒</span><span>🍒</span><span>🍋</span></div>${res('당첨? 1,000P 걸고 500P',0)}`}]},
  crash:{steps:[
    {t:'금액을 걸고 시작하면 배율이 1.00x부터 점점 빠르게 올라갑니다.',s:`<div class="tcrash"><svg viewBox="0 0 200 90"><path class="tline" d="M5 85 Q 120 80 190 8"/></svg><b class="tmult">1.00x → 2.41x</b></div>`},
    {t:'터지기 전에 캐시아웃을 누르면 그 순간 배율만큼 받습니다. 자동 캐시아웃 배율을 미리 정해 둘 수도 있습니다.',s:`<div class="tcrash"><b class="tmult win">2.00x 캐시아웃 · +1,000P</b></div>`},
    {t:'캐시아웃하기 전에 터지면 건 돈을 모두 잃습니다. 터지는 지점은 매번 무작위입니다.',s:`<div class="tcrash"><b class="tmult lose boom">펑! 1.37x</b></div>`},
    {t:'아주 낮은 배율(예: 1.01x)에서 빼면 거의 이기는 것처럼 보이지만, 3% 확률로 시작하자마자 터지기 때문에 결국 잃습니다. 그래서 최소 캐시아웃 배율이 있습니다.',s:`<div class="tformula">97% × 1.01 ≈ <b>0.98</b> (100보다 작음)</div>`}]},
  blackjack:{steps:[
    {t:'목표는 카드 합을 21에 최대한 가깝게, 하지만 넘지 않게 만드는 것입니다. A는 1 또는 11, J·Q·K는 10입니다.',s:`<div class="trow">${mini('A','♠')}${mini('K','♥',1)}<b class="tarrow">= 21 블랙잭!</b></div>`},
    {t:'나와 딜러가 2장씩 받습니다. 딜러 카드 1장은 엎어 둡니다.',s:`<div class="trow"><span class="tsc">딜러</span>${mini('9','♣')}<span class="tcard back"></span></div><div class="trow"><span class="tsc">나</span>${mini('6','♦',1)}${mini('5','♠')}<b class="tarrow">= 11</b></div>`},
    {t:'히트: 카드를 1장 더 받습니다. 스탠드: 그만 받고 멈춥니다. 21을 넘으면 버스트로 바로 집니다.',s:`<div class="trow">${pill('히트',1)}${pill('스탠드')}</div><div class="trow">${mini('6','♦',1)}${mini('5','♠')}${mini('10','♥',1)}<b class="tarrow">= 21</b></div>`},
    {t:'더블: 처음 2장만 받은 상태에서 같은 금액을 한 번 더 걸고, 카드를 딱 1장만 더 받고 끝냅니다. 이기면 두 배로 받고, 지면 두 배로 잃습니다. 합이 10·11일 때 많이 씁니다.',s:`<div class="trow">${pill('더블',1)}${betTag('1,000P → 2,000P')}</div>`},
    {t:'딜러는 합이 17 이상이 될 때까지 무조건 받습니다. 21에 더 가까운 쪽이 이기고, 이기면 2배, 처음 2장이 21이면 블랙잭으로 2.5배입니다.',s:`<div class="trow"><span class="tsc">나 20</span><b>VS</b><span class="tsc">딜러 18</span></div>${res('승리 ×2',1)}`},
    {t:'"승부 맞히기"를 고르면 직접 하지 않고, 자동으로 진행되는 판에서 플레이어·딜러·무승부 중 누가 이길지에 겁니다.',s:`<div class="trow">${pill('플레이어')}${pill('딜러',1)}${pill('무승부')}</div>`}]},
  roulette:{steps:[
    {t:'0부터 36까지 37칸 중 어디에 공이 멈출지 겁니다. 베팅 종류마다 당첨 확률과 배당이 다릅니다.',s:`<div class="tlist"><div>숫자 하나 <small>2.70% · 36배</small></div><div class="on">빨강·검정·홀·짝 <small>48.65% · 2배</small></div><div>1~12·13~24·25~36 <small>32.43% · 3배</small></div></div>`},
    {t:'휠이 돌고 공이 반대 방향으로 굴러갑니다.',s:`<div class="twheel spin"></div>`},
    {t:'공이 멈춘 칸이 내가 건 범위에 들어가면 배당만큼 받습니다.',s:`<div class="trow big"><span class="tball red">32</span></div>${res('빨강! ×2',1)}`},
    {t:'초록색 0이 나오면 숫자 0에 건 경우만 이깁니다. 이 한 칸 때문에 하우스가 늘 조금 유리합니다.',s:`<div class="trow big"><span class="tball green">0</span></div>${res('0 · 빨강 패배',0)}`}]},
};
let tutG=null,tutI=0,tutTimer=null;
function tutSeen(g){return!!LS.get('he.tut.'+g,false);}
function openTut(g,auto){
  const T=TUT[g];if(!T)return;tutG=g;
  $('#tutT').textContent=META[g].name+' 하는 방법';$('#tutSkip').checked=tutSeen(g);
  $('#tutModal').hidden=false;playTut();
}
function playTut(){clearTimeout(tutTimer);tutI=0;showStep();}
function showStep(){
  const T=TUT[tutG];const st=T.steps[tutI];
  $('#tutScene').innerHTML=st.s;$('#tutText').textContent=st.t;
  $('#tutScene').classList.remove('in');void $('#tutScene').offsetWidth;$('#tutScene').classList.add('in');
  $('#tutDots').innerHTML=T.steps.map((_,i)=>`<button type="button" class="${i===tutI?'on':''}" data-i="${i}" aria-label="${i+1}단계"></button>`).join('');
  $('#tutStep').textContent=(tutI+1)+' / '+T.steps.length;
  clearTimeout(tutTimer);if(tutI<T.steps.length-1)tutTimer=setTimeout(()=>{tutI++;showStep();},3600);
}
function closeTut(){clearTimeout(tutTimer);if($('#tutSkip').checked)LS.set('he.tut.'+tutG,true);else LS.del('he.tut.'+tutG);$('#tutModal').hidden=true;}
$('#tutDots').addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b){tutI=+b.dataset.i;showStep();}});
$('#tutPrev').onclick=()=>{if(tutI>0){tutI--;showStep();}};
$('#tutNext').onclick=()=>{const n=TUT[tutG].steps.length;if(tutI<n-1){tutI++;showStep();}else closeTut();};
$('#tutReplay').onclick=playTut;
$('#tutClose').onclick=closeTut;
$('#tutBtn').onclick=()=>{if(cur&&!busy)openTut(cur.id);};
