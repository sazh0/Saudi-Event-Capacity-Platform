<div align="center">

# National Observatory for Major Events Facilities Readiness 📊
### المرصد الوطني لجاهزية مرافق الفعاليات الكبرى 📊
<p>
  <img src="https://img.shields.io/badge/✅_Completed-2ea44f?style=flat-square" alt="Completed"/>
  &nbsp;
  <img src="https://img.shields.io/badge/🌐_Web_App-0969da?style=flat-square" alt="Web App"/>
  &nbsp;
  <img src="https://img.shields.io/badge/📊_Data_Analytics-7c3aed?style=flat-square" alt="Data Analytics"/>
  &nbsp;
  <img src="https://img.shields.io/badge/🇸🇦_Vision_2030-16a34a?style=flat-square" alt="Vision 2030"/>
</p>

A national platform for measuring infrastructure **readiness and capacity** for Saudi Arabia's major upcoming events, providing daily deficit/surplus analysis, scenario simulation, and strategic planning support across the **2030–2034** event horizon.

[🌐 Visit the Website ](https://saudi-events-capacity.vercel.app/)

</div>

---

<div align="center">
  <img src="images/AppPortfolio.gif" alt="AWJ Platform Preview" width="97%"/>
</div>

<p align="center">
  <img src="images/SaudiEventsMac1.png" alt="Lab Screenshot 1" width="32%"/>
  <img src="images/SaudiEventsphones.png" alt="Lab Screenshot 2" width="32%"/>
  <img src="images/SaudiEventsMac2.png" alt="Lab Screenshot 3" width="32%"/>
</p>

---

## 📌 About The Project

Saudi Arabia is entering a landmark decade, hosting some of the world's largest events including **Expo 2030**, **FIFA World Cup 2034**, the **Esports World Cup**, **Formula E & F1**, **Riyadh Season**, and more. Ensuring infrastructure readiness at this scale demands data-driven capacity planning.

The **National Observatory for Major Events Readiness** addresses this need through a centralized dashboard that:

- Tracks daily facility capacity against projected local and international visitor volumes
- Identifies **capacity gaps (deficit)** and **excess capacity (surplus)** across all infrastructure types
- Enables planners to run **"What-if?" scenario simulations** with real-time chart updates
- Covers every day from 2030 to 2034, mapped against all active events and seasons

---

### ✨ Key Features

| Feature | Description |
|:--|:--|
| **Daily Capacity Gap Analysis** | Compares targeted visitor numbers (local + international) against facility capacity, computing deficit or surplus per day |
| **What-If? Scenario Tool** | Adjust facility capacity or visitor volumes and see all KPIs and charts update instantly |
| **Event Timeline Mapping** | Every day is automatically tagged to its active events (Expo 2030, World Cup 2034, Formula E/F1, Riyadh Season, Soundstorm, FII, Esports World Cup, and more) |
| **Extreme Period Detection** | Automatically identifies the longest consecutive peak deficit or surplus period |

---

## 🏆 Coverage & Scope

| Dimension | Details |
|:--|:--|
| **Time Horizon** | 2030 – 2034 (daily granularity) |
| **Facilities Breakdown** | Sports Stadiums · Theaters · Conference Centers · Entertainment Zones · Seasonal Squares |
| **Visitor Breakdown** | Local visitors · International visitors |
| **Analysis Type** | Capacity deficit · Capacity surplus · Coverage % · Scenario simulation |

---

## 🛠️ Built With

<p align="center">
  <img src="https://img.shields.io/badge/React.js-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript"/>
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS"/>
  <img src="https://img.shields.io/badge/Recharts-22c55e?style=for-the-badge" alt="Recharts"/>
  <img src="https://img.shields.io/badge/SheetJS-217346?style=for-the-badge" alt="SheetJS"/>
</p>

| Layer | Technology | Role |
|:--|:--|:--|
| **Frontend** | React.js, JavaScript, CSS | RTL dashboard UI, KPI cards, interactive filters |
| **Data Visualization** | Recharts | Composed charts, bar charts, pie charts, radial bar charts, reference areas |
| **Data Loading** | Fetch API + parallel year files | Split JSON files loaded in parallel for performance |
| **Export** | SheetJS (xlsx) | One-click Excel export of full dataset |
| **Icons** | React Icons (Fi + Md + Fa) | Dashboard icons across all UI components |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Frontend (React.js)                      │
│   Landing Page · Capacity Dashboard · What-If? Simulator     │
└──────────────────────────┬───────────────────────────────────┘
                           │
           ┌───────────────▼───────────────┐
           │         Analysis Engine       │
           │  ┌────────────────────────┐   │
           │  │  Deficit / Surplus     │   │
           │  │  Gap Calculator        │   │
           │  └────────────────────────┘   │
           │  ┌────────────────────────┐   │
           │  │  Extreme Period        │   │
           │  │  Detector              │   │
           │  └────────────────────────┘   │
           │  ┌────────────────────────┐   │
           │  │  Event Timeline        │   │
           │  │  Mapper (2030–2034)    │   │
           │  └────────────────────────┘   │
           └───────────────┬───────────────┘
                           │
          ┌────────────────▼────────────────┐
          │           Data Layer            │
          │        Multi 'json' files       │
          │       simulated/dummy data      │
          └─────────────────────────────────┘
```

---

<div align="center">
<img src="https://img.shields.io/badge/+5-Technologies-61DAFB?style=flat-square&labelColor=1a1a2e" alt="Technologies"/>
&nbsp;
<img src="https://img.shields.io/badge/1825-Days_Analyzed-E8912D?style=flat-square&labelColor=1a1a2e" alt="Days"/>
&nbsp;
<img src="https://img.shields.io/badge/2030–2034-Strategic_Horizon-16a34a?style=flat-square&labelColor=1a1a2e" alt="Horizon"/>
&nbsp;
<img src="https://img.shields.io/badge/10+-Major_Events-7c3aed?style=flat-square&labelColor=1a1a2e" alt="Events"/>
</div>
