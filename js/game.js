// Game configuration
const config = {
    type: Phaser.AUTO,
    width: Math.min(window.innerWidth, 1024),
    height: Math.min(window.innerHeight, 768),
    backgroundColor: '#0a0e27',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [TelescapeScene, DefenseScene]
};

const game = new Phaser.Game(config);

// Global game state
game.gameState = {
    score: 0,
    wave: 1,
    asteroidsDetected: 0,
    asteroidsDefeated: 0,
    gameOver: false
};