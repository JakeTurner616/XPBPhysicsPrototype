// xpbd.ts — corrected for erasableSyntaxOnly

export interface Config {
    dt:number;
    gravity:number;
    iterations:number;
    damping:number;
}

export const DefaultConfig: Config = {
    dt:1/60,
    gravity:1400,
    iterations:18,
    damping:0.9985
};

export class Body {
    x:number = 0;
    y:number = 0;
    ox:number = 0;
    oy:number = 0;
    vx:number = 0;
    vy:number = 0;
    invMass:number = 1;

    constructor(x:number,y:number,m:number){
        this.x=this.ox=x;
        this.y=this.oy=y;
        this.invMass = m>0 ? 1/m : 0;
    }
}

const safe = (n:number)=>Number.isFinite(n)?n:0;

// Distance constraint
export class DistCons {
    a:Body;
    b:Body;
    rest:number;
    stiff:number;

    constructor(a:Body, b:Body, rest:number, stiff:number){
        this.a=a;
        this.b=b;
        this.rest=rest;
        this.stiff=stiff;
    }

    solve(){
        let dx=this.b.x-this.a.x;
        let dy=this.b.y-this.a.y;
        const d=Math.hypot(dx,dy);
        if (d<1e-6) return;

        const C=d-this.rest;
        const w=this.a.invMass+this.b.invMass;
        if (!w) return;

        dx/=d; dy/=d;

        const s=this.stiff*C/w;
        const cx=safe(dx*s), cy=safe(dy*s);

        if (this.a.invMass){ this.a.x+=cx*this.a.invMass; this.a.y+=cy*this.a.invMass; }
        if (this.b.invMass){ this.b.x-=cx*this.b.invMass; this.b.y-=cy*this.b.invMass; }
    }
}

// Pressure constraint
export class PressureCons {
    pts:Body[];
    strength:number;
    restArea:number = 0;
    ready:boolean = false;

    constructor(pts:Body[], strength:number){
        this.pts=pts;
        this.strength=strength;
    }

    area(){
        let sum=0, N=this.pts.length;
        for (let i=0;i<N;i++){
            const a=this.pts[i], b=this.pts[(i+1)%N];
            sum+=a.x*b.y - b.x*a.y;
        }
        return sum*0.5;
    }

    solve(){
        if (!this.ready){
            this.ready=true;
            this.restArea=this.area();
            return;
        }

        const A=this.area();
        const C=(A-this.restArea)*this.strength;
        const N=this.pts.length;

        for (let i=0;i<N;i++){
            const prev=this.pts[(i-1+N)%N];
            const next=this.pts[(i+1)%N];

            const gx=0.5*(next.y-prev.y);
            const gy=0.5*(prev.x-next.x);

            const p=this.pts[i];
            if (!p.invMass) continue;

            p.x -= safe(gx*C*p.invMass);
            p.y -= safe(gy*C*p.invMass);
        }
    }
}

// Soft contact
export class ContactCons {
    a:Body;
    b:Body;
    rest:number;
    stiff:number;

    constructor(a:Body, b:Body, rest:number, stiff=1){
        this.a=a;
        this.b=b;
        this.rest=rest;
        this.stiff=stiff;
    }

    solve(){
        let dx=this.b.x-this.a.x;
        let dy=this.b.y-this.a.y;
        const d=Math.hypot(dx,dy);
        if (d<1e-6) return;

        const C=d-this.rest;
        if (C>=0) return;

        const w=this.a.invMass+this.b.invMass;
        if (!w) return;

        dx/=d; dy/=d;

        const s=(this.stiff*C)/w;

        if (this.a.invMass){ this.a.x+=dx*s*this.a.invMass; this.a.y+=dy*s*this.a.invMass; }
        if (this.b.invMass){ this.b.x-=dx*s*this.b.invMass; this.b.y-=dy*s*this.b.invMass; }
    }
}

// World
export class World {
    bodies:Body[]=[];
    cons:any[]=[];
    tick:number=0;
    cfg:Config;

    constructor(cfg:Config=DefaultConfig){
        this.cfg=cfg;
    }

    addBody(b:Body){ this.bodies.push(b); return b; }
    addConstraint(c:any){ this.cons.push(c); return c; }

    clearFrameContacts(){
        this.cons = this.cons.filter(c => !(c instanceof ContactCons));
    }

    integrate(){
        const {dt,gravity,damping}=this.cfg;
        for (const b of this.bodies){
            b.ox=b.x; b.oy=b.y;

            if (b.invMass){
                b.vy += gravity*dt;
                b.vx *= damping;
                b.vy *= damping;
                b.x  += b.vx*dt;
                b.y  += b.vy*dt;
            }
        }
    }

    post(){
        const dt=this.cfg.dt;
        for (const b of this.bodies){
            b.vx = safe((b.x-b.ox)/dt);
            b.vy = safe((b.y-b.oy)/dt);
        }
    }

    step(){
        this.integrate();
        for (let i=0;i<this.cfg.iterations;i++)
            for (const c of this.cons) c.solve();
        this.post();
        this.tick++;
    }
}
