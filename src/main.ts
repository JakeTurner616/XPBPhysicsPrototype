// src/main.ts
import { World, DefaultConfig } from "./xpbd";
import { Tire } from "./tire";
import { debugLog } from "./debug";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
resize(); addEventListener("resize", resize);

let running = false;
let world: World;
let tire: Tire;

// ============ INPUT =============
const keys = { left:false, right:false, up:false };
let showTireDebug = true; // DEBUG VISUALIZATION ON BY DEFAULT

addEventListener("keydown", e=>{
    if (e.code === "ArrowLeft") keys.left = true;
    if (e.code === "ArrowRight") keys.right = true;
    if (e.code === "ArrowUp" || e.code==="Space") keys.up = true;
    if (e.key === "t") showTireDebug = !showTireDebug;
});
addEventListener("keyup", e=>{
    if (e.code === "ArrowLeft") keys.left = false;
    if (e.code === "ArrowRight") keys.right = false;
    if (e.code === "ArrowUp" || e.code==="Space") keys.up = false;
});

// ============ SLIDERS ============
const gravS  = document.getElementById("grav")  as HTMLInputElement;
const tireS  = document.getElementById("tireS") as HTMLInputElement;
const rimS   = document.getElementById("rimS")  as HTMLInputElement;
const spokeS = document.getElementById("spokeS")as HTMLInputElement;
const massS  = document.getElementById("massS") as HTMLInputElement;
const iterS  = document.getElementById("iters") as HTMLInputElement;

function updateSliderLabels(){
    (document.getElementById("gravVal") as HTMLElement).textContent  = gravS.value;
    (document.getElementById("tireVal") as HTMLElement).textContent  = tireS.value;
    (document.getElementById("rimVal")  as HTMLElement).textContent  = rimS.value;
    (document.getElementById("spokeVal")as HTMLElement).textContent  = spokeS.value;
    (document.getElementById("massVal") as HTMLElement).textContent  = massS.value;
    (document.getElementById("iterVal") as HTMLElement).textContent  = iterS.value;
}
updateSliderLabels();

for (const el of [gravS,tireS,rimS,spokeS,massS,iterS]) {
    el.oninput = () => updateSliderLabels();
}

// ============ NEW SIM ============
function initSim(){
    world = new World({
        dt: 1/60,
        gravity: Number(gravS.value),
        iterations: Number(iterS.value),
        damping: DefaultConfig.damping
    });

    tire = new Tire(world, innerWidth/2, 260);

    tire.setStiffness(
        Number(tireS.value)/100,
        Number(rimS.value)/100,
        Number(spokeS.value)/100
    );

    tire.setMassScale(Number(massS.value)/100);
}

// ============ START/STOP ============
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;

startBtn.onclick = () => {
    if (!running){
        initSim();
        running = true;
        startBtn.textContent = "Stop Physics";
        debugLog.log("Simulation started");
    }
    else {
        running = false;
        startBtn.textContent = "Start Physics";
        debugLog.log("Simulation stopped");
    }
};

// ============ JUMP =============
function doJump(){
    if (!running) return;

    let grounded = false;
    for (const p of tire.outer){
        if (p.y > GY - 14) grounded = true;
    }
    if (!grounded) return;

    tire.applyImpulse(0, -18);
}

// ============ DRAW TIRE DEBUG ============
function drawTireDebug(t: Tire){
    if (!showTireDebug) return;

    const hub = t.hub;

    // ---- inner ring ----
    ctx.strokeStyle = "#0ff";
    ctx.beginPath();
    const inner = t.inner;
    ctx.moveTo(inner[0].x, inner[0].y);
    for (let i=1; i<inner.length; i++)
        ctx.lineTo(inner[i].x, inner[i].y);
    ctx.closePath();
    ctx.stroke();

    // ---- spokes ----
    ctx.strokeStyle = "#ff0";
    for (let i=0; i<t.outer.length; i++){
        const a = t.outer[i];
        const b = t.inner[i];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }

    /*
    // ---- hub ----
    ctx.fillStyle = "#f33";
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, 4, 0, Math.PI*2);
    ctx.fill();

    // ---- radial lines ----
    ctx.strokeStyle = "#f0f";
    for (const p of t.outer){
      ctx.beginPath();
      ctx.moveTo(hub.x, hub.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    */

    // ---- velocity vectors ----
    ctx.strokeStyle = "orange";
    for (const p of [...t.outer, ...t.inner]){
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 0.15, p.y + p.vy * 0.15);
        ctx.stroke();
    }

    // ---- text ----
    let grounded = false;
    for (const p of t.outer)
        if (p.y > GY - 14) grounded = true;

    ctx.fillStyle = "#0f0";
    ctx.font = "12px monospace";
    ctx.fillText(`vx=${hub.vx.toFixed(2)} vy=${hub.vy.toFixed(2)}`, 12, 20);
    ctx.fillText(`grounded: ${grounded}`, 12, 36);

    if (t.pressure){
        const A = t.pressure.area().toFixed(2);
        const dA = (Number(A) - t.pressure.restArea).toFixed(2);
        ctx.fillText(`area: ${A}`, 12, 52);
        ctx.fillText(`Δarea: ${dA}`, 12, 68);
    }
}

// ============ DRAW OUTER RING =============
function drawRing(ring){
    ctx.beginPath();
    ctx.moveTo(ring[0].x, ring[0].y);
    for (let i=1;i<ring.length;i++) ctx.lineTo(ring[i].x, ring[i].y);
    ctx.closePath();
    ctx.strokeStyle="#eee";
    ctx.fillStyle="#222";
    ctx.fill();
    ctx.stroke();
}

// ============ MAIN LOOP ============
const GY = 380;

function loop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = "#444";
    ctx.fillRect(0,GY,canvas.width,6);

    if (running){
        if (keys.left)  tire.steer(-40);
        if (keys.right) tire.steer(+40);
        if (keys.up)    doJump();

        tire.inflate();
        tire.collideGround(GY);
        world.step();
    }

    if (running && tire){
        drawRing(tire.outer);
        drawTireDebug(tire);
    }

    debugLog.renderOverlay(ctx);
    requestAnimationFrame(loop);
}
loop();
