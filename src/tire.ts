import { World, Body, DistCons, PressureCons } from "./xpbd";
import { debugLog } from "./debug";

export class Tire {
    outer: Body[] = [];
    inner: Body[] = [];
    hub: Body;

    pressure: PressureCons;

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

        // outer
        for (let i=0;i<N;i++)
            this.world.addConstraint(
                new DistCons(this.outer[i], this.outer[(i+1)%N],
                this.dist(this.outer[i], this.outer[(i+1)%N]), 0.22)
            );

        // inner
        for (let i=0;i<N;i++)
            this.world.addConstraint(
                new DistCons(this.inner[i], this.inner[(i+1)%N],
                this.dist(this.inner[i], this.inner[(i+1)%N]), 0.28)
            );

        // spokes
        for (let i=0;i<N;i++)
            this.world.addConstraint(
                new DistCons(this.inner[i], this.outer[i],
                this.dist(this.inner[i], this.outer[i]), 0.35)
            );

        this.pressure = new PressureCons(this.outer, 0.00045);
        this.world.addConstraint(this.pressure);
    }

    dist(a:Body,b:Body){ return Math.hypot(a.x-b.x,a.y-b.y); }

    applyTorque(t:number){
        const hx=this.hub.x, hy=this.hub.y;
        for(const p of this.outer){
            let rx = p.x - hx;
            let ry = p.y - hy;
            const L = Math.hypot(rx,ry) || 1;
            rx/=L; ry/=L;

            p.vx += -ry * t;
            p.vy +=  rx * t;
        }
    }

    applyImpulse(ix:number,iy:number){
        for(const p of [...this.inner,...this.outer]){
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
