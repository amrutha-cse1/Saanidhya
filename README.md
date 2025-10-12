# Saanidhya - A Caring Voice for Every Step

A comprehensive eldercare companion app with voice assistance, medicine reminders, memory aids, and emergency contacts.

## 🌟 Features

- **Medicine Reminders**: Voice notifications at scheduled times
- **Memory Aids**: Reminders for important dates and events
- **Emergency Contacts**: Quick access to emergency contacts
- **Mood Tracking**: Mood-based activities and content
- **Voice Assistant**: Natural language interaction
- **Multi-language Support**: English and regional languages


## 🛠️ Technology Stack

### Frontend
- React 18 with TypeScript
- Vite build tool
- Tailwind CSS
- React Router
- Lucide React Icons
- Date-fns

### Backend
- Node.js with Express
- SQLite database
- JWT authentication
- bcrypt password hashing
- CORS enabled

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm 8+

### Setup
```bash
# Clone the repository
git clone https://github.com/saivarshini07-12/Saanidhya.git
cd Saanidhya

# Install all dependencies
npm run install:all

# Start development servers
npm run dev
```

### Environment Variables
Create a `.env` file in the root directory:
```
MURF_API_KEY=your_murf_api_key
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

### API keys & local setup
The app integrates with a few external services. Add these keys to the root `.env` file to enable features locally:

- `MURF_API_KEY` - Murf TTS API key (required for `/speak` and websocket TTS)
- `MURF_VOICE_ID` - voice id to use (example: `en-IN-arohi`)
- `OPENAI_API_KEY` - OpenAI API key for chat and Whisper STT (optional; if missing or quota-limited a canned fallback reply will be used)
- `GEMINI_API_URL` and `GEMINI_API_KEY` - set both to enable Gemini as an LLM provider (optional)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` - for emergency call/SMS features (optional)
- `OPENWEATHER_API_KEY` - for weather lookup in `/api/weather` (optional)

Recommended minimal `.env` for local development:

```
MURF_API_KEY=your_murf_api_key
MURF_VOICE_ID=en-IN-arohi
OPENAI_API_KEY=your_openai_key_or_leave_blank
PORT=5000
ENABLE_SERVER_REMINDERS=true
LLM_PREFERRED=openai
JWT_SECRET=some-secret-for-local
```

Notes:
- If `OPENAI_API_KEY` is present but your billing/quota is exhausted you will see 429 errors; the server will return a friendly fallback reply instead of failing.
- To prefer Gemini set `LLM_PREFERRED=gemini` and provide `GEMINI_API_URL` and `GEMINI_API_KEY` in `.env`.

## 🚀 Deployment

### Frontend (GitHub Pages)
```bash
npm run build:frontend
npm run deploy
```

### Backend Options

#### Option 1: Render
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Use build command: `cd murf-backend && npm install`
4. Use start command: `cd murf-backend && npm start`

#### Option 2: Railway
1. Connect GitHub repository
2. Deploy from `murf-backend` folder
3. Set environment variables

#### Option 3: Vercel
1. Use `vercel --prod`
2. Configure for Node.js backend

## 📱 Usage

1. **Sign Up/Login**: Create account or login
2. **Medicine Reminders**: Set medicine schedules with voice alerts
3. **Memory Aids**: Add important dates with reminder times
4. **Emergency Contacts**: Store and organize emergency contacts
5. **Voice Interaction**: Use voice commands for navigation

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Secure API endpoints
- Input validation and sanitization

## 📊 Database Schema

- Users (authentication)
- Medicine reminders
- Memory aids
- Emergency contacts
- Mood entries

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

##  Acknowledgments

- Murf API for voice synthesis
- React community
- Open source contributors


## Screenshots of our app runned in local host

![WhatsApp Image 2025-07-27 at 02 22 19_e8a72304](https://github.com/user-attachments/assets/9ae6d756-90ed-4079-8269-707fa1c0f3f0)
![WhatsApp Image 2025-07-27 at 02 22 35_7595f453](https://github.com/user-attachments/assets/9d495323-8c1e-4473-aeb4-4c588601765e)
![WhatsApp Image 2025-07-27 at 02 22 52_7d01e170](https://github.com/user-attachments/assets/14279b0d-cd98-45ac-bf25-0d6124722e22)
![WhatsApp Image 2025-07-27 at 02 23 12_35e84c0e](https://github.com/user-attachments/assets/cda6368f-b082-4478-8a82-e8a3ba62dcb7)
![WhatsApp Image 2025-07-27 at 02 23 29_a2a01939](https://github.com/user-attachments/assets/a65c7148-3c46-42af-b032-17ff0ffd7478)
![WhatsApp Image 2025-07-27 at 02 23 50_70aa234c](https://github.com/user-attachments/assets/1b97ddc5-0bf5-4f06-9700-0a221088dc53)
![WhatsApp Image 2025-07-27 at 02 24 11_3fd52189](https://github.com/user-attachments/assets/34c8c1d4-780a-404f-91d1-0348e44c4b83)
![WhatsApp Image 2025-07-27 at 02 24 28_49c384ec](https://github.com/user-attachments/assets/dedbe5d3-43b0-46fc-b005-f1719dc6fea2)
