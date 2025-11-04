class PongGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.ball = { x: this.width/2, y: this.height/2, vx: 5, vy: 3, r: 8 };
        this.paddleH = 80;
        this.paddleW = 10;
        this.player = { x: 24, y: this.height/2 - this.paddleH/2, speed: 6, score: 0 };
        this.ai = { x: this.width - 24 - this.paddleW, y: this.height/2 - this.paddleH/2, speed: 5.2, score: 0 };

        this.keys = new Set();
        document.addEventListener('keydown', e => this.keys.add(e.key));
        document.addEventListener('keyup', e => this.keys.delete(e.key));

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    resetBall(toLeft = false) {
        this.ball.x = this.width/2;
        this.ball.y = this.height/2;
        const speed = 6;
        const angle = (Math.random() * 0.6 - 0.3) * Math.PI; // small random angle
        const dir = toLeft ? -1 : 1;
        this.ball.vx = dir * speed * Math.cos(angle);
        this.ball.vy = speed * Math.sin(angle);
    }

    update() {
        // Player input
        if (this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has('W')) this.player.y -= this.player.speed;
        if (this.keys.has('ArrowDown') || this.keys.has('s') || this.keys.has('S')) this.player.y += this.player.speed;
        this.player.y = Math.max(0, Math.min(this.height - this.paddleH, this.player.y));

        // AI follows ball with slight smoothing
        const targetY = this.ball.y - this.paddleH/2;
        this.ai.y += (targetY - this.ai.y) * 0.08;
        this.ai.y = Math.max(0, Math.min(this.height - this.paddleH, this.ai.y));

        // Move ball
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // Collide top/bottom
        if (this.ball.y - this.ball.r < 0 || this.ball.y + this.ball.r > this.height) {
            this.ball.vy *= -1;
        }

        // Collide paddles
        // Player
        if (this.ball.x - this.ball.r < this.player.x + this.paddleW &&
            this.ball.y > this.player.y && this.ball.y < this.player.y + this.paddleH) {
            this.ball.vx = Math.abs(this.ball.vx) * 1.03; // reflect to right, speed up
            const hitPos = (this.ball.y - (this.player.y + this.paddleH/2)) / (this.paddleH/2);
            this.ball.vy = hitPos * 5;
            this.ball.x = this.player.x + this.paddleW + this.ball.r;
        }
        // AI
        if (this.ball.x + this.ball.r > this.ai.x &&
            this.ball.y > this.ai.y && this.ball.y < this.ai.y + this.paddleH) {
            this.ball.vx = -Math.abs(this.ball.vx) * 1.03; // reflect to left, speed up
            const hitPos = (this.ball.y - (this.ai.y + this.paddleH/2)) / (this.paddleH/2);
            this.ball.vy = hitPos * 5;
            this.ball.x = this.ai.x - this.ball.r;
        }

        // Scoring
        if (this.ball.x < -20) { this.ai.score++; this.resetBall(false); }
        if (this.ball.x > this.width + 20) { this.player.score++; this.resetBall(true); }

        // Restart key
        if (this.keys.has('r') || this.keys.has('R')) {
            this.player.score = 0; this.ai.score = 0; this.resetBall();
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0,0,this.width,this.height);

        // Background
        ctx.fillStyle = '#0b0b0c';
        ctx.fillRect(0,0,this.width,this.height);
        // Center line
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.setLineDash([6, 12]);
        ctx.beginPath();
        ctx.moveTo(this.width/2, 0); ctx.lineTo(this.width/2, this.height); ctx.stroke();
        ctx.setLineDash([]);

        // Paddles
        ctx.fillStyle = '#f5f5f7';
        ctx.fillRect(this.player.x, this.player.y, this.paddleW, this.paddleH);
        ctx.fillRect(this.ai.x, this.ai.y, this.paddleW, this.paddleH);

        // Ball
        ctx.fillStyle = '#0a84ff';
        ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI*2); ctx.fill();

        // Score
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '20px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.player.score} : ${this.ai.score}`, this.width/2, 28);
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pong');
    if (canvas) new PongGame(canvas);
});


