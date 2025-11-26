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

const keys = { left:false, right:false, up:false };

addEventListener("keydown", e=>{
    if (e.code === "ArrowLeft") keys.left = true;
    if (e.code === "ArrowRight") keys.right = true;
    if (e.code === "ArrowUp" || e.code==="Space") keys.up = true;
});
addEventListener("keyup", e=>{
    if (e.code === "ArrowLeft") keys.left = false;
    if (e.code === "ArrowRight") keys.right = false;
    if (e.code === "ArrowUp" || e.code==="Space") keys.up = false;
});

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

// ----------------------
// CREATE a NEW sim state
// ----------------------
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

// ----------------------
// START / STOP BUTTON
// ----------------------
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

// ----------------------
// LITTLE JUMP
// ----------------------
function doJump(){
    if (!running) return;

    // grounded check
    let grounded = false;
    for (const p of tire.outer){
        if (p.y > 380 - 14) grounded = true;
    }
    if (!grounded) return;

    tire.applyImpulse(0, -18);
}

// ----------------------
// DRAW RING
// ----------------------
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

// ----------------------
// MAIN LOOP
// ----------------------
const GY = 380;

function loop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // ground
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

    if (running && tire) drawRing(tire.outer);

    debugLog.renderOverlay(ctx);
    requestAnimationFrame(loop);
}
loop();
