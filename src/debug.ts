// src/debug.ts
import { Tire } from "./tire";

// -------------------------------------
// FPS Calculation
// -------------------------------------
let lastTime = performance.now();
let fps = 60;

export function updateFPS(now: number) {
    const dt = now - lastTime;
    lastTime = now;
    fps = 1000 / dt;
    return fps;
}

// -------------------------------------
// HUD
// -------------------------------------
export function drawHUD(ctx: CanvasRenderingContext2D, world: any, tire: Tire) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(10, 10, 210, 120);

    ctx.fillStyle = "#0f0";
    ctx.font = "14px monospace";

    const vx = tire.hub.vx.toFixed(2);
    const vy = tire.hub.vy.toFixed(2);

    ctx.fillText(`FPS: ${Math.round(fps)}`, 20, 32);
    ctx.fillText(`Tick: ${world.tick}`, 20, 52);
    ctx.fillText(`Hub Vel: ${vx}, ${vy}`, 20, 72);
    ctx.fillText(`OuterPts: ${tire.outer.length}`, 20, 92);
}

// -------------------------------------
// Outer Ring Drawing
// -------------------------------------
export function drawRing(ctx: CanvasRenderingContext2D, ring: any[]) {
    ctx.beginPath();
    ctx.moveTo(ring[0].x, ring[0].y);
    for (let i = 1; i < ring.length; i++)
        ctx.lineTo(ring[i].x, ring[i].y);

    ctx.closePath();
    ctx.strokeStyle = "#eee";
    ctx.fillStyle = "#222";
    ctx.fill();
    ctx.stroke();
}

// -------------------------------------
// Tire Debug Lines
// -------------------------------------
export function drawTireDebug(ctx: CanvasRenderingContext2D, tire: Tire) {

    // Inner ring
    ctx.strokeStyle = "#0ff";
    ctx.beginPath();
    ctx.moveTo(tire.inner[0].x, tire.inner[0].y);
    for (let i = 1; i < tire.inner.length; i++)
        ctx.lineTo(tire.inner[i].x, tire.inner[i].y);
    ctx.closePath();
    ctx.stroke();

    // Spokes
    ctx.strokeStyle = "#ff0";
    for (let i = 0; i < tire.outer.length; i++) {
        const a = tire.outer[i];
        const b = tire.inner[i];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }

    // Velocity vectors
    ctx.strokeStyle = "orange";
    for (const p of [...tire.outer, ...tire.inner]) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 0.15, p.y + p.vy * 0.15);
        ctx.stroke();
    }
}

// -------------------------------------
// Collision Ring Outline
// -------------------------------------
export function drawCollisionDebug(
    ctx: CanvasRenderingContext2D,
    tire: Tire
){
    ctx.strokeStyle = "rgba(255,0,0,0.5)";
    ctx.beginPath();
    for (let i=0; i<tire.outer.length; i++) {
        const a = tire.outer[i];
        const b = tire.outer[(i+1)%tire.outer.length];
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
}
