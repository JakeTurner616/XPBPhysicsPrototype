// src/main.ts
import { World, DefaultConfig } from "./xpbd";
import { Tire } from "./tire";

// ---- DEBUG MODULE IMPORTS ----
import {
    updateFPS,
    drawHUD,
    drawTireDebug,
    drawRing
} from "./debug";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// Resize canvas
function resize(){
    canvas.width = innerWidth;
    canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

let running = false;
let world: World;
let tire: Tire;

// Static cube
const cube = { w:64, h:64, x:0, y:0 };

// INPUT
const keys = { left:false, right:false, up:false };
let showTireDebug = true;

addEventListener("keydown", e=>{
    if (e.code === "ArrowLeft") keys.left = true;
    if (e.code === "ArrowRight") keys.right = true;
    if (e.code === "ArrowUp" || e.code === "Space") keys.up = true;

    if (e.key === "t") showTireDebug = !showTireDebug;
});
addEventListener("keyup", e=>{
    if (e.code === "ArrowLeft") keys.left = false;
    if (e.code === "ArrowRight") keys.right = false;
    if (e.code === "ArrowUp" || e.code === "Space") keys.up = false;
});

// SLIDERS
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
for (const el of [gravS,tireS,rimS,spokeS,massS,iterS])
    el.oninput = () => updateSliderLabels();

const GY = 380;

// Ground test
function tireIsGrounded(tire: Tire) {
    const groundPad = 12;
    const topOfGround = GY - groundPad;
    const R = 10;

    for (const p of tire.outer) {
        if (p.y >= topOfGround - 0.1) return true;

        const left = cube.x;
        const right = cube.x + cube.w;
        const top = cube.y;

        if (p.x >= left && p.x <= right && p.y >= top - R && p.y <= top + 2)
            return true;
    }
    return false;
}

// Start world
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

    cube.x = innerWidth * 0.75;
    cube.y = GY - cube.h;
}

const startBtn = document.getElementById("startBtn") as HTMLButtonElement;

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

function doJump(){
    if (!running) return;
    if (!tireIsGrounded(tire)) return;
    tire.applyImpulse(0, -120);
}

// Cube collision
function collideTireWithCube(tire: Tire) {
    const x1 = cube.x, y1 = cube.y;
    const x2 = x1 + cube.w, y2 = y1 + cube.h;
    const R = 10;

    for (const p of [...tire.outer, ...tire.inner]) {

        if (p.x < x1 - R || p.x > x2 + R || p.y < y1 - R || p.y > y2 + R)
            continue;

        const dl = p.x - x1;
        const dr = x2 - p.x;
        const dt = p.y - y1;
        const db = y2 - p.y;

        const min = Math.min(dl, dr, dt, db);

        if (min === dt) {
            const lim = y1 - R;
            if (p.y > lim){ const pen = p.y - lim; p.y -= pen; if (p.vy > 0) p.vy = 0; }
        }
        else if (min === db) {
            const lim = y2 + R;
            if (p.y < lim){ const pen = lim - p.y; p.y += pen; if (p.vy < 0) p.vy = 0; }
        }
        else if (min === dl) {
            const lim = x1 - R;
            if (p.x > lim){ const pen = p.x - lim; p.x -= pen; if (p.vx > 0) p.vx = 0; }
        }
        else {
            const lim = x2 + R;
            if (p.x < lim){ const pen = lim - p.x; p.x += pen; if (p.vx < 0) p.vx = 0; }
        }
    }
}

// MAIN LOOP
function loop(t=0){
    updateFPS(t);

    ctx.clearRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = "#444";
    ctx.fillRect(0, GY, canvas.width, 6);

    ctx.fillStyle="#888";
    ctx.fillRect(cube.x, cube.y, cube.w, cube.h);
    ctx.strokeStyle="#fff";
    ctx.strokeRect(cube.x, cube.y, cube.w, cube.h);

    if (running){
        if (keys.left)  tire.steer(-40);
        if (keys.right) tire.steer(+40);
        if (keys.up)    doJump();

        tire.inflate();
        tire.collideGround(GY);
        collideTireWithCube(tire);

        world.step();
    }

    if (running){
        drawRing(ctx, tire.outer);
        if (showTireDebug) drawTireDebug(ctx, tire);
        drawHUD(ctx, world, tire);
    }

    requestAnimationFrame(loop);
}
loop();
