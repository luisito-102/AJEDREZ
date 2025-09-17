// Ajedrez completo + IA (minimax) usando chess.js
// Mantiene tus IDs existentes: #tablero, #btn-reiniciar, #turno, #lista-mov
// No necesitas cambiar HTML: al cargar, te preguntará el MODO, COLOR y DIFICULTAD.

(() => {
  // ==== DOM ====
  const tableroEl = document.getElementById("tablero");
  const listaMovEl = document.getElementById("lista-mov");
  const turnoEl = document.getElementById("turno");
  const btnReiniciar = document.getElementById("btn-reiniciar");

  // ==== Config elegida por el usuario ====
  let mode = prompt("Modo: 'hvh' (humano vs humano) o 'hva' (humano vs máquina)", "hva");
  if (mode !== "hvh" && mode !== "hva") mode = "hva";
  let humanColor = prompt("Elige color: 'w' (blancas) o 'b' (negras)", "w");
  if (humanColor !== "w" && humanColor !== "b") humanColor = "w";
  let depth = parseInt(prompt("Dificultad IA (1-4). 3 = bueno, 4 = fuerte (más lento)", "3") || "3", 10);
  depth = Math.max(1, Math.min(4, isFinite(depth) ? depth : 3));

  // ==== Juego (chess.js maneja TODAS las reglas) ====
  let game = new Chess(); // Reglas oficiales: jaque, mate, enroque, al paso, promoción, tablas, etc.
  let selected = null;    // {sq, moves[]}
  let thinking = false;

  const files = ["a","b","c","d","e","f","g","h"];

  function statusText() {
    if (game.in_checkmate()) return "♛ Jaque mate — " + (game.turn()==="w" ? "Negras" : "Blancas") + " ganan";
    if (game.in_draw())      return "½–½ Tablas";
    const t = game.turn()==="w" ? "♙ Blancas" : "♟ Negras";
    return (game.in_check() ? "⚠️ Jaque — " : "Turno: ") + t;
  }

  function toGlyph(p){
    const map = {
      wp:"♙", wr:"♖", wn:"♘", wb:"♗", wq:"♕", wk:"♔",
      bp:"♟", br:"♜", bn:"♞", bb:"♝", bq:"♛", bk:"♚"
    };
    return map[p.color + p.type];
  }

  function drawBoard(){
    tableroEl.innerHTML = "";
    if (turnoEl) turnoEl.textContent = statusText();

    // Orienta el tablero según color del humano (si juega vs IA)
    const orient = (mode==="hva" && humanColor==="b")
      ? { rStart:7, rStep:-1, cStart:7, cStep:-1 } // negras abajo
      : { rStart:7, rStep:-1, cStart:0, cStep:1 }; // blancas abajo (por defecto)

    for (let rr=0; rr<8; rr++){
      for (let cc=0; cc<8; cc++){
        const r = orient.rStart + rr*orient.rStep;
        const c = orient.cStart + cc*orient.cStep;
        const sq = files[c] + (r+1);
        const piece = game.get(sq);

        const cel = document.createElement("div");
        cel.className = "celda " + ((r+c)%2===0 ? "c-light" : "c-dark");
        cel.dataset.sq = sq;

        // resaltado destinos
        if (selected && selected.moves.some(m => m.to === sq)) {
          if (game.get(sq)) cel.classList.add("capture");
          else cel.classList.add("destino");
        }
        if (selected && selected.sq === sq) cel.classList.add("seleccionada");

        if (piece){
          const span = document.createElement("span");
          span.textContent = toGlyph(piece);
          span.className = "pieza " + (piece.color==="w" ? "blanca" : "negra");
          cel.appendChild(span);
        }

        cel.addEventListener("click", onClickSquare);
        tableroEl.appendChild(cel);
      }
    }
  }

  function onClickSquare(e){
    if (thinking) return; // IA pensando
    const sq = e.currentTarget.dataset.sq;
    const p = game.get(sq);

    const humanTurn = (mode==="hvh") || (game.turn() === humanColor);
    if (!humanTurn) return;

    // seleccionar pieza propia
    if (!selected){
      if (p && p.color === game.turn()){
        selected = { sq, moves: legalMovesFrom(sq) };
        drawBoard();
      }
      return;
    }

    // cambiar selección a otra pieza propia
    if (p && p.color === game.turn()){
      selected = { sq, moves: legalMovesFrom(sq) };
      drawBoard();
      return;
    }

    // intentar mover
    tryMove(selected.sq, sq);
  }

  function legalMovesFrom(fromSq){
    return game.moves({verbose:true}).filter(m => m.from === fromSq);
  }

  function needsPromotion(from, to){
    const piece = game.get(from);
    if (!piece || piece.type !== "p") return false;
    if (piece.color === "w" && to.endsWith("8")) return true;
    if (piece.color === "b" && to.endsWith("1")) return true;
    return false;
  }

  function askPromotion(){
    let p = prompt("Promocionar a (q=Reina, r=Torre, b=Alfil, n=Caballo):", "q");
    p = (p||"q").toLowerCase();
    if (!["q","r","b","n"].includes(p)) p = "q";
    return p;
  }

  function tryMove(from, to){
    let move;
    if (needsPromotion(from, to)){
      const promo = askPromotion();
      move = game.move({ from, to, promotion: promo });
    } else {
      move = game.move({ from, to });
    }

    // Si movimiento es ilegal, no hace nada (chess.js valida jaque, enroque, al paso, etc.)
    if (!move) { selected=null; drawBoard(); return; }

    // log
    pushMove(move.san);

    selected = null;
    drawBoard();

    // fin de partida
    if (game.game_over()) return;

    // turno IA
    if (mode==="hva" && game.turn() !== humanColor){
      setTimeout(aiMove, 50);
    }
  }

  function pushMove(san){
    if (!listaMovEl) return;
    const li = document.createElement("li");
    li.textContent = san;
    listaMovEl.appendChild(li);
    listaMovEl.scrollTop = listaMovEl.scrollHeight;
  }

  // ==== IA: minimax con poda (negamax) ====
  function aiMove(){
    thinking = true;
    const { best } = searchRoot(game, depth);
    if (best) {
      game.move(best);
      pushMove(best.san);
    }
    thinking = false;
    drawBoard();
  }

  function searchRoot(chess, d){
    let best = null;
    let bestScore = -Infinity;
    const moves = chess.moves({verbose:true});
    // Un poco de orden: capturas primero
    moves.sort((a,b)=> (b.flags.includes("c")?1:0) - (a.flags.includes("c")?1:0));

    for (const m of moves){
      chess.move(m);
      const score = -negamax(chess, d-1, -Infinity, +Infinity);
      chess.undo();
      if (score > bestScore){
        bestScore = score;
        best = m;
      }
    }
    return { bestScore, best };
  }

  function negamax(chess, d, alpha, beta){
    if (d === 0 || chess.game_over()) return evaluate(chess);

    let max = -Infinity;
    const moves = chess.moves({verbose:true});
    moves.sort((a,b)=> (b.flags.includes("c")?1:0) - (a.flags.includes("c")?1:0));
    for (const m of moves){
      chess.move(m);
      const score = -negamax(chess, d-1, -beta, -alpha);
      chess.undo();
      if (score > max) max = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return max;
  }

  // Evaluación: material + tablas PST (suficiente para jugar bien a profundidad 3–4)
  const VAL = { p:100, n:320, b:330, r:500, q:900, k:0 };
  const PST_W = {
    p:[0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    n:[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
    b:[-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
    r:[0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    q:[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
    k:[-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
  };
  function evaluate(chess){
    if (chess.in_checkmate()) return chess.turn()==="w" ? -Infinity : +Infinity;
    if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition() || chess.insufficient_material()) return 0;

    let score = 0;
    const board = chess.board(); // 8x8
    for (let r=0;r<8;r++){
      for (let c=0;c<8;c++){
        const p = board[r][c];
        if (!p) continue;
        const val = VAL[p.type];
        // PST blanca tal cual, para negras espejamos
        const idxW = r*8+c;
        const idxB = (7-r)*8 + (7-c);
        const pst = PST_W[p.type][ p.color==="w" ? idxW : idxB ];
        score += (p.color==="w" ? +1 : -1) * (val + pst);
      }
    }
    // Pequeña bonificación por movilidad
    const m = chess.moves().length;
    score += (chess.turn()==="w" ? -m : +m) * 0.5;
    return score;
  }

  // ==== Nueva partida / Botón Reiniciar ====
  function nueva(){
    game = new Chess();
    selected = null;
    if (listaMovEl) listaMovEl.innerHTML = "";
    drawBoard();
    // Si la máquina juega con blancas, que mueva ya
    if (mode==="hva" && humanColor==="b"){
      setTimeout(aiMove, 80);
    }
  }
  if (btnReiniciar) btnReiniciar.addEventListener("click", nueva);

  // ==== Inicio ====
  nueva();

})();
