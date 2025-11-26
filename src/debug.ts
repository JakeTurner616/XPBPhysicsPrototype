// debug.ts — Real Physics Debugger with Rolling Log and On-Screen Overlay

export class DebugLog {
    private lines: string[] = [];
    private last = "";
    private lastCount = 1;
    private readonly MAX = 200;
    overlayEnabled = false;

    log(msg: string) {
        if (msg === this.last) {
            this.lastCount++;
            this.lines[this.lines.length - 1] =
                `${msg}  x${this.lastCount}`;
            return;
        }
        this.last = msg;
        this.lastCount = 1;

        this.lines.push(msg);
        if (this.lines.length > this.MAX)
            this.lines.shift();
    }

    export() {
        return this.lines.join("\n");
    }

    renderOverlay(ctx: CanvasRenderingContext2D) {
        if (!this.overlayEnabled) return;

        ctx.save();
        ctx.font = "12px monospace";
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(10, 10, 320, 160);
        ctx.fillStyle = "#0f0";

        const slice = this.lines.slice(-10);
        for (let i = 0; i < slice.length; i++)
            ctx.fillText(slice[i], 18, 28 + i * 14);

        ctx.restore();
    }
}

export const debugLog = new DebugLog();
