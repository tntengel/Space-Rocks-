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
        this.particles = []; // Track particles for cleanup

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
                y: Phaser.Math.RND.between(100, 300),
                depth: Phaser.Math.RND.between(1, 10), // 1 = far, 10 = close
                size: Phaser.Math.RND.pick(['small', 'medium', 'large']),
                impactTime: Phaser.Math.RND.between(8, 15),
                maxImpactTime: 0,
                status: 'detected',
                sprite: null,
                impactText: null,
                buttons: null
            };

            asteroid.maxImpactTime = asteroid.impactTime;
            this.createAsteroid(asteroid);
            this.asteroidsInScene.push(asteroid);
        }

        // Sort by depth (far to near)
        this.asteroidsInScene.sort((a, b) => a.depth - b.depth);
    }

    createAsteroid(asteroid) {
        const depthScale = asteroid.depth / 10; // 0.1 to 1.0
        const baseSize = { small: 20, medium: 30, large: 40 };
        const radius = baseSize[asteroid.size] * depthScale;
        
        const colorMap = { small: 0xffff00, medium: 0xffaa00, large: 0xff4444 };
        const color = colorMap[asteroid.size];

        // Create asteroid with rock texture (jagged circle)
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(color, 1);
        
        // Draw jagged asteroid instead of smooth circle
        this.drawRockyAsteroid(graphics, radius, color);
        
        const texture = `asteroid_${asteroid.id}`;
        graphics.generateTexture(texture, radius * 2.5, radius * 2.5);
        graphics.destroy();

        // Create sprite
        const sprite = this.add.sprite(asteroid.x, asteroid.y, texture);
        sprite.setScale(depthScale);
        sprite.setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => this.selectAsteroid(asteroid));
        sprite.setDepth(asteroid.depth * 100); // Layer by depth
        sprite.setAlpha(0.7 + depthScale * 0.3); // Far = dim, close = bright

        asteroid.sprite = sprite;
        asteroid.radius = radius;
        asteroid.color = color;
    }

    drawRockyAsteroid(graphics, radius, color) {
        // Draw jagged/rocky asteroid shape
        const points = 12;
        const vertices = [];
        
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const jag = radius * (0.7 + Math.random() * 0.5); // Jagged edges
            const x = radius + Math.cos(angle) * jag;
            const y = radius + Math.sin(angle) * jag;
            vertices.push(new Phaser.Geom.Point(x, y));
        }

        graphics.fillPoints(vertices);
        
        // Add craters/details
        graphics.fillStyle(Phaser.Display.Color.HexStringToColor('#000000').color, 0.3);
        for (let i = 0; i < 3; i++) {
            const cx = radius + (Math.random() - 0.5) * radius;
            const cy = radius + (Math.random() - 0.5) * radius;
            const craterRadius = radius * (0.1 + Math.random() * 0.2);
            graphics.fillCircle(cx, cy, craterRadius);
        }
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
        asteroid.sprite.setStrokeStyle(3, 0x00ff00);

        const buttonY = asteroid.y + 100;
        const buttonWidth = 80;
        const buttonHeight = 40;

        // BLAST button (for close asteroids)
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

        // DEFLECT button (for far asteroids with drones)
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
        // Score based on distance and difficulty
        const distanceMultiplier = asteroid.depth / 10;
        
        if (action === 'blast') {
            // Blast better for close asteroids
            const closeBonus = (1 - distanceMultiplier) * 100;
            const sizeBonus = asteroid.size === 'large' ? 300 : asteroid.size === 'medium' ? 200 : 100;
            this.score += sizeBonus + closeBonus;
            this.createExplosion(asteroid.x, asteroid.y, asteroid.radius);
            asteroid.status = 'destroyed';
        } else if (action === 'deflect') {
            // Deflect better for far asteroids
            const farBonus = distanceMultiplier * 150;
            const sizeBonus = asteroid.size === 'large' ? 150 : asteroid.size === 'medium' ? 100 : 50;
            this.score += sizeBonus + farBonus;
            this.createDeflection(asteroid.x, asteroid.y, asteroid.radius);
            asteroid.status = 'deflected';
        }

        this.cleanupAsteroid(asteroid);
    }

    createExplosion(x, y, radius) {
        const emitter = this.add.particles(0xff4444).createEmitter({
            x: x,
            y: y,
            speed: { min: -150, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 400,
            gravityY: 0
        });

        this.particles.push(emitter);

        // Auto-remove after animation
        this.time.delayedCall(500, () => {
            emitter.emitter.stop();
        });
    }

    createDeflection(x, y, radius) {
        // Create a drone/robot animation
        const circle = this.add.circle(x, y, radius * 0.5, 0x00ff00);
        circle.setAlpha(0.5);
        circle.setDepth(1000);

        // Animate outward
        this.tweens.add({
            targets: circle,
            x: x + Phaser.Math.Between(-100, 100),
            y: y - 100,
            alpha: 0,
            duration: 600,
            ease: 'Quad.easeOut',
            onComplete: () => {
                circle.destroy();
            }
        });
    }

    cleanupAsteroid(asteroid) {
        asteroid.sprite.destroy();
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
            this.selectedAsteroid.sprite.setStrokeStyle(0);
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
                        asteroid.y + asteroid.radius + 25,
                        `${asteroid.impactTime.toFixed(1)}s`,
                        {
                            fontSize: '12px',
                            color: '#ffff00',
                            fontFamily: 'monospace',
                            align: 'center'
                        }
                    ).setOrigin(0.5);
                    asteroid.impactText.setDepth(asteroid.depth * 100 + 1);
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
                    asteroid.sprite.setTint(0x000000);
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
