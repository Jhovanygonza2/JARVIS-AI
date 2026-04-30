# 🌌 J.A.R.V.I.S. - Virtual Assistant

**Just A Rather Very Intelligent System** is a next-generation virtual assistant built with React, featuring a stunning 3D holographic interface and voice-controlled capabilities.

![Jarvis HUD](https://img.shields.io/badge/Interface-3D_HUD-00e5ff?style=for-the-badge)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.dot.js&logoColor=white)

## ✨ Features

- **🗣️ Advanced Voice Recognition**: Natural interaction using `react-speech-recognition`.
- **💠 3D Holographic Orb**: A high-performance 3D sphere built with `Three.js` that reacts dynamically to your voice frequency.
- **📺 YouTube Integration**: Search and play videos directly through voice commands.
- **🛠️ Productivity Tools**: Open Google Apps (Drive, Gmail, Maps), Spotify, WhatsApp, and more.
- **🕒 Real-time Status**: Live clock, date, and system status indicators.
- **🔐 Secure API Management**: Environment-based configuration for API keys.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- A YouTube Data API v3 Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Jhovanygonza2/Jarvis.git
   cd Jarvis
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and add your YouTube API Key:
   ```env
   REACT_APP_YOUTUBE_API_KEY=your_api_key_here
   ```

4. **Run the application:**
   ```bash
   npm start
   ```

## 🎙️ Command Samples

- *"Video de Iron Man"* - Searches for Iron Man videos on YouTube.
- *"Pon el primero"* - Plays the first result from the list.
- *"Dime la hora"* - Jarvis tells you the current time.
- *"Buscar galaxias en Google"* - Opens a Google search for galaxies.
- *"Cerrar video"* - Stops the current YouTube playback.

## 🛠️ Tech Stack

- **Frontend**: React.js
- **3D Graphics**: Three.js
- **Voice Recognition**: Web Speech API / react-speech-recognition
- **Styling**: Vanilla CSS (Custom HUD Design)
- **API**: YouTube Data API v3

## 👤 Author

**Jhovanygonza2**

---

*This project is for educational and hobbyist purposes, inspired by the Marvel Cinematic Universe.*
