// xpbd.ts — Stable + NaN-Safe XPBD

export interface Config {
    dt: number;
    gravity: number;
    iterations: number;
    damping: number;
}

export const DefaultConfig: Config = {
    dt: 1/60,
    gravity: 900,
    iterations: 18,
    damping: 0.985,
};

export class Body {
    x=0; y=0;
    ox=0; oy=0;
    vx=0; vy=0;
    invMass=1;

    constructor(x:number,y:number,m:number){
        this.x=this.ox=x;
        this.y=this.oy=y;
        this.invMass = m > 0 ? 1/m : 0;
    }
}

function safe(n:number){ return Number.isFinite(n)?n:0; }

export interface Constraint { solve(): void; }

// --------------------------------------------
// Distance Constraint
// --------------------------------------------
export class DistCons implements Constraint {
    constructor(
        public a: Body,
        public b: Body,
        public rest: number,
        public stiff: number
    ) {}

    solve() {
        let dx = this.b.x - this.a.x;
        let dy = this.b.y - this.a.y;
        let d = Math.hypot(dx, dy);
        if (d < 1e-6 || !Number.isFinite(d)) return;

        const C = (d - this.rest);
        const w = this.a.invMass + this.b.invMass;
        if (!w) return;

        const s = this.stiff * C / w;

        dx /= d; dy /= d;

        const cx = safe(dx * s);
        const cy = safe(dy * s);

        if (this.a.invMass){
            this.a.x += cx * this.a.invMass;
            this.a.y += cy * this.a.invMass;
        }
        if (this.b.invMass){
            this.b.x -= cx * this.b.invMass;
            this.b.y -= cy * this.b.invMass;
        }
    }
}

// --------------------------------------------
// Pressure Constraint
// --------------------------------------------
export class PressureCons implements Constraint {
    restArea = 0;
    ready = false;

    constructor(
        public pts: Body[],
        public strength: number
    ) {}

    area() {
        let pts=this.pts, sum=0;
        for (let i=0;i<pts.length;i++){
            const a=pts[i], b=pts[(i+1)%pts.length];
            sum += a.x*b.y - b.x*a.y;
        }
        return sum*0.5;
    }

    solve() {
        if (!this.ready) {
            this.ready = true;
            this.restArea = this.area();
            return;
        }

        const A = this.area();
        if (!Number.isFinite(A)) return;

        const C = (A - this.restArea) * this.strength;
        const pts = this.pts;
        const N = pts.length;

        for (let i=0;i<N;i++){
            const prev = pts[(i-1+N)%N];
            const next = pts[(i+1)%N];

            let gx = 0.5*(next.y - prev.y);
            let gy = 0.5*(prev.x - next.x);

            const b = pts[i];
            if (!b.invMass) continue;

            const dx = safe(gx * C * b.invMass);
            const dy = safe(gy * C * b.invMass);

            b.x -= dx;
            b.y -= dy;
        }
    }
}

// --------------------------------------------
// World
// --------------------------------------------
export class World {
    bodies: Body[] = [];
    cons: Constraint[] = [];
    tick = 0;

    constructor(public cfg = DefaultConfig){}

    addBody(b:Body){ this.bodies.push(b); return b; }
    addConstraint(c:Constraint){ this.cons.push(c); return c; }

    integrate() {
        const {dt, gravity, damping}=this.cfg;

        for (const b of this.bodies){
            b.ox=b.x; b.oy=b.y;

            if (b.invMass){
                b.vy += gravity*dt;
                b.vx *= damping;
                b.vy *= damping;

                b.x += b.vx * dt;
                b.y += b.vy * dt;
            }
        }
    }

    post() {
        const dt=this.cfg.dt;
        for (const b of this.bodies){
            b.vx = safe((b.x - b.ox)/dt);
            b.vy = safe((b.y - b.oy)/dt);
        }
    }

    step() {
        this.integrate();

        for (let i=0;i<this.cfg.iterations;i++)
            for (const c of this.cons)
                c.solve();

        this.post();
        this.tick++;
    }
}

// --------------------------------------------
// PERFECT NON-JITTER AABB CONTACT
// --------------------------------------------
export class AABBContact implements Constraint {

    constructor(
        public p: Body,
        public box: {x:number,y:number,w:number,h:number},
        public radius: number
    ) {}

    solve() {
        const p = this.p;
        if (!p.invMass) return;

        const x1 = this.box.x;
        const y1 = this.box.y;
        const x2 = x1 + this.box.w;
        const y2 = y1 + this.box.h;

        const px = p.x;
        const py = p.y;

        // Expanded AABB early-out
        if (px < x1 - this.radius ||
            px > x2 + this.radius ||
            py < y1 - this.radius ||
            py > y2 + this.radius) {
            return;
        }

        // Distances
        const dl = px - x1;
        const dr = x2 - px;
        const dt = py - y1;
        const db = y2 - py;

        let nx = 0, ny = 0;
        let pen = 0;

        const min = Math.min(dl, dr, dt, db);

        if (min === dl){
            nx = -1; ny = 0;
            pen = this.radius - dl;
        }
        else if (min === dr){
            nx = 1; ny = 0;
            pen = this.radius - dr;
        }
        else if (min === dt){
            nx = 0; ny = -1;
            pen = this.radius - dt;
        }
        else {
            nx = 0; ny = 1;
            pen = this.radius - db;
        }

        if (pen > 0){
            p.x += nx * pen;
            p.y += ny * pen;
        }
    }
}
