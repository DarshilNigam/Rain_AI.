# R.A.I. — Rainfall Intelligence & Explainable AI Platform

> **Predict → Explain → Locate → Warn → Connect → Help → Recover**

R.A.I. is an advanced meteorological and geospatial risk intelligence platform designed for multi-horizon precipitation forecasting, explainable AI (XAI) feature attribution, life-safety emergency alerting, civic relief mobilization, and precision agronomic guidance.

---

## 🏛️ The 5 Core Product Pillars

1. **R.A.I. Intelligence (`/intelligence`)**: Multi-horizon rainfall forecasting with SHAP/Feature attribution, uncertainty bounds, and environmental driver explanations.
2. **R.A.I. Risk Map (`/risk-map`)**: High-resolution spatial topography layers, precipitation hotspots, catchment basins, and flood inundation vectors.
3. **R.A.I. Emergency (`/emergency`)**: Tiered hazard warnings (Advisory, Watch, Warning, Emergency), evacuation corridors, and verified shelter locators.
4. **R.A.I. Relief (`/relief`)**: Resource mobilization matching, relief supply tracking, emergency aid allocation, and community recovery transparency.
5. **R.A.I. Farmer (`/farmer`)**: Crop stage vulnerability matrices, soil moisture saturation thresholds, and precision drainage guidance.

---

## 🎨 Visual Identity & Design System

R.A.I. is designed as a **Light-First Atmospheric Platform**:

* **Canvas & Surfaces**: Soft whites (`#F8FAFC`), Ice white (`#F0F9FF`), crisp elevated cards.
* **Semantic Weather & Oceans**: Ice blue & deep sky (`#0EA5E9`, `#0284C7`).
* **Semantic AI & XAI**: Electric Aqua & Teal (`#06B6D4`, `#0891B2`).
* **Semantic Safe / Agri**: Fresh Mint & Emerald (`#10B981`, `#16A34A`).
* **Semantic Caution**: Restrained Amber & Ochre (`#F59E0B`, `#D97706`).
* **Semantic Emergency / Critical**: High-contrast Alert Red (`#EF4444`, `#DC2626`).
* **Typography**: *Plus Jakarta Sans* (Editorial/Display), *Inter* (UI/Body), *JetBrains Mono* (Telemetry/Metrics).

---

## 📁 Directory Architecture

```text
d:\rainainew\
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types/                 # Domain, API, and UI Types
    │   ├── domain.ts          # Core domain models (12 entities)
    │   ├── api.ts             # API response wrappers & queries
    │   └── ui.ts              # Presentation & component types
    ├── tokens/                # Centralized Design Tokens (TypeScript)
    │   ├── colors.ts
    │   ├── typography.ts
    │   ├── spacing.ts
    │   ├── motion.ts
    │   └── index.ts
    ├── styles/                # CSS Architecture & Tokens
    │   ├── tokens.css         # CSS Custom Properties
    │   ├── typography.css     # Typography scale & weights
    │   ├── animations.css     # Atmospheric motion & a11y reduced motion
    │   ├── reset.css          # Modern CSS reset
    │   └── global.css         # Canvas background & global defaults
    ├── api/                   # API Abstraction Layer
    │   ├── client.ts          # HTTP client abstraction
    │   ├── endpoints.ts       # Service endpoint constants
    │   └── index.ts
    ├── services/              # Service Layer Interfaces
    │   ├── base.service.ts
    │   ├── prediction.service.ts
    │   ├── risk-map.service.ts
    │   ├── emergency.service.ts
    │   ├── relief.service.ts
    │   └── farmer.service.ts
    ├── components/
    │   ├── ui/                # UI Primitives (Button, Card, Badge, Container, MetricDisplay, StatusIndicator)
    │   └── layout/            # App Shell, Header, Navigation, Footer
    ├── features/              # The 5 Feature Modules
    │   ├── intelligence/
    │   ├── risk-map/
    │   ├── emergency/
    │   ├── relief/
    │   └── farmer/
    ├── pages/                 # Clean Route Pages
    │   ├── Home/
    │   ├── Intelligence/
    │   ├── RiskMap/
    │   ├── Emergency/
    │   ├── Relief/
    │   ├── Farmer/
    │   └── NotFound/
    ├── routes/                # Route Configuration & Router
    ├── hooks/                 # Responsive & Accessibility Hooks
    └── utils/                 # Classname composer & formatters
```

---

## 🚀 Getting Started

### Prerequisites

* Node.js `>= 18.0.0` (Verified on Node `v24.18.0`)
* npm `>= 9.0.0`

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

### Type Checking & Build

```bash
npm run typecheck
npm run build
```
