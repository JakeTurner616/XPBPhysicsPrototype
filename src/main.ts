import { World, DefaultConfig } from "./xpbd";
import { Tire } from "./tire";
import { debugLog } from "./debug";

const canvas=document.getElementById("game") as HTMLCanvasElement;
const ctx=canvas.getContext("2d")!;

function resize(){ canvas.width=innerWidth; canvas.height=innerHeight; }
resize(); addEventListener("resize",resize);

// toggle debug overlay
addEventListener("keydown",e=>{
    if(e.key==="d") debugLog.overlayEnabled = !debugLog.overlayEnabled;
});

// export log
addEventListener("keydown",e=>{
    if(e.key==="p"){
        const blob=new Blob([debugLog.export()],{type:"text/plain"});
        const a=document.createElement("a");
        a.href=URL.createObjectURL(blob);
        a.download="debug_log.txt";
        a.click();
    }
});

const world = new World(DefaultConfig);
debugLog.log("World initialized");

const tire=new Tire(world, innerWidth/2, 260);
debugLog.log("Tire initialized");

const keys={left:false,right:false,up:false,down:false};

addEventListener("keydown",e=>{
    if(e.code==="ArrowLeft") keys.left=true;
    if(e.code==="ArrowRight") keys.right=true;
    if(e.code==="ArrowUp") keys.up=true;
    if(e.code==="ArrowDown") keys.down=true;
});

addEventListener("keyup",e=>{
    if(e.code==="ArrowLeft") keys.left=false;
    if(e.code==="ArrowRight") keys.right=false;
    if(e.code==="ArrowUp") keys.up=false;
    if(e.code==="ArrowDown") keys.down=false;
});

const GY = 380;

function drawRing(ring){
    ctx.beginPath();
    ctx.moveTo(ring[0].x,ring[0].y);
    for(let i=1;i<ring.length;i++) ctx.lineTo(ring[i].x,ring[i].y);
    ctx.closePath();
    ctx.strokeStyle="#eee";
    ctx.fillStyle="#222";
    ctx.fill();
    ctx.stroke();
}

function loop(){
    const hub=tire.hub;

    debugLog.log(
        `F=${world.tick} Hub=(${hub.x.toFixed(1)},${hub.y.toFixed(1)}) `
        + `V=(${hub.vx.toFixed(2)},${hub.vy.toFixed(2)})`
    );

    if (keys.right) tire.applyTorque(0.8);
    if (keys.left)  tire.applyTorque(-0.8);
    if (keys.up)    tire.applyImpulse(0,-1.0);
    if (keys.down)  tire.applyImpulse(0,+1.0);

    tire.collideGround(GY);

    world.step();

    // Render
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#444";
    ctx.fillRect(0,GY,canvas.width,6);

    drawRing(tire.outer);

    debugLog.renderOverlay(ctx);

    requestAnimationFrame(loop);
}
loop();
