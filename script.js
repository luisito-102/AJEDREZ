// Ajedrez v1 — movimientos básicos sin jaque/jaque mate/enroque/al paso
// Representación simple: tablero 8x8, piezas Unicode

const tableroEl = document.getElementById("tablero");
const listaMovEl = document.getElementById("lista-mov");
const turnoEl = document.getElementById("turno");
const btnReiniciar = document.getElementById("btn-reiniciar");

const VACIO = null;
const BLANCAS = "w";
const NEGRAS = "b";

const PIEZAS = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟︎"
};

// Estado del juego
let tablero = [];
let turno = BLANCAS;
let seleccion = null;     // {r,c}
let destinos = [];        // [{r,c}, ...]
let movLog = [];

// Inicializar tablero
function inicial() {
  tablero = Array.from({length:8}, ()=> Array(8).fill(VACIO));
  // Negras
  tablero[0] = ["bR","bN","bB","bQ","bK","bB","bN","bR"];
  tablero[1] = Array(8).fill("bP");
  // Blancas
  tablero[6] = Array(8).fill("wP");
  tablero[7] = ["wR","wN","wB","wQ","wK","wB","wN","wR"];
  turno = BLANCAS;
  seleccion = null;
  destinos = [];
  movLog = [];
  dibujar();
  actualizarTurno();
  listaMovEl.innerHTML = "";
}

// Dibujar tablero y piezas
function dibujar(){
  tableroEl.innerHTML = "";
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const cel = document.createElement("div");
      cel.className = `celda ${(r+c)%2===0 ? "c-light":"c-dark"}`;
      cel.dataset.r = r;
      cel.dataset.c = c;

      // Destinos marcados
      if(destinos.some(d => d.r===r && d.c===c)){
        // Si hay pieza rival en destino, color diferente
        if(tablero[r][c] !== VACIO) cel.classList.add("capture");
        else cel.classList.add("destino");
      }

      // Selección
      if(seleccion && seleccion.r===r && seleccion.c===c){
        cel.classList.add("seleccionada");
        const gh = document.createElement("div");
        gh.className = "fantasma";
        cel.appendChild(gh);
      }

      const pieza = tablero[r][c];
      if(pieza){
        const span = document.createElement("span");
        span.textContent = PIEZAS[pieza];
        span.className = `pieza ${pieza[0]=== "w" ? "blanca":"negra"}`;
        cel.appendChild(span);
      }

      cel.addEventListener("click", onClickCelda);
      tableroEl.appendChild(cel);
    }
  }
}

// Click en casilla
function onClickCelda(e){
  const r = +e.currentTarget.dataset.r;
  const c = +e.currentTarget.dataset.c;
  const pieza = tablero[r][c];

  // Si ya hay una selección y clic en un destino válido -> mover
  if(seleccion && destinos.some(d => d.r===r && d.c===c)){
    mover(seleccion.r, seleccion.c, r, c);
    seleccion = null;
    destinos = [];
    dibujar();
    return;
  }

  // Si clic en pieza del turno -> seleccionar y calcular destinos
  if(pieza && pieza[0] === turno){
    seleccion = {r,c};
    destinos = movimientosLegales(r,c, pieza);
    dibujar();
  } else {
    // Clic fuera / pieza rival = limpiar selección
    seleccion = null;
    destinos = [];
    dibujar();
  }
}

function actualizarTurno(){
  turnoEl.textContent = `Turno: ${turno===BLANCAS?"♙ Blancas":"♟ Negras"}`;
}

// Mover pieza (con promoción de peón a dama automática)
function mover(r1,c1,r2,c2){
  const pieza = tablero[r1][c1];
  const destino = tablero[r2][c2];

  // Ejecutar
  tablero[r2][c2] = pieza;
  tablero[r1][c1] = VACIO;

  // Promoción peón
  if(pieza === "wP" && r2 === 0) tablero[r2][c2] = "wQ";
  if(pieza === "bP" && r2 === 7) tablero[r2][c2] = "bQ";

  // Log
  movLog.push(notacion(pieza, r1,c1,r2,c2, destino!==VACIO));
  renderLog();

  // Cambiar turno
  turno = (turno===BLANCAS? NEGRAS: BLANCAS);
  actualizarTurno();
}

