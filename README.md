# SerpByte 🐍  
A modern, lightweight Snake Game built for the web.

SerpByte is a browser-based Snake game designed with a clean UI, smooth gameplay, and simple mechanics. This project is open-source and currently in **Beta**, built mainly for learning, experimentation, and portfolio purposes.

Live Demo: https://serpbyte.vercel.app  
Status: Beta Release  

> ⚠️ Best experienced on desktop. Mobile version is playable but not fully optimized yet.

<img width="1903" height="984" alt="image" src="https://github.com/user-attachments/assets/81cda0db-8b99-417a-9c2e-73d42f7d62cb" />

## Features

- Classic snake gameplay  
- Clean and minimal UI  
- Keyboard controls (arrow keys)  
- Score tracking  
- Difficulty levels  
- Sound effects  
- Fully responsive layout  
- Dockerized for easy setup  
- Deployed on Vercel  

---

## Recommended Platform

For the best experience, play on **desktop or laptop** using a keyboard.

Mobile version:
- Works
- But movement is not fully smooth yet
- Touch controls will be improved in future updates

---

## Tech Stack

- HTML5  
- CSS3  
- JavaScript (Vanilla)  
- Docker  
- Nginx  
- Vercel (Deployment)

---

## Controls

| Key | Action |
|-----|--------|
| ↑   | Move Up |
| ↓   | Move Down |
| ←   | Move Left |
| →   | Move Right |

---

## Local Setup (Without Docker)

```bash
git clone https://github.com/muhammadhammad2005/serpbyte.git
cd serpbyte
open index.html
```
Just open index.html in your browser.

## Run with Docker
Make sure Docker is installed.
```bash
docker build -t serpbyte .
docker run -p 8080:80 serpbyte
```
Then open:
```bash
http://localhost:8080
```
## Deployment
This project is deployed using Vercel.

Every push to the main branch triggers automatic deployment.

## Roadmap (Planned Features)

This is a beta version. Future updates may include:

- Advanced animations
- Multiple game stages
- Different maps and layouts
- Obstacles and power-ups
- Player profiles
- High score leaderboard
- Backend integration
- Database for persistent scores
- Multiplayer mode
- Dark / neon themes

## Contributing

Contributions are welcome.

You can:

- Open issues
- Suggest features
- Submit pull requests
- Improve UI/UX
- Optimize performance

Basic flow:
```bash
Fork the repo  
Create a new branch  
Make your changes  
Submit a PR  
```
## Open Source

This project is fully open-source and intended for learning and portfolio use.

Feel free to:

- Use it
- Modify it
- Extend it
- Deploy your own version

## License

MIT License
You are free to use, modify, and distribute this project.

## Author

Built by **Muhammad Hammad**

## Disclaimer

SerpByte is currently in **Beta.**
Expect bugs, unfinished features, and design improvements in future releases.


