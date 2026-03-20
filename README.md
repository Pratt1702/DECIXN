# 🚀 ET Markets GenAI Hackathon - Market Intelligence Engine

An AI-driven technical analysis and market intelligence platform for Indian stocks. This project transforms complex technical indicators, filings, and news into actionable, money-making decisions for retail investors.

---

## ✨ Features

- **Portfolio Brain**: Aggregated portfolio-level assessment with win rates, P&L calculations, and automated risk detection rules.
- **Stock Analysis**: Deep technical analysis for individual NSE tickers using data from Yahoo Finance.
- **Smart Signal Search**: Real-time ticker and company search with refined Indian equity filtering.
- **Opportunity Detection**: Surfacing "missed" opportunities from price action and corporate trends.
- **Actionable Insights**: Plain-English explanations and decision-guiding scores (e.g., Average Down, Cut Losses, Ride Trend).

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **UI & Animations**: [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide React Icons](https://lucide.dev/)
- **Data Visualization**: [Recharts](https://recharts.org/), [GSAP](https://gsap.com/)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Server**: [Uvicorn](https://www.uvicorn.org/)
- **Data Engines**: [yfinance](https://github.com/ranaroussi/yfinance), [pandas](https://pandas.pydata.org/), [numpy](https://numpy.org/)

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [Python](https://www.python.org/) (v3.12.0 or higher)

---

## ⚙️ Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Pratt1702/ETGenAIHackathon.git
cd ETGenAIHackathon
```

### 2. Root Tooling
Install the root dependencies for running the project concurrently:
```bash
npm install
```

### 3. Frontend Setup
Navigate to the frontend directory and install dependencies:
```bash
cd frontend
npm install
cd ..
```

### 4. Backend Setup
Navigate to the backend directory and install Python requirements:
```bash
cd backend
pip install -r requirements.txt
cd ..
```

---

## 🚀 Running the Project

You can start both the **Frontend** and **Backend** simultaneously with a single command from the root directory:

```bash
npm run dev
```

### 🛠️ Individual Commands

If you need to run services separately:

- **Run Frontend Only**: `npm run dev:frontend`
- **Run Backend Only**: `npm run dev:backend`

---

## 📁 Project Structure

```text
.
├── backend          # FastAPI server with market intelligence logic
├── frontend         # React/Vite dashboard and UI components
├── model            # AI/ML logic and agent intelligence definitions
├── scraping_service # Content extraction and news scraping tools
├── TODO.md          # Active development roadmap
└── package.json     # Root orchestrator for concurrent execution
```

---

## 💡 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

*Built for the ET Markets GenAI Hackathon - Empowering the next generation of Indian retail investors.*