// Mostrar lista de movimientos
function renderLog(){
  listaMovEl.innerHTML = "";
  movLog.forEach((m, i)=>{
    const li = document.createElement("li");
    li.textContent = m;
    listaMovEl.appendChild(li);
  });
}

// Generar movimientos legales básicos (sin jaque ni enroque ni al paso)
function movimientosLegales(r,c,p){
  const color = p[0]; // w/b
  const tipo = p[1];  // K,Q,R,B,N,P
  const moves = [];

  // Helpers
  const vacio = (rr,cc)=> dentro(rr,cc) && tablero[rr][cc]===VACIO;
  const rival = (rr,cc)=> dentro(rr,cc) && tablero[rr][cc]!==VACIO && tablero[rr][cc][0]!==color;
  const libre = (rr,cc)=> dentro(rr,cc) && tablero[rr][cc]===VACIO;

  function rayos(drs){
    for(const [dr,dc] of drs){
      let rr=r+dr, cc=c+dc;
      while(dentro(rr,cc)){
        if(tablero[rr][cc]===VACIO){ moves.push({r:rr,c:cc}); }
        else { if(tablero[rr][cc][0]!==color) moves.push({r:rr,c:cc}); break; }
        rr+=dr; cc+=dc;
      }
    }
  }

  switch(tipo){
    case "P": {
      const dir = (color===BLANCAS? -1: +1);
      const filaInicio = (color===BLANCAS? 6: 1);
      // Avance 1
      if(libre(r+dir, c)) moves.push({r:r+dir,c});
      // Avance 2 desde inicio
      if(r===filaInicio && libre(r+dir,c) && libre(r+2*dir,c)) moves.push({r:r+2*dir,c});
      // Capturas diagonales
      if(rival(r+dir, c-1)) moves.push({r:r+dir,c:c-1});
      if(rival(r+dir, c+1)) moves.push({r:r+dir,c:c+1});
      break;
    }
    case "N": { // Caballo
      const saltos = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for(const [dr,dc] of saltos){
        const rr=r+dr, cc=c+dc;
        if(!dentro(rr,cc)) continue;
        if(tablero[rr][cc]===VACIO || tablero[rr][cc][0]!==color) moves.push({r:rr,c:cc});
      }
      break;
    }
    case "B": { // Alfil
      rayos([[1,1],[1,-1],[-1,1],[-1,-1]]);
      break;
    }
    case "R": { // Torre
      rayos([[1,0],[-1,0],[0,1],[0,-1]]);
      break;
    }
    case "Q": { // Dama
      rayos([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
      break;
    }
    case "K": { // Rey (sin enroque)
      for(const dr of [-1,0,1]){
        for(const dc of [-1,0,1]){
          if(dr===0 && dc===0) continue;
          const rr=r+dr, cc=c+dc;
          if(!dentro(rr,cc)) continue;
          if(tablero[rr][cc]===VACIO || tablero[rr][cc][0]!==color) moves.push({r:rr,c:cc});
        }
      }
      break;
    }
  }
  return moves;
}

function dentro(r,c){ return r>=0 && r<8 && c>=0 && c<8; }

// Notación simple: Pieza x destino (sin +, #, etc.)
function notacion(p, r1,c1,r2,c2, captura){
  const piezas = {K:"R", Q:"D", R:"T", B:"A", N:"C", P:""};
  const letra = piezas[p[1]];
  const col = ["a","b","c","d","e","f","g","h"];
  const origen = col[c1]+(8-r1);
  const destino = col[c2]+(8-r2);
  return `${p[0]==="w"?"(B)":"(N)"} ${letra}${captura?"x":""}${destino}`;
}

// Reiniciar
btnReiniciar.addEventListener("click", inicial);

// Start
inicial();
