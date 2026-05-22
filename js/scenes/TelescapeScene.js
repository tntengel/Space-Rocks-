class TelescapeScene extends Phaser.Scene {
    constructor() {
        super('TelescapeScene');
    }

    create() {
        // Title
        this.add.text(this.cameras.main.width / 2, 40, '🔭 TELESCOPE DETECTION SYSTEM', {
            fontSize: '20px',
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

        // UI
        this.scoreText = this.add.text(10, 10, '', {
            fontSize: '16px',
            color: '#00ff00',
            fontFamily: 'monospace'
        });

        this.waveText = this.add.text(this.cameras.main.width - 150, 10, '', {
            fontSize: '16px',
            color: '#00ff00',
            fontFamily: 'monospace',
            align: 'right'
        });

        // Instructions
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 50, 'Click an asteroid to select it, then choose BLAST or DEFLECT', {
            fontSize: '12px',
            color: '#aaaaaa',
            fontFamily: 'monospace',
            align: 'center'
        }).setOrigin(0.5);

        // Create initial asteroids
        this.spawnWave();

        // Input
        this.input.on('pointerdown', this.onScreenClick, this);
    }

    spawnWave() {
        const asteroidCount = 3 + this.wave;

        for (let i = 0; i < asteroidCount; i++) {
            const asteroid = {
                id: Phaser.Math.RND.uuid(),
                x: Phaser.Math.RND.between(50, this.cameras.main.width - 50),
                y: Phaser.Math.RND.between(100, 250),
                size: Phaser.Math.RND.pick(['small', 'medium', 'large']),
                speed: Phaser.Math.RND.between(20, 60),
                impactTime: Phaser.Math.RND.between(8, 20),
                maxImpactTime: 0,
                status: 'detected',
                sprite: null,
                impactText: null,
                buttons: null
            };

            asteroid.maxImpactTime = asteroid.impactTime;
            this.createAsteroidSprite(asteroid);
            this.asteroidsInScene.push(asteroid);
        }
    }

    createAsteroidSprite(asteroid) {
        const sizeMap = { small: 15, medium: 25, large: 35 };
        const radius = sizeMap[asteroid.size];
        const threatColor = asteroid.size === 'large' ? 0xff4444 : asteroid.size === 'medium' ? 0xffaa00 : 0xffff00;

        // Create a simple circle sprite using graphics
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(threatColor, 1);
        graphics.fillCircle(radius, radius, radius);
        graphics.generateTexture('asteroid_' + asteroid.id, radius * 2, radius * 2);
        graphics.destroy();

        // Create sprite from the generated texture
        const sprite = this.add.sprite(asteroid.x, asteroid.y, 'asteroid_' + asteroid.id);
        sprite.setInteractive();
        sprite.on('pointerdown', () => this.selectAsteroid(asteroid));
        sprite.depth = 10;

        asteroid.sprite = sprite;
        asteroid.radius = radius;
    }

    selectAsteroid(asteroid) {
        if (asteroid.status !== 'detected') return;

        // Deselect previous
        if (this.selectedAsteroid) {
            this.deselectAsteroid();
        }

        this.selectedAsteroid = asteroid;
        asteroid.status = 'defending';

        asteroid.sprite.setStrokeStyle(3, 0x00ff00);

        const buttonY = asteroid.y + 80;
        const buttonWidth = 100;
        const buttonHeight = 40;

        // BLAST button
        const blastBtn = this.add.rectangle(
            asteroid.x - 70,
            buttonY,
            buttonWidth,
            buttonHeight,
            0xff4444
        );
        blastBtn.setInteractive();
        blastBtn.on('pointerdown', () => this.defenseAction(asteroid, 'blast'));
        const blastText = this.add.text(blastBtn.x, blastBtn.y, 'BLAST', {
            fontSize: '12px',
            color: '#fff',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        // DEFLECT button
        const deflectBtn = this.add.rectangle(
            asteroid.x + 70,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x4444ff
        );
        deflectBtn.setInteractive();
        deflectBtn.on('pointerdown', () => this.defenseAction(asteroid, 'deflect'));
        const deflectText = this.add.text(deflectBtn.x, deflectBtn.y, 'DEFLECT', {
            fontSize: '12px',
            color: '#fff',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        asteroid.buttons = { blast: blastBtn, deflect: deflectBtn, blastText, deflectText };
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
            speed: { min: -200, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 600,
            gravityY: 0
        });
    }

    cleanupAsteroid(asteroid) {
        asteroid.sprite.destroy();
        if (asteroid.buttons) {
            asteroid.buttons.blast.destroy();
            asteroid.buttons.deflect.destroy();
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

    onScreenClick(pointer) {
        if (this.selectedAsteroid) {
            const distance = Phaser.Math.Distance.Between(
                pointer.x,
                pointer.y,
                this.selectedAsteroid.x,
                this.selectedAsteroid.y
            );
            if (distance > this.selectedAsteroid.radius + 50) {
                this.deselectAsteroid();
            }
        }
    }

    deselectAsteroid() {
        if (this.selectedAsteroid) {
            this.selectedAsteroid.sprite.setStrokeStyle(0);
            if (this.selectedAsteroid.buttons) {
                this.selectedAsteroid.buttons.blast.destroy();
                this.selectedAsteroid.buttons.deflect.destroy();
                this.selectedAsteroid.buttons.blastText.destroy();
                this.selectedAsteroid.buttons.deflectText.destroy();
            }
            this.selectedAsteroid.status = 'detected';
            this.selectedAsteroid = null;
        }
    }

    update() {
        this.scoreText.setText(`Score: ${this.score}`);
        this.waveText.setText(`Wave: ${this.wave}\nAsteroids: ${this.asteroidsInScene.length}`);

        this.asteroidsInScene.forEach(asteroid => {
            if (asteroid.status === 'detected' || asteroid.status === 'defending') {
                asteroid.impactTime -= this.game.loop.deltaMS / 1000;

                if (!asteroid.impactText) {
                    asteroid.impactText = this.add.text(
                        asteroid.x,
                        asteroid.y - asteroid.radius - 30,
                        '',
                        {
                            fontSize: '14px',
                            color: '#ff0000',
                            fontFamily: 'monospace',
                            align: 'center'
                        }
                    ).setOrigin(0.5);
                }

                const timePercent = asteroid.impactTime / asteroid.maxImpactTime;
                if (timePercent > 0.5) {
                    asteroid.impactText.setColor('#ffff00');
                } else if (timePercent > 0.2) {
                    asteroid.impactText.setColor('#ffaa00');
                } else {
                    asteroid.impactText.setColor('#ff0000');
                }

                asteroid.impactText.setText(`Impact: ${asteroid.impactTime.toFixed(1)}s`);

                if (asteroid.impactTime <= 0) {
                    asteroid.impactText.setText('IMPACT!');
                    asteroid.sprite.setFillStyle(0x000000);
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
