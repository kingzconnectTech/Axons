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
3. Run the server:
   ```bash
   python main.py
   ```
   Server will run on `http://localhost:8000`.

### Render Deployment
1. Create a new Render Web Service from this repo.
2. Set the root directory to `backend`.
3. Use:
   ```bash
   pip install -r requirements.txt
   ```
   as the build command.
4. Use:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
   as the start command.
5. Set `EXPO_PUBLIC_API_BASE_URL` in the frontend build/dev environment to your Render backend URL.

### Backend Environment
- `IQ_OPTION_EMAIL` and `IQ_OPTION_PASSWORD` are required for signal and market-data endpoints that use the shared IQ Option session.
- If IQ Option support is unavailable, the backend now stays online and IQ-dependent routes return `503` with `service: "iqoption"`.

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
- **API URL**: Set `EXPO_PUBLIC_API_BASE_URL` for the frontend. For local device testing, use your computer's local IP address (for example `http://192.168.1.X:8000`). For production, use your Render backend URL.

## Features
- **Signals**: Real-time analysis using RSI and SMA strategies.
- **Auto Trade**: Multi-user support with isolated sessions.
- **Security**: Account isolation to prevent conflicts.
