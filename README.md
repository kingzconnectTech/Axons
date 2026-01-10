# Axon Trading App

## Prerequisites
- Python 3.8+
- Node.js & npm
- Expo CLI (`npm install -g expo-cli`)

## Setup

### Backend
1. Navigate to `backend` folder.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   *Note: You might need to install `iqoptionapi` from source or a specific fork if the pip version is outdated.*
3. Run the server:
   ```bash
   python main.py
   ```
   Server will run on `http://localhost:8000`.

### Frontend
1. Navigate to `frontend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the app:
   ```bash
   npm start
   ```
   Use Expo Go app on your phone or an emulator.

## Configuration
- **API URL**: If running on a physical device, update `API_BASE_URL` in `frontend/src/config.js` to your computer's local IP address (e.g., `http://192.168.1.X:8000`).

## Features
- **Signals**: Real-time analysis using RSI and SMA strategies.
- **Auto Trade**: Multi-user support with isolated sessions.
- **Security**: Account isolation to prevent conflicts.
