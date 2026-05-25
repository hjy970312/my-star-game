function onIdle(me, enemy, game) {
  var myPos = me.tank.position;
  var myDir = me.tank.direction;
  var enemyTank = enemy.tank;
  var map = game.map;

  // 1. 紧急躲避子弹
  if (enemy.bullet) {
    var bPos = enemy.bullet.position;
    var bDir = enemy.bullet.direction;
    if (isBulletThreatening(myPos, bPos, bDir)) {
      evade(me, myPos, bPos, bDir, map);
      return;
    }
  }

  // 2. 尝试使用技能 (Poison)
  if (me.skill.remainingCooldownFrames === 0 && enemyTank) {
    var dist = distance(myPos, enemyTank.position);
    if (dist < 6 || isAligned(myPos, enemyTank.position)) {
      me.poison();
      return;
    }
  }

  // 3. 进攻逻辑：如果敌人暴露在火力线下，直接开火
  if (enemyTank && !enemy.status.cloaked && canShoot(myPos, enemyTank.position, map)) {
    var targetDir = directionTo(myPos, enemyTank.position);
    if (myDir === targetDir) {
      me.fire();
    } else {
      me.turn(getTurnDir(myDir, targetDir));
    }
    return;
  }

  // 4. 寻星逻辑
  var star = game.star;
  if (star) {
    var next = nextStep(myPos, star, map);
    if (next) {
      moveToward(me, myDir, myPos, next);
      return;
    }
  }

  // 5. 巡逻/随机移动
  patrol(me, myDir, myPos, map);
}

// --- 辅助函数 ---

function isBulletThreatening(myPos, bPos, bDir) {
  if (myPos[0] === bPos[0]) { // 同一列
    if (bDir === "up" && bPos[1] > myPos[1]) return true;
    if (bDir === "down" && bPos[1] < myPos[1]) return true;
  }
  if (myPos[1] === bPos[1]) { // 同一行
    if (bDir === "left" && bPos[0] > myPos[0]) return true;
    if (bDir === "right" && bPos[0] < myPos[0]) return true;
  }
  return false;
}

function evade(me, myPos, bPos, bDir, map) {
  var escapeDirs = [];
  if (bDir === "up" || bDir === "down") {
    escapeDirs = ["left", "right"];
  } else {
    escapeDirs = ["up", "down"];
  }

  for (var i = 0; i < escapeDirs.length; i++) {
    var target = add(myPos, delta(escapeDirs[i]));
    if (isOpen(target, map)) {
      moveToward(me, me.tank.direction, myPos, target);
      return;
    }
  }
  // 如果侧面堵住了，尝试前后走？或者原地转圈（至少改变朝向可能有用）
  me.turn("right");
}

function moveToward(me, currentDir, from, to) {
  var dir = directionTo(from, to);
  if (currentDir === dir) {
    me.go();
  } else {
    me.turn(getTurnDir(currentDir, dir));
  }
}

function patrol(me, currentDir, position, map) {
  var forward = add(position, delta(currentDir));
  if (isOpen(forward, map)) {
    me.go();
  } else {
    me.turn("right");
  }
}

function canShoot(a, b, map) {
  if (a[0] !== b[0] && a[1] !== b[1]) return false;
  var dir = directionTo(a, b);
  var step = delta(dir);
  var pos = add(a, step);
  while (!samePos(pos, b)) {
    if (!isOpen(pos, map)) return false;
    pos = add(pos, step);
  }
  return true;
}

function nextStep(start, goal, map) {
  var queue = [{ pos: start, first: null }];
  var seen = {};
  seen[key(start)] = true;

  for (var head = 0; head < queue.length; head++) {
    var item = queue[head];
    if (samePos(item.pos, goal)) return item.first;

    var dirs = ["up", "right", "down", "left"];
    for (var i = 0; i < dirs.length; i++) {
      var next = add(item.pos, delta(dirs[i]));
      var k = key(next);
      if (seen[k] || !isOpen(next, map)) continue;
      seen[k] = true;
      queue.push({ pos: next, first: item.first || next });
    }
  }
  return null;
}

function isAligned(a, b) {
  return a[0] === b[0] || a[1] === b[1];
}

function distance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function directionTo(a, b) {
  if (b[0] > a[0]) return "right";
  if (b[0] < a[0]) return "left";
  if (b[1] > a[1]) return "down";
  return "up";
}

function getTurnDir(current, target) {
  var dirs = ["up", "right", "down", "left"];
  var curIdx = dirs.indexOf(current);
  var tarIdx = dirs.indexOf(target);
  var diff = (tarIdx - curIdx + 4) % 4;
  return diff === 3 ? "left" : "right";
}

function delta(dir) {
  var d = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  return d[dir] || [0, 0];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}

function samePos(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function key(p) {
  return p[0] + "," + p[1];
}

function isOpen(p, map) {
  var x = p[0], y = p[1];
  return map[x] && map[x][y] && map[x][y] !== "x" && map[x][y] !== "m";
}
