'use strict';

const fs = require('fs');
const path = require('path');

const root = __dirname;
const dist = path.join(root, 'dist');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

let main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
main = main.replace(
  /\/\* <DEV_CHEATS_BEGIN> \*\/[\s\S]*?\/\* <DEV_CHEATS_END> \*\//,
  `(() => {
      window.devCheats = {
        skipToWin() {},
        skipToLose() {},
        setLevel() {},
        spawnEnemy() {},
      };
    })();`
);

fs.writeFileSync(path.join(dist, 'main.js'), main);
fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));
fs.copyFileSync(path.join(root, 'style.css'), path.join(dist, 'style.css'));
copyDir(path.join(root, 'assets'), path.join(dist, 'assets'));
