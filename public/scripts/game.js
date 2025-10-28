class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;

        // Define the shapes (example rectangles here)
        this.shapes = [
            { x: 50, y: 50, width: 50, height: 50, name: 'Main' },
            { x: 150, y: 150, width: 50, height: 50, name: 'collectable' },
            { x: 250, y: 250, width: 50, height: 50, name: 'collectable' }
        ];

        // Start game loop
        this.update();

        // Handle keyboard input
        document.addEventListener('keydown', (e) => this.handleInput(e));
    }

    redraw() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw each shape
        for (const shape of this.shapes) {
            this.ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        }
    }

    handleInput(e) {
        // Example: Move the first shape to the right when the right arrow key is pressed
        if (e.key === 'ArrowRight') {
            this.shapes[0].x += 10;
        } else if (e.key === 'ArrowDown') {
            this.shapes[0].y += 10;
        }
        // ... You can add more controls here.
    }

    checkCollision(obj1, obj2) {
        // Check if the two objects are colliding
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    update() {
        this.redraw();

        // Example collision check between the first and second shapes
        if (this.checkCollision(this.shapes[0], this.shapes[1])) {
            console.log('Collision detected between shape 1 and 2!');

            // Increase the score
            this.incorrectScoreVariableNameChangeThisTo_score++;

            // Remove the second shape from the array
            this.shapes.splice(1, 1);
        }

        // Use requestAnimationFrame for smooth animations
        requestAnimationFrame(() => this.update());
    }
}

// Initialize the game
document.myGame = new Game();



// log the score once every second
setInterval(() => console.log(document.myGame.score), 1000);