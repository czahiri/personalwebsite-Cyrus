class SnakeGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = 24; // 24x24 grid => 480x480 canvas
        this.cell = canvas.width / this.gridSize;
        this.reset();
        this.bind();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    reset() {
        this.snake = [{ x: 12, y: 12 }];
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };
        this.spawnFood();
        this.speedMs = 110; // lower is faster
        this.accumulator = 0;
        this.gameOver = false;
        this.paused = false;
        this.score = 0;
        this.last = performance.now();
    }

    bind() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' && this.dir.y !== 1) this.nextDir = { x: 0, y: -1 };
            else if (e.key === 'ArrowDown' && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
            else if (e.key === 'ArrowLeft' && this.dir.x !== 1) this.nextDir = { x: -1, y: 0 };
            else if (e.key === 'ArrowRight' && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };
            else if (e.key === 'p' || e.key === 'P') this.paused = !this.paused;
            else if ((e.key === 'r' || e.key === 'R') && this.gameOver) this.reset();
        });
    }

    spawnFood() {
        while (true) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            if (!this.snake.some(s => s.x === x && s.y === y)) {
                this.food = { x, y };
                return;
            }
        }
    }

    step() {
        if (this.gameOver || this.paused) return;
        this.dir = this.nextDir;
        const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

        // Wall collision
        if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
            this.gameOver = true; return;
        }
        // Self collision
        if (this.snake.some(s => s.x === head.x && s.y === head.y)) { this.gameOver = true; return; }

        this.snake.unshift(head);
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            if (this.speedMs > 70) this.speedMs -= 2; // speed up gradually
            this.spawnFood();
        } else {
            this.snake.pop();
        }
    }

    drawCell(x, y, color) {
        const c = this.cell;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * c, y * c, c - 1, c - 1);
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#0b0b0c';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid dots
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                ctx.fillRect(i * this.cell + this.cell/2, j * this.cell + this.cell/2, 1, 1);
            }
        }

        // Food and snake
        this.drawCell(this.food.x, this.food.y, '#ff9f0a');
        for (let i = 0; i < this.snake.length; i++) {
            const color = i === 0 ? '#64d2ff' : '#f5f5f7';
            this.drawCell(this.snake[i].x, this.snake[i].y, color);
        }

        // HUD
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '18px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${this.score}`, 14, 24);

        if (this.gameOver) {
            ctx.textAlign = 'center';
            ctx.fillText('Game Over — Press R to Restart', this.canvas.width/2, this.canvas.height/2);
        } else if (this.paused) {
            ctx.textAlign = 'center';
            ctx.fillText('Paused — Press P to Resume', this.canvas.width/2, this.canvas.height/2);
        }
    }

    loop(now) {
        const dt = now - this.last; this.last = now;
        this.accumulator += dt;
        while (this.accumulator >= this.speedMs) { this.accumulator -= this.speedMs; this.step(); }
        this.draw();
        requestAnimationFrame(this.loop);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('snake');
    if (canvas) new SnakeGame(canvas);
});


