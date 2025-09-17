// Ajedrez completo + IA (sin prompts) usando chess.js
(() => {
  const tableroEl = document.getElementById("tablero");
  const listaMovEl = document.getElementById("lista-mov");
  const turnoEl = document.getElementById("turno");
  const btnReiniciar = document.getElementById("btn-reiniciar");
  const modeSel = document.getElementById("mode");
  const colorSel = document.getElementById("humanColor");
  const depthSel = document.getElementById("depth");

  if (!tableroEl || !btnReiniciar || !modeSel || !colorSel || !depthSel) {
    console.error("Faltan elementos en el HTML (ids). Revisa index.html");
    return;
  }

  let game = new Chess();      // Reglas completas
  let selected = null;         // {sq, moves[]}
  let thinking = false;
  const files = ["a","b","c","d","e","f","g","h"];

  function getMode()       { return modeSel.value; }       // 'hvh' | 'hva'
  function getHumanColor() { return colorSel.value; }      // 'w' | 'b'
  function getDepth()      { return parseInt(depthSel.value,10) || 3; }

  function statusText(){
    if (game.in_checkmate()) return "♛ Jaque mate — " + (game.turn()==="w" ? "Negras" : "Blancas") + " ganan";
    if (game.in_draw())      return "½–½ Tablas";
    const t = game.turn()==="w" ? "♙ Blancas" : "♟ Negras";
    return (game.in_check() ? "⚠️ Jaque — " : "Turno: ") + t;
  }
  function toGlyph(p){
    const map = { wp:"♙", wr:"♖", wn:"♘", wb:"♗", wq:"♕", wk:"♔", bp:"♟", br:"♜", bn:"♞", bb:"♝", bq:"♛", bk:"♚" };
    return map[p.color + p.type];
  }

  function drawBoard(){
    tableroEl.innerHTML = "";
    turnoEl.textContent = statusText();

    const humanColor = getHumanColor();
    const orient = (getMode()==="hva" && humanColor==="b")
      ? { rStart:7, rStep:-1, cStart:7, cStep:-1 } // negras abajo
      : { rStart:7, rStep:-1, cStart:0,  cStep:1  }; // blancas abajo

    for (let rr=0; rr<8; rr++){
      for (let cc=0; cc<8; cc++){
        const r = orient.rStart + rr*orient.rStep;
        const c = orient.cStart  + cc*orient.cStep;
        const sq = files[c] + (r+1);
        const piece = game.get(sq);

        const cel = document.createElement("div");
        cel.className = "celda " + ((r+c)%2===0 ? "c-light" : "c-dark");
        cel.dataset.sq = sq;

        if (selected && selected.moves.some(m => m.to === sq)) {
          if (game.get(sq)) cel.classList.add("capture"); else cel.classList.add("destino");
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

    const humanTurn = (getMode()==="hvh") || (game.turn() === getHumanColor());
    if (!humanTurn) return;

    if (!selected){
      if (p && p.color === game.turn()){
        selected = { sq, moves: legalMovesFrom(sq) };
        drawBoard();
      }
      return;
    }
    if (p && p.color === game.turn()){
      selected = { sq, moves: legalMovesFrom(sq) };
      drawBoard();
      return;
    }
    tryMove(selected.sq, sq);
  }

  function legalMovesFrom(fromSq){
    return game.moves({verbose:true}).filter(m => m.from === fromSq);
  }
  function needsPromotion(from,to){
    const piece = game.get(from);
    if (!piece || piece.type!=="p") return false;
    if (piece.color==="w" && to.endsWith("8")) return true;
    if (piece.color==="b" && to.endsWith("1")) return true;
    return false;
  }
  function askPromotion(){
    let p = prompt("Promoción (q=Reina,r=Torre,b=Alfil,n=Caballo):","q");
    p = (p||"q").toLowerCase();
    if (!["q","r","b","n"].includes(p)) p = "q";
    return p;
  }

  function tryMove(from,to){
    let move;
    if (needsPromotion(from,to)){
      move = game.move({from,to,promotion: askPromotion()});
    } else {
      move = game.move({from,to});
    }
    if (!move){ selected=null; drawBoard(); return; }
    pushMove(move.san);
    selected = null;
    drawBoard();

    if (game.game_over()) return;

    if (getMode()==="hva" && game.turn() !== getHumanColor()){
      setTimeout(aiMove, 60);
    }
  }

  function pushMove(san){
    const li = document.createElement("li");
    li.textContent = san;
    listaMovEl.appendChild(li);
    listaMovEl.scrollTop = listaMovEl.scrollHeight;
  }

  // ===== IA (minimax con poda) =====
  function aiMove(){
    thinking = true;
    const d = getDepth();
    const { best } = searchRoot(game, d);
    if (best){ game.move(best); pushMove(best.san); }
    thinking = false;
    drawBoard();
  }
  function searchRoot(chess, depth){
    let best=null, bestScore=-Infinity;
    const moves = chess.moves({verbose:true});
    moves.sort((a,b)=> (b.flags.includes("c")?1:0) - (a.flags.includes("c")?1:0));
    for(const m of moves){
      chess.move(m);
      const score = -negamax(chess, depth-1, -Infinity, +Infinity);
      chess.undo();
      if (score>bestScore){ bestScore=score; best=m; }
    }
    return {best, bestScore};
  }
  function negamax(chess, depth, alpha, beta){
    if (depth===0 || chess.game_over()) return evaluate(chess);
    let max=-Infinity;
    const moves = chess.moves({verbose:true});
    moves.sort((a,b)=> (b.flags.includes("c")?1:0) - (a.flags.includes("c")?1:0));
    for(const m of moves){
      chess.move(m);
      const score = -negamax(chess, depth-1, -beta, -alpha);
      chess.undo();
      if (score>max) max=score;
      if (score>alpha) alpha=score;
      if (alpha>=beta) break;
    }
    return max;
  }
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
    let score=0; const board = chess.board();
    for(let r=0;r<8;r++){
      for(let c=0;c<8;c++){
        const p = board[r][c]; if (!p) continue;
        const val = VAL[p.type]; const idxW=r*8+c, idxB=(7-r)*8+(7-c);
        const pst = PST_W[p.type][ p.color==="w" ? idxW : idxB ];
        score += (p.color==="w" ? +1 : -1) * (val + pst);
      }
    }
    // movilidad ligera
    score += (chess.turn()==="w" ? -chess.moves().length : +chess.moves().length) * 0.5;
    return score;
  }

  function nueva(){
    game = new Chess();
    selected = null;
    if (listaMovEl) listaMovEl.innerHTML = "";
    drawBoard();
    if (getMode()==="hva" && getHumanColor()==="b"){
      setTimeout(aiMove, 80);
    }
  }

  btnReiniciar.addEventListener("click", nueva);
  modeSel.addEventListener("change", nueva);
  colorSel.addEventListener("change", nueva);
  depthSel.addEventListener("change", ()=>{}); // se lee en tiempo real

  nueva();
})();
