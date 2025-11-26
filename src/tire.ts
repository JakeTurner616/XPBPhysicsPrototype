// src/tire.ts
import { World, Body, DistCons, PressureCons } from "./xpbd";
import { debugLog } from "./debug";

export class Tire {
    outer: Body[] = [];
    inner: Body[] = [];
    hub: Body;
    pressure: PressureCons;

    airPressure = 0.002;
    steerStrength = 0.07;

    // NEW: we store our constraints so we can edit stiffness live
    outerCons: DistCons[] = [];
    innerCons: DistCons[] = [];
    spokeCons: DistCons[] = [];

    constructor(
        public world: World,
        cx: number,
        cy: number,
        count = 28,
        rO = 50,
        rI = 28
    ){
        this.hub = world.addBody(new Body(cx,cy,5));

        for (let i=0; i<count; i++){
            const a = (i/count)*Math.PI*2;
            const ox = cx + Math.cos(a)*rO;
            const oy = cy + Math.sin(a)*rO;
            const ix = cx + Math.cos(a)*rI;
            const iy = cy + Math.sin(a)*rI;

            this.outer.push(world.addBody(new Body(ox,oy,1)));
            this.inner.push(world.addBody(new Body(ix,iy,1.4)));
        }

        this.build();
    }

    build(){
        const N = this.outer.length;

        // ========== OUTER RING ==========
        for (let i=0;i<N;i++){
            const c = new DistCons(
                this.outer[i], this.outer[(i+1)%N],
                this.dist(this.outer[i], this.outer[(i+1)%N]),
                0.22
            );
            this.outerCons.push(c);
            this.world.addConstraint(c);
        }

        // ========== INNER RING ==========
        for (let i=0;i<N;i++){
            const c = new DistCons(
                this.inner[i], this.inner[(i+1)%N],
                this.dist(this.inner[i], this.inner[(i+1)%N]),
                0.28
            );
            this.innerCons.push(c);
            this.world.addConstraint(c);
        }

        // ========== SPOKES ==========
        for (let i=0;i<N;i++){
            const c = new DistCons(
                this.inner[i], this.outer[i],
                this.dist(this.inner[i], this.outer[i]),
                0.35
            );
            this.spokeCons.push(c);
            this.world.addConstraint(c);
        }

        // ========== PRESSURE ==========
        this.pressure = new PressureCons(this.outer, 0.00045);
        this.world.addConstraint(this.pressure);
    }

    dist(a:Body,b:Body){ return Math.hypot(a.x-b.x,a.y-b.y); }

    // =====================================================
    //  NEW API — Called by the UI sliders inside main.ts
    // =====================================================
    setStiffness(tire: number, rim: number, spoke: number){
        for (const c of this.outerCons) c.stiff = tire;
        for (const c of this.innerCons) c.stiff = rim;
        for (const c of this.spokeCons) c.stiff = spoke;
    }

    setMassScale(scale: number){
        for (const p of this.outer) p.invMass = 1/(1 * scale);
        for (const p of this.inner) p.invMass = 1/(1.4 * scale);
        // hub mass unchanged intentionally
    }

    // =====================================================
    //  Steering (smooth + XPBD-friendly)
    // =====================================================
    steer(dir: number) {
        if (!dir) return;

        const hx = this.hub.x, hy = this.hub.y;

        for (const p of this.outer) {
            let rx = p.x - hx;
            let ry = p.y - hy;
            const L = Math.hypot(rx, ry) || 1;
            rx/=L; ry/=L;

            const tx = -ry;
            const ty = rx;

            p.vx += tx * (this.steerStrength * dir);
            p.vy += ty * (this.steerStrength * dir);
        }
    }

    // =====================================================
    //  Inflate (radial spring to prevent collapse)
    // =====================================================
    inflate() {
        const hx = this.hub.x, hy = this.hub.y;

        for (const p of this.outer) {
            let rx = p.x - hx;
            let ry = p.y - hy;
            const L = Math.hypot(rx, ry) || 0.0001;

            const nx = rx/L;
            const ny = ry/L;

            p.vx += nx * this.airPressure;
            p.vy += ny * this.airPressure;
        }
    }

    // =====================================================
    applyImpulse(ix:number,iy:number){
        for(const p of [...this.outer,...this.inner]){
            p.vx += ix;
            p.vy += iy;
        }
    }

    collideGround(GY:number){
        const pad = 12;
        for (const p of [...this.inner,...this.outer]){
            const lim = GY - pad;
            if (p.y > lim){
                const pen = p.y - lim;
                p.y -= pen;
                if (p.vy > 0) p.vy = 0;
            }
        }
    }
}
