/* ============================================================
   AI Tic-Tac-Toe -- Game Logic
   ============================================================ */

(function () {
  'use strict';

  // ---- Constants ----
  const HUMAN = 'X';
  const AI_PLAYER = 'O';
  const WIN_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]             // diags
  ];

  // ---- State ----
  let board = Array(9).fill(null);
  let gameOver = false;
  let aiThinking = false;
  let difficulty = 'easy'; // easy | medium | hard
  let scores = { x: 0, o: 0, draw: 0 };
  let soundEnabled = true;

  // ---- DOM refs ----
  const cells = document.querySelectorAll('.cell');
  const statusEl = document.getElementById('status');
  const scoreXEl = document.getElementById('score-x');
  const scoreOEl = document.getElementById('score-o');
  const scoreDrawEl = document.getElementById('score-draw');
  const btnRestart = document.getElementById('btn-restart');
  const btnSound = document.getElementById('btn-sound');
  const iconSoundOn = document.getElementById('icon-sound-on');
  const iconSoundOff = document.getElementById('icon-sound-off');
  const diffBtns = document.querySelectorAll('.diff-btn');
  const winLineSvg = document.getElementById('win-line-svg');
  const winLine = document.getElementById('win-line');
  const boardEl = document.getElementById('board');

  // ---- Audio (Web Audio API) ----
  let audioCtx;

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playTone(freq, duration, type, volume) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.value = volume || 0.12;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (_) { /* ignore audio errors */ }
  }

  function soundPlace() {
    playTone(520, 0.12, 'sine', 0.15);
  }

  function soundAIPlace() {
    playTone(340, 0.15, 'triangle', 0.12);
  }

  function soundWin() {
    [0, 100, 200, 300].forEach((delay, i) => {
      setTimeout(() => playTone(440 + i * 110, 0.25, 'sine', 0.13), delay);
    });
  }

  function soundLose() {
    [0, 150, 300].forEach((delay, i) => {
      setTimeout(() => playTone(300 - i * 60, 0.3, 'sawtooth', 0.08), delay);
    });
  }

  function soundDraw() {
    playTone(400, 0.3, 'triangle', 0.1);
  }

  // ---- Particles ----
  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'particle';
      const size = Math.random() * 6 + 3;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 60 + 30;
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.background = color;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      el.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }
  }

  function spawnConfetti() {
    const colors = ['#f472b6', '#38bdf8', '#a78bfa', '#facc15', '#34d399', '#fb923c'];
    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'confetti';
        const size = Math.random() * 8 + 4;
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.left = Math.random() * window.innerWidth + 'px';
        el.style.top = Math.random() * window.innerHeight * 0.4 + 'px';
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
      }, i * 30);
    }
  }

  // ---- Background Canvas Animation ----
  function initBgCanvas() {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let w, h;
    const dots = [];
    const DOT_COUNT = 60;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < DOT_COUNT; i++) {
      dots.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      // Draw connections
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[j].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(108, 99, 255, ${0.08 * (1 - dist / 140)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      // Draw dots
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(108, 99, 255, 0.3)';
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ---- AI (Minimax) ----
  function getAvailable(b) {
    return b.map((v, i) => v === null ? i : null).filter(v => v !== null);
  }

  function checkWinner(b) {
    for (const combo of WIN_COMBOS) {
      const [a, c, d] = combo;
      if (b[a] && b[a] === b[c] && b[a] === b[d]) {
        return { winner: b[a], combo };
      }
    }
    if (b.every(v => v !== null)) return { winner: 'draw', combo: null };
    return null;
  }

  function minimax(b, depth, isMaximizing, alpha, beta) {
    const result = checkWinner(b);
    if (result) {
      if (result.winner === AI_PLAYER) return 10 - depth;
      if (result.winner === HUMAN) return depth - 10;
      return 0;
    }

    if (isMaximizing) {
      let best = -Infinity;
      for (const idx of getAvailable(b)) {
        b[idx] = AI_PLAYER;
        const score = minimax(b, depth + 1, false, alpha, beta);
        b[idx] = null;
        best = Math.max(best, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const idx of getAvailable(b)) {
        b[idx] = HUMAN;
        const score = minimax(b, depth + 1, true, alpha, beta);
        b[idx] = null;
        best = Math.min(best, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function getBestMove(b) {
    let bestScore = -Infinity;
    let bestMove = -1;
    for (const idx of getAvailable(b)) {
      b[idx] = AI_PLAYER;
      const score = minimax(b, 0, false, -Infinity, Infinity);
      b[idx] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = idx;
      }
    }
    return bestMove;
  }

  function getRandomMove(b) {
    const avail = getAvailable(b);
    return avail[Math.floor(Math.random() * avail.length)];
  }

  function getAIMove(b) {
    if (difficulty === 'easy') {
      // 20% chance of optimal move
      return Math.random() < 0.2 ? getBestMove(b) : getRandomMove(b);
    }
    if (difficulty === 'medium') {
      // 60% chance of optimal move
      return Math.random() < 0.6 ? getBestMove(b) : getRandomMove(b);
    }
    // hard -- always optimal
    return getBestMove(b);
  }

  // ---- Win line coordinates ----
  function getLineCoordsForCombo(combo) {
    // Each cell center in a 312x312 grid with 3 cols, gap=8
    // Cell size: (312 - 2*8) / 3 = ~98.67; each cell center = cellSize/2 + col*(cellSize+gap)
    const cellSize = (312 - 2 * 8) / 3;
    const gap = 8;

    function center(idx) {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      return {
        x: col * (cellSize + gap) + cellSize / 2,
        y: row * (cellSize + gap) + cellSize / 2,
      };
    }

    const start = center(combo[0]);
    const end = center(combo[2]);
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  }

  function showWinLine(combo) {
    const coords = getLineCoordsForCombo(combo);
    winLine.setAttribute('x1', coords.x1);
    winLine.setAttribute('y1', coords.y1);
    winLine.setAttribute('x2', coords.x2);
    winLine.setAttribute('y2', coords.y2);
    // Reset animation
    winLine.style.animation = 'none';
    void winLine.offsetWidth; // trigger reflow
    winLine.style.animation = '';
    winLineSvg.classList.add('visible');
  }

  function hideWinLine() {
    winLineSvg.classList.remove('visible');
  }

  // ---- Render ----
  function render() {
    cells.forEach((cell, i) => {
      const val = board[i];
      cell.textContent = val || '';
      cell.classList.remove('x', 'o', 'taken', 'winner');
      if (val === HUMAN) {
        cell.classList.add('x', 'taken');
      } else if (val === AI_PLAYER) {
        cell.classList.add('o', 'taken');
      }
    });
    scoreXEl.textContent = scores.x;
    scoreOEl.textContent = scores.o;
    scoreDrawEl.textContent = scores.draw;
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (cls ? ' ' + cls : '');
  }

  function bumpScore(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  // ---- Handle end ----
  function handleEnd(result) {
    gameOver = true;

    if (result.winner === HUMAN) {
      scores.x++;
      bumpScore(scoreXEl);
      setStatus('You win!', 'win-x');
      soundWin();
      spawnConfetti();
      if (result.combo) {
        result.combo.forEach(i => cells[i].classList.add('winner'));
        showWinLine(result.combo);
      }
    } else if (result.winner === AI_PLAYER) {
      scores.o++;
      bumpScore(scoreOEl);
      setStatus('AI wins!', 'win-o');
      soundLose();
      if (result.combo) {
        result.combo.forEach(i => cells[i].classList.add('winner'));
        showWinLine(result.combo);
      }
    } else {
      scores.draw++;
      bumpScore(scoreDrawEl);
      setStatus("It's a draw!", 'draw');
      soundDraw();
    }
    render();
  }

  // ---- AI turn ----
  function aiTurn() {
    if (gameOver) return;
    aiThinking = true;
    setStatus('AI is thinking...');

    const delay = 350 + Math.random() * 300;
    setTimeout(() => {
      const move = getAIMove(board);
      if (move === -1 || move === undefined) { aiThinking = false; return; }

      board[move] = AI_PLAYER;
      render();
      soundAIPlace();

      // Particle burst on AI cell
      const cellRect = cells[move].getBoundingClientRect();
      spawnParticles(
        cellRect.left + cellRect.width / 2,
        cellRect.top + cellRect.height / 2,
        '#38bdf8',
        8
      );

      const result = checkWinner(board);
      if (result) {
        handleEnd(result);
      } else {
        setStatus('Your turn -- tap a cell');
      }
      aiThinking = false;
    }, delay);
  }

  // ---- Human click ----
  function handleCellClick(e) {
    if (gameOver || aiThinking) return;
    const idx = parseInt(e.target.dataset.index, 10);
    if (board[idx] !== null) return;

    board[idx] = HUMAN;
    render();
    soundPlace();

    // Particle burst
    const cellRect = e.target.getBoundingClientRect();
    spawnParticles(
      cellRect.left + cellRect.width / 2,
      cellRect.top + cellRect.height / 2,
      '#f472b6',
      8
    );

    const result = checkWinner(board);
    if (result) {
      handleEnd(result);
      return;
    }

    aiTurn();
  }

  // ---- Reset ----
  function resetGame() {
    board = Array(9).fill(null);
    gameOver = false;
    aiThinking = false;
    hideWinLine();
    setStatus('Your turn -- tap a cell');
    render();
  }

  // ---- Event listeners ----
  cells.forEach(cell => cell.addEventListener('click', handleCellClick));
  btnRestart.addEventListener('click', resetGame);

  btnSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    iconSoundOn.style.display = soundEnabled ? '' : 'none';
    iconSoundOff.style.display = soundEnabled ? 'none' : '';
  });

  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      diffBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      difficulty = btn.dataset.diff;
      // Reset game when switching difficulty
      scores = { x: 0, o: 0, draw: 0 };
      resetGame();
    });
  });

  // ---- Position the SVG overlay ----
  function positionWinSvg() {
    const boardRect = boardEl.getBoundingClientRect();
    winLineSvg.style.position = 'fixed';
    winLineSvg.style.left = boardRect.left + 'px';
    winLineSvg.style.top = boardRect.top + 'px';
    winLineSvg.style.width = boardRect.width + 'px';
    winLineSvg.style.height = boardRect.height + 'px';
  }

  window.addEventListener('resize', positionWinSvg);

  // Use ResizeObserver for more reliable positioning
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(positionWinSvg).observe(boardEl);
  }

  // ---- Init ----
  render();
  initBgCanvas();
  setTimeout(positionWinSvg, 50);
})();

