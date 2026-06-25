# 🚕 AutoFare AI

### Fair Auto-Rickshaw Fare Estimation & Overcharge Detection Platform

AutoFare AI helps commuters, tourists, and daily travelers estimate fair auto-rickshaw fares using official government rate cards, real-world fare data, and machine learning-powered insights.

Built to solve one of the most common urban transportation problems in India: **"Am I being charged a fair fare?"**

---

## 🌟 Features

### 🚖 Fare Estimator

* Calculate fares between any pickup and drop location
* Distance calculation using Google Maps APIs
* Official meter fare estimation
* Real-world street fare prediction

### 🌙 Night Fare Support

* Automatic night surcharge calculation
* Accurate fare breakdown for late-night travel

### 💰 Official vs Street Fare

Compare:

* Government-approved fare
* Expected street fare
* Estimated negotiation range

### 📊 Fare Breakdown

Detailed fare calculations including:

* Base fare
* Distance charges
* Night surcharge
* Airport surcharge
* Luggage charges
* Waiting charges

### 🛡️ Dispute Mode

Generate a shareable fare report showing:

* Route details
* Official fare
* Actual fare demanded
* Overcharge percentage

Useful when resolving fare disputes.

### 📈 Crowdsourced Fare Intelligence

Users can submit:

* Quoted fare
* Actual fare paid
* Route details

Building a city-wide dataset of fare trends and overcharging patterns.

### 🤖 Machine Learning (In Progress)

Planned features:

* Fare prediction
* Overcharge risk scoring
* Route risk classification
* Overcharge hotspot detection
* Dynamic fare trend analysis

---

## 🏗️ Tech Stack

### Frontend

* Next.js 15
* TypeScript
* Tailwind CSS
* Shadcn UI
* Zustand

### Backend

* Next.js Route Handlers
* Supabase

### Maps & Location

* Google Places API
* Google Distance Matrix API

### Database

* PostgreSQL (Supabase)

### Data Visualization

* Recharts

### Machine Learning

* Python
* Pandas
* Scikit-learn
* XGBoost

### Deployment

* Vercel

---

## 📸 Core User Flow

```text
User
 ↓
Select Pickup & Drop
 ↓
Distance Calculation
 ↓
Fare Estimation
 ↓
Official vs Street Fare
 ↓
Submit Actual Fare
 ↓
Dispute Report
 ↓
Crowdsourced Analytics
 ↓
ML Insights
```

---

## 📂 Project Structure

```text
autofare-ai/
│
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── store/
│   ├── types/
│   └── api/
│
├── supabase/
├── ml/
├── public/
└── docs/
```

---

## ⚙️ Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=
```

---

## 🚀 Getting Started

Clone the repository:

```bash
git clone <repository-url>
cd autofare-ai
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Visit:

```text
http://localhost:3000
```

---

## 🎯 Problem Statement

Millions of commuters across Indian cities face uncertainty regarding auto-rickshaw fares.

AutoFare AI aims to:

* Improve fare transparency
* Reduce overcharging
* Provide reliable fare estimates
* Build a crowdsourced mobility intelligence platform

---

## 📈 Future Vision

AutoFare AI is designed to evolve into a city-scale transportation intelligence platform that combines:

* Government fare policies
* Real-world commuter reports
* Geospatial analytics
* Machine learning predictions

to make urban transportation more transparent and data-driven.

---

## 👨‍💻 Author

Built by Nikkii as a full-stack + machine learning project focused on solving real-world urban mobility challenges.

---

