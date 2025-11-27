// main.ts
import {
    World,
    DefaultConfig,
    ContactCons
} from "./xpbd";
import { Tire } from "./tire";
import {
    updateFPS,
    drawHUD,
    drawRing,
    drawTireDebug,
    drawCollisionDebug
} from "./debug";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const startBtn = document.getElementById("startBtn") as HTMLButtonElement;

// Resize canvas
function resize(){
    canvas.width = innerWidth;
    canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

let running = false;
let world: World;

let player: Tire;
const tires: Tire[] = [];

// Static cube
const cube = { w:64, h:64, x:0, y:0 };

// INPUT STATE
const keys = { left:false, right:false, up:false };
let showTireDebug = false;

document.addEventListener("keydown", e=>{
    if (e.code === "ArrowLeft")  keys.left = true;
    if (e.code === "ArrowRight") keys.right = true;
    if (e.code === "ArrowUp" || e.code==="Space") keys.up = true;

    if (e.key === "t") showTireDebug = !showTireDebug;
});

document.addEventListener("keyup", e=>{
    if (e.code === "ArrowLeft")  keys.left = false;
    if (e.code === "ArrowRight") keys.right = false;
    if (e.code === "ArrowUp" || e.code==="Space") keys.up = false;
});

// SLIDERS
const gravS  = document.getElementById("grav")  as HTMLInputElement;
const tireS  = document.getElementById("tireS") as HTMLInputElement;
const rimS   = document.getElementById("rimS")  as HTMLInputElement;
const spokeS = document.getElementById("spokeS")as HTMLInputElement;
const massS  = document.getElementById("massS") as HTMLInputElement;
const iterS  = document.getElementById("iters") as HTMLInputElement;

function updateSliderLabels(){
    (document.getElementById("gravVal")  as HTMLElement).textContent = gravS.value;
    (document.getElementById("tireVal")  as HTMLElement).textContent = tireS.value;
    (document.getElementById("rimVal")   as HTMLElement).textContent = rimS.value;
    (document.getElementById("spokeVal") as HTMLElement).textContent = spokeS.value;
    (document.getElementById("massVal")  as HTMLElement).textContent = massS.value;
    (document.getElementById("iterVal")  as HTMLElement).textContent = iterS.value;
}
updateSliderLabels();
[gravS,tireS,rimS,spokeS,massS,iterS].forEach(el => el.oninput = updateSliderLabels);

canvas.addEventListener("mousedown", e=>{
    if (!running) return;

    const t = new Tire(world, e.clientX, e.clientY, 28, 50, 28);
    t.setStiffness(
        Number(tireS.value)/100,
        Number(rimS.value)/100,
        Number(spokeS.value)/100
    );
    t.setMassScale(Number(massS.value)/100);
    tires.push(t);
});

// Ground line
const GY = 380;

// ===========================================================
// EXACT GROUNDED CHECK — ZERO MARGINS
// ===========================================================
function isGrounded(t:Tire){
    for (const p of t.outer){

        // direct ground
        if (p.y >= GY - 0.1)
            return true;

        // cube top
        if (p.x >= cube.x && p.x <= cube.x + cube.w){
            if (p.y >= cube.y - 0.1)
                return true;
        }
    }
    return false;
}

function doJump(){
    if (isGrounded(player))
        player.applyImpulse(0, -20);
}

// ===========================================================
// HARD GROUND COLLISION — NO PADDING
// ===========================================================
function collideGround(t:Tire){
    const lim = GY;

    for (const p of [...t.outer, ...t.inner]){
        if (p.y > lim){
            const pen = p.y - lim;
            p.y -= pen;
            if (p.vy > 0) p.vy = 0;
        }
    }
}

// ===========================================================
// HARD CUBE COLLISION — ZERO EXTRA RADIUS
// ===========================================================
function collideCube(t:Tire){
    const x1 = cube.x,     y1 = cube.y;
    const x2 = x1 + cube.w, y2 = y1 + cube.h;

    for (const p of [...t.outer, ...t.inner]){

        // Fast reject — exact AABB
        if (p.x < x1 || p.x > x2 || p.y < y1 || p.y > y2)
            continue;

        const dl = p.x - x1;
        const dr = x2 - p.x;
        const dt = p.y - y1;
        const db = y2 - p.y;

        const min = Math.min(dl, dr, dt, db);

        if (min === dt){
            const lim = y1;
            const pen = p.y - lim;
            if (pen > 0){ p.y -= pen; if (p.vy > 0) p.vy = 0; }
        }
        else if (min === db){
            const lim = y2;
            const pen = lim - p.y;
            if (pen > 0){ p.y += pen; if (p.vy < 0) p.vy = 0; }
        }
        else if (min === dl){
            const lim = x1;
            const pen = p.x - lim;
            if (pen > 0){ p.x -= pen; if (p.vx > 0) p.vx = 0; }
        }
        else {
            const lim = x2;
            const pen = lim - p.x;
            if (pen > 0){ p.x += pen; if (p.vx < 0) p.vx = 0; }
        }
    }
}

// ===========================================================
// SOFT–SOFT CONTACTS (r = 4-7 works but can create a weird margin)
// zero radius between particles would collapse the tire
// ===========================================================
function buildSoftContacts(){
    const all = [player, ...tires];
    const radius = 5;
    const stiff = 0.2; // how much force to resist via interpenetration, high values can cause jitter

    for (let i=0;i<all.length;i++){
        const A = all[i];
        for (let j=i+1;j<all.length;j++){
            const B = all[j];
            for (const pA of A.outer){
                for (const pB of B.outer){
                    const dx = pB.x - pA.x;
                    const dy = pB.y - pA.y;
                    const d  = Math.hypot(dx,dy);

                    if (d < radius*2){
                        world.addConstraint(new ContactCons(pA, pB, radius*2, stiff));
                    }
                }
            }
        }
    }
}

// ===========================================================
// INIT
// ===========================================================
function initSim(){
    world = new World({
        dt: 1/60,
        gravity: Number(gravS.value),
        iterations: Number(iterS.value),
        damping: DefaultConfig.damping
    });

    tires.length = 0;

    player = new Tire(world, innerWidth/2, 260);
    player.setStiffness(
        Number(tireS.value)/100,
        Number(rimS.value)/100,
        Number(spokeS.value)/100
    );
    player.setMassScale(Number(massS.value)/100);

    cube.x = innerWidth * 0.75;
    cube.y = GY - cube.h;
}

startBtn.onclick = () => {
    if (!running){
        initSim();
        running = true;
        startBtn.textContent = "Stop Physics";
    } else {
        running = false;
        startBtn.textContent = "Start Physics";
    }
};

// ===========================================================
// MAIN LOOP
// ===========================================================
function loop(t=0){
    updateFPS(t);
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Draw ground
    ctx.fillStyle="#444";
    ctx.fillRect(0,GY,canvas.width,6);

if (running) {
    // Draw ground
    ctx.fillStyle="#444";
    ctx.fillRect(0,GY,canvas.width,6);

    // Draw cube
    ctx.fillStyle="#888";
    ctx.fillRect(cube.x,cube.y,cube.w,cube.h);
    ctx.strokeRect(cube.x,cube.y,cube.w,cube.h);
}

    if (running){

        if (keys.left)  player.steer(-40);
        if (keys.right) player.steer(40);
        if (keys.up)    doJump();

        for (const t of [player, ...tires]){
            t.inflate();
            collideGround(t);
            collideCube(t);
        }

       
        buildSoftContacts();

        world.step();
        {
    const MAX_VX = 250; // <-- tuneable to cap the max vx

    for (const p of player.outer) {
        if (p.vx >  MAX_VX) p.vx =  MAX_VX;
        if (p.vx < -MAX_VX) p.vx = -MAX_VX;
    }
    for (const p of player.inner) {
        if (p.vx >  MAX_VX) p.vx =  MAX_VX;
        if (p.vx < -MAX_VX) p.vx = -MAX_VX;
    }
}
    }

    if (running){
        drawRing(ctx, player.outer);
        if (showTireDebug) drawTireDebug(ctx, player);

        for (const t of tires){
            drawRing(ctx, t.outer);
            if (showTireDebug){
                drawTireDebug(ctx, t);
                drawCollisionDebug(ctx, t);
            }
        }

        drawHUD(ctx, world, player);
    }

    requestAnimationFrame(loop);
}
loop();
