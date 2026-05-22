# Space Rocks 🚀

A strategic asteroid defense game where you detect asteroids with a telescope, calculate impact time, and decide whether to blast them or deflect them away with robots or solar sails.

## Game Concept

- **Detect**: Use your telescope to scan for incoming asteroids
- **Assess**: Calculate time until impact and threat level
- **Decide**: Choose between two defense strategies:
  - **BLAST**: Destroy the asteroid instantly (higher risk, higher reward)
  - **DEFLECT**: Use robots or solar sails to redirect it (safer, takes time)
- **Survive**: Protect Earth from asteroid impacts

## Getting Started

### Play Online
Visit: `https://tntengel.github.io/Space-Rocks-/`

### Play Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/tntengel/Space-Rocks-.git
   cd Space-Rocks-
   ```

2. Open `index.html` in your browser or run a local server:
   ```bash
   python -m http.server 8000
   # or
   npx http-server
   ```

3. Visit `http://localhost:8000`

## How to Play

1. **Detect Asteroids**: Asteroids appear on your telescope
2. **Read the Data**: Each asteroid shows:
   - Size (color coded: Yellow=Small, Orange=Medium, Red=Large)
   - Impact time (countdown in seconds)
3. **Make a Decision**:
   - Click an asteroid to select it
   - Click **BLAST** to destroy it immediately (high points)
   - Click **DEFLECT** to redirect it safely (medium points)
4. **Earn Points**: Successfully defended Earth = points
5. **Survive Waves**: Each wave gets harder with more asteroids

## Game Features

✅ Telescope detection system  
✅ Real-time impact countdown  
✅ Strategic decision-making  
✅ Blast and deflect mechanics  
✅ Wave-based progression  
✅ Score tracking  
✅ Explosion effects  
✅ Mobile responsive design  
✅ Works on phone and desktop  

## Technologies

- [Phaser 3](https://phaser.io/) - Game framework
- HTML5 Canvas
- Vanilla JavaScript

## Planned Features

- Resource management (limited blasts, energy)
- Trajectory prediction visualization
- Sound effects
- Advanced asteroid formations
- Difficulty scaling
- Power-ups and upgrades
- Leaderboard system

## Contributing

Feel free to fork this project and submit pull requests!

## License

MIT License - feel free to use this however you like!
