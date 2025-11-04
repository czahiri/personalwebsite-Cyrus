class DinoGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.w = canvas.width; this.h = canvas.height;
        this.groundY = this.h - 40;
        this.reset();
        this.bind();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    reset() {
        this.dino = { x: 60, y: this.groundY - 32, w: 40, h: 32, vy: 0, onGround: true };
        this.gravity = 0.9;
        this.jumpStrength = -15;
        this.obstacles = [];
        this.spawnTimer = 0;
        this.spawnEvery = 1200; // ms
        this.speed = 7;
        this.score = 0;
        this.gameOver = false;
        this.last = performance.now();
    }

    bind() {
        document.addEventListener('keydown', (e) => {
            if ((e.key === ' ' || e.key === 'ArrowUp') && this.dino.onGround && !this.gameOver) {
                this.dino.vy = this.jumpStrength;
                this.dino.onGround = false;
            }
            if ((e.key === 'r' || e.key === 'R') && this.gameOver) this.reset();
        });
    }

    spawnObstacle() {
        const w = 18 + Math.random() * 16;
        const h = 24 + Math.random() * 20;
        this.obstacles.push({ x: this.w + 20, y: this.groundY - h, w, h });
    }

    update(dt) {
        if (this.gameOver) return;
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnEvery) {
            this.spawnTimer = 0; this.spawnObstacle();
            // Slightly ramp difficulty
            if (this.spawnEvery > 700) this.spawnEvery -= 20;
            if (this.speed < 11) this.speed += 0.05;
        }

        // Dino physics
        this.dino.vy += this.gravity;
        this.dino.y += this.dino.vy;
        if (this.dino.y + this.dino.h >= this.groundY) {
            this.dino.y = this.groundY - this.dino.h;
            this.dino.vy = 0;
            this.dino.onGround = true;
        }

        // Move obstacles
        for (const obs of this.obstacles) obs.x -= this.speed;
        this.obstacles = this.obstacles.filter(o => o.x + o.w > -10);

        // Score
        this.score += dt * 0.01;

        // Collision
        for (const o of this.obstacles) {
            if (this.collide(this.dino, o)) { this.gameOver = true; break; }
        }
    }

    collide(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0,0,this.w,this.h);
        ctx.fillStyle = '#0b0b0c';
        ctx.fillRect(0,0,this.w,this.h);

        // Ground line
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(0, this.groundY + 0.5); ctx.lineTo(this.w, this.groundY + 0.5); ctx.stroke();

        // Dino
        ctx.fillStyle = '#64d2ff';
        ctx.fillRect(this.dino.x, this.dino.y, this.dino.w, this.dino.h);

        // Obstacles
        ctx.fillStyle = '#ff9f0a';
        for (const o of this.obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);

        // HUD
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '18px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`Score: ${Math.floor(this.score)}`, this.w - 16, 26);
        if (this.gameOver) {
            ctx.textAlign = 'center';
            ctx.fillText('Game Over — Press R to Restart', this.w/2, this.h/2);
        }
    }

    loop(now) {
        const dt = now - this.last; this.last = now;
        this.update(dt);
        this.draw();
        requestAnimationFrame(this.loop);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('dino');
    if (canvas) new DinoGame(canvas);
});


