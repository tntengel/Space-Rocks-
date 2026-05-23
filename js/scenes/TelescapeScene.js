class TelescapeScene extends Phaser.Scene {
    constructor() {
        super('TelescapeScene');
    }

    create() {
        // Clean title at top
        this.add.text(this.cameras.main.width / 2, 20, '🔭 TELESCOPE DETECTION SYSTEM 🔭', {
            fontSize: '16px',
            color: '#00ff00',
            fontFamily: 'monospace',
            align: 'center'
        }).setOrigin(0.5);

        // Game state
        this.score = 0;
        this.wave = 1;
        this.asteroidsInScene = [];
        this.selectedAsteroid = null;
        this.gameOver = false;

        // Score display
        this.scoreText = this.add.text(10, 50, 'Score: 0', {
            fontSize: '14px',
            color: '#00ff00',
            fontFamily: 'monospace'
        });

        // Wave display
        this.waveText = this.add.text(10, 75, 'Wave: 1', {
            fontSize: '14px',
            color: '#00ff00',
            fontFamily: 'monospace'
        });

        // Create initial asteroids
        this.spawnWave();
    }

    spawnWave() {
        const asteroidCount = 3 + this.wave;

        for (let i = 0; i < asteroidCount; i++) {
            const asteroid = {
                id: Phaser.Math.RND.uuid(),
                x: Phaser.Math.RND.between(100, this.cameras.main.width - 100),
                y: Phaser.Math.RND.between(150, 400),
                size: Phaser.Math.RND.pick(['small', 'medium', 'large']),
                impactTime: Phaser.Math.RND.between(8, 15),
                maxImpactTime: 0,
                status: 'detected',
                circle: null,
                impactText: null,
                buttons: null
            };

            asteroid.maxImpactTime = asteroid.impactTime;
            this.createAsteroid(asteroid);
            this.asteroidsInScene.push(asteroid);
        }
    }

    createAsteroid(asteroid) {
        const sizeMap = { small: 20, medium: 30, large: 40 };
        const radius = sizeMap[asteroid.size];
        const colorMap = { small: 0xffff00, medium: 0xffaa00, large: 0xff4444 };
        const color = colorMap[asteroid.size];

        // Create the asteroid circle
        const circle = this.add.circle(asteroid.x, asteroid.y, radius, color);
        circle.setInteractive({ useHandCursor: true });
        circle.on('pointerdown', () => this.selectAsteroid(asteroid));
        circle.setDepth(10);

        asteroid.circle = circle;
        asteroid.radius = radius;
        asteroid.color = color;
    }

    selectAsteroid(asteroid) {
        if (asteroid.status !== 'detected') return;

        // Deselect previous
        if (this.selectedAsteroid) {
            this.deselectAsteroid();
        }

        this.selectedAsteroid = asteroid;
        asteroid.status = 'defending';

        // Add green stroke
        asteroid.circle.setStrokeStyle(3, 0x00ff00);

        const buttonY = asteroid.y + 80;
        const buttonWidth = 80;
        const buttonHeight = 40;

        // BLAST button
        const blastBtn = this.add.rectangle(
            asteroid.x - 50,
            buttonY,
            buttonWidth,
            buttonHeight,
            0xff4444
        );
        blastBtn.setInteractive({ useHandCursor: true });
        blastBtn.on('pointerdown', () => this.defenseAction(asteroid, 'blast'));

        const blastText = this.add.text(asteroid.x - 50, buttonY, 'BLAST', {
            fontSize: '11px',
            color: '#fff',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        // DEFLECT button
        const deflectBtn = this.add.rectangle(
            asteroid.x + 50,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x4444ff
        );
        deflectBtn.setInteractive({ useHandCursor: true });
        deflectBtn.on('pointerdown', () => this.defenseAction(asteroid, 'deflect'));

        const deflectText = this.add.text(asteroid.x + 50, buttonY, 'DEFLECT', {
            fontSize: '11px',
            color: '#fff',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        asteroid.buttons = { 
            blastBtn, 
            deflectBtn, 
            blastText, 
            deflectText 
        };
    }

    defenseAction(asteroid, action) {
        if (action === 'blast') {
            this.score += asteroid.size === 'large' ? 300 : asteroid.size === 'medium' ? 200 : 100;
            this.createExplosion(asteroid.x, asteroid.y);
            asteroid.status = 'destroyed';
        } else if (action === 'deflect') {
            this.score += asteroid.size === 'large' ? 150 : asteroid.size === 'medium' ? 100 : 50;
            asteroid.status = 'deflected';
        }

        this.cleanupAsteroid(asteroid);
    }

    createExplosion(x, y) {
        const particles = this.add.particles(0xff4444);
        particles.createEmitter({
            x: x,
            y: y,
            speed: { min: -150, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 500,
            gravityY: 0
        });
    }

    cleanupAsteroid(asteroid) {
        asteroid.circle.destroy();
        if (asteroid.buttons) {
            asteroid.buttons.blastBtn.destroy();
            asteroid.buttons.deflectBtn.destroy();
            asteroid.buttons.blastText.destroy();
            asteroid.buttons.deflectText.destroy();
        }
        if (asteroid.impactText) asteroid.impactText.destroy();

        this.asteroidsInScene = this.asteroidsInScene.filter(a => a.id !== asteroid.id);
        this.selectedAsteroid = null;

        if (this.asteroidsInScene.length === 0) {
            this.time.delayedCall(1000, () => this.nextWave());
        }
    }

    nextWave() {
        this.wave++;
        this.spawnWave();
    }

    deselectAsteroid() {
        if (this.selectedAsteroid) {
            this.selectedAsteroid.circle.setStrokeStyle(0);
            if (this.selectedAsteroid.buttons) {
                this.selectedAsteroid.buttons.blastBtn.destroy();
                this.selectedAsteroid.buttons.deflectBtn.destroy();
                this.selectedAsteroid.buttons.blastText.destroy();
                this.selectedAsteroid.buttons.deflectText.destroy();
            }
            this.selectedAsteroid.status = 'detected';
            this.selectedAsteroid = null;
        }
    }

    update() {
        this.scoreText.setText(`Score: ${this.score}`);
        this.waveText.setText(`Wave: ${this.wave}`);

        this.asteroidsInScene.forEach(asteroid => {
            if (asteroid.status === 'detected' || asteroid.status === 'defending') {
                asteroid.impactTime -= this.game.loop.deltaMS / 1000;

                // Show timer only if no impact text yet
                if (!asteroid.impactText && asteroid.status === 'detected') {
                    asteroid.impactText = this.add.text(
                        asteroid.x,
                        asteroid.y + asteroid.radius + 15,
                        `${asteroid.impactTime.toFixed(1)}s`,
                        {
                            fontSize: '12px',
                            color: '#ffff00',
                            fontFamily: 'monospace',
                            align: 'center'
                        }
                    ).setOrigin(0.5);
                }

                // Update timer text
                if (asteroid.impactText) {
                    asteroid.impactText.setText(`${Math.max(0, asteroid.impactTime).toFixed(1)}s`);
                    
                    // Change color as time runs out
                    if (asteroid.impactTime > 5) {
                        asteroid.impactText.setColor('#ffff00');
                    } else if (asteroid.impactTime > 2) {
                        asteroid.impactText.setColor('#ffaa00');
                    } else {
                        asteroid.impactText.setColor('#ff0000');
                    }
                }

                // Impact!
                if (asteroid.impactTime <= 0) {
                    if (asteroid.impactText) asteroid.impactText.destroy();
                    asteroid.circle.setFillStyle(0x000000);
                    this.time.delayedCall(2000, () => this.gameOver());
                }
            }
        });
    }

    gameOver() {
        this.gameOver = true;
        this.scene.start('DefenseScene', { finalScore: this.score, finalWave: this.wave });
    }
}
