class DefenseScene extends Phaser.Scene {
    constructor() {
        super('DefenseScene');
    }

    init(data) {
        this.finalScore = data?.finalScore || 0;
        this.finalWave = data?.finalWave || 1;
    }

    create() {
        this.cameras.main.setBackgroundColor('#0a0e27');

        this.add.text(this.cameras.main.width / 2, 100, '🌍 GAME OVER 🌍', {
            fontSize: '48px',
            color: '#ff4444',
            fontFamily: 'monospace',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(this.cameras.main.width / 2, 200, 'Earth Impact Detected!', {
            fontSize: '24px',
            color: '#ffaa00',
            fontFamily: 'monospace',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(this.cameras.main.width / 2, 280, `Final Score: ${this.finalScore}`, {
            fontSize: '32px',
            color: '#00ff00',
            fontFamily: 'monospace',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(this.cameras.main.width / 2, 340, `Waves Survived: ${this.finalWave}`, {
            fontSize: '28px',
            color: '#00ff00',
            fontFamily: 'monospace',
            align: 'center'
        }).setOrigin(0.5);

        const btnWidth = 150;
        const btnHeight = 50;
        const btnX = this.cameras.main.width / 2;
        const btnY = 450;

        const btn = this.add.rectangle(btnX, btnY, btnWidth, btnHeight, 0x00ff00);
        btn.setInteractive();
        btn.on('pointerdown', () => this.scene.start('TelescapeScene'));
        btn.on('pointerover', () => btn.setFillStyle(0x00aa00));
        btn.on('pointerout', () => btn.setFillStyle(0x00ff00));

        this.add.text(btnX, btnY, 'PLAY AGAIN', {
            fontSize: '20px',
            color: '#000',
            fontFamily: 'monospace'
        }).setOrigin(0.5);
    }
}