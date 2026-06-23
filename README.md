# ClimaLens — Know Before You Go

ClimaLens is an AI-powered climate risk and travel intelligence platform for Sri Lanka. It combines live weather data with a custom-trained machine learning model (trained on 14 years of Kaggle disaster data) to predict flood, landslide, and extreme weather risks before they happen.

## Project Structure
- `/src` - The React Native (Expo) frontend application.
- `/ai_backend` - The Python backend that handles Open-Meteo data scraping, model training, and Edge AI generation.
- `/supabase` - Contains the PostgreSQL database schema for destinations and trips.

---

## 🚀 How to Run the App Locally

To run this project on your PC, you need to run the **Python Backend** and the **Expo Frontend** separately.

### Prerequisites
1. Install [Node.js](https://nodejs.org/en/) (v18+)
2. Install [Python](https://www.python.org/downloads/) (3.10+)
3. Install [Expo Go](https://expo.dev/client) app on your mobile phone (Android/iOS).

### Step 1: Run the AI Backend
The Python backend processes the 14-year Kaggle dataset and generates the AI models used by the app.

1. Open a terminal and navigate to the `ai_backend` folder:
   ```bash
   cd ai_backend
   ```
2. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the live inference server / scraper (if needed):
   ```bash
   python main.py
   ```
*(Note: The mobile app runs Edge AI locally, so the backend is primarily for training and data syncing to Supabase).*

### Step 2: Run the React Native App
1. Open a **new** terminal window and navigate to the project root:
   ```bash
   cd path/to/ClimaLens
   ```
2. **Environment Variables**: Obtain the `.env` file containing the Supabase keys from your team lead, and place it in the root `ClimaLens` directory.
3. Install the Node modules:
   ```bash
   npm install
   ```
4. Start the Expo development server:
   ```bash
   npx expo start -c
   ```
5. Scan the QR code that appears in your terminal using the **Expo Go** app on your phone.

---

## 💡 Tech Stack
- **Frontend**: React Native, Expo, Reanimated, Zustand
- **Backend/AI**: Python, Scikit-Learn, Pandas
- **Database**: Supabase (PostgreSQL)
- **APIs**: Open-Meteo (Weather), i18next (Translations)

## 🌍 Features
- **Dark/Light Mode**: Full dynamic theming.
- **Trilingual Support**: English, Sinhala, and Tamil.
- **Ditwah Replay**: Simulates the devastating November 2025 Cyclone Ditwah against live data.
- **Edge Inference**: The trained Random Forest logic runs mathematically inside the mobile app for zero-latency offline risk prediction.
