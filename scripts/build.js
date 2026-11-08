// src/ 조각들을 public/app.html 한 파일로 합친다. 사용: npm run build
const fs = require('fs');
const path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');

const html = `<title>하우스 엣지</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap">
<style>
${src('base.css')}
${src('games.css')}
${src('games2.css')}
${src('tutorial.css')}
</style>
${src('markup.html')}
<script>
(function(){
${src('core.js')}
${src('games.js')}
${src('games2.js')}
${src('tutorial.js')}
${src('tail.js')}
})();
</script>
`;
fs.writeFileSync(path.join(__dirname, '..', 'public', 'app.html'), html);
console.log('public/app.html', html.length, 'bytes');
