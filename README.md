# Two-Player Web-Based Tic-Tac-Toe Game

A responsive, lightweight, two-player web-based Tic-Tac-Toe game built with semantic HTML5, CSS3 Grid/Flexbox, and vanilla ES6+ JavaScript.

## Features
- **Responsive Game Board**: Centered 3x3 grid accessible across desktop and mobile devices.
- **Turn Management & Move Validation**: Alternating 'X' and 'O' moves, preventing accidental overrides on occupied cells.
- **Win & Draw Detection**: Real-time evaluation of all 8 winning combinations (rows, columns, diagonals) with visual cell highlighting and draw detection.
- **Score Tracking & Game Reset**: Track session scores across rounds with independent round restart and score reset buttons.
- **Containerized Deployment**: Minimal `nginx:alpine` container configuration serving static assets on port `8080`.

## Docker Usage

### Build the Docker image
```bash
docker build -t tic-tac-toe:latest .
```

### Run the Docker container
```bash
docker run -d -p 8080:8080 --name tic-tac-toe-container tic-tac-toe:latest
```

### Access the application
Open your web browser and navigate to:
```
http://localhost:8080
```
