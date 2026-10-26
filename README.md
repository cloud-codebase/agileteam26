# Tic-Tac-Toe Web Game

A responsive, lightweight, two-player web-based Tic-Tac-Toe game built with pure HTML5, modern CSS Grid/Flexbox, and Vanilla JavaScript.

## Features
- **Responsive 3x3 Grid:** Centered layout supporting both desktop and mobile viewports.
- **Turn-based Gameplay:** Player X and Player O alternate moves with real-time status feedback.
- **Move Validation & Cell Locking:** Prevents overwriting already played cells and disables cells when game concludes.
- **Win & Draw Detection:** Evaluates all 8 winning combinations (horizontal, vertical, diagonal) and detects draw states with visual celebratory highlights.
- **Board Reset:** Reset button instantly restarts the game and clears the board state.
- **Lightweight Containerization:** Production-ready `nginx:alpine` container serving static assets on port `8080`.

## Docker Containerization & Deployment

### Build Docker Image
```bash
docker build -t tictactoe-web-game .
```

### Run Docker Container
```bash
docker run -d -p 8080:8080 --name tictactoe-app tictactoe-web-game
```

### Access Application
Open your browser and navigate to:
```
http://localhost:8080
```
