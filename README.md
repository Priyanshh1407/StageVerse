# ⚡ StageVerse

### *Bridging Live Event Production and Systems Engineering*

StageVerse is a full-stack web ecosystem engineered to eliminate technical overhead, signal collisions, and communication gaps in large-scale concert production. By integrating advanced web architecture with live entertainment protocols, StageVerse acts as a centralized data brain for technical directors, systems engineers, and front-of-house (FOH) crews during high-pressure arena load-ins and live tour executions.

[Live Demo Link](https://stage-verse.vercel.app/) | [LinkedIn](https://www.linkedin.com/in/priyansh-waghela-3b754b282/)

---

## 🛠️ Core Engineering Features

### 1. Unified Patch Studio & Algorithmic Collision Detection
Manually assigning DMX addresses across thousands of high-parameter moving heads introduces severe human error that can stall a stadium-level load-in.
* **The Tech:** Implemented a continuous memory-allocation mapping algorithm that tracks data parameters across 512-channel boundaries (DMX Universes). 
* **The Logic:** When a fixture profile (e.g., a 34-channel hybrid moving head) is assigned to a specific start address, the backend runs an array overlap/intersection check to flag channel conflicts or footprint breaches in real-time before data is written to the database.

### 2. GrandMA3 Native XML Export Engine
Bridges the gap between modern web pre-production tools and industry-standard physical lighting consoles.
* **The Tech:** Built a custom data-serialization module using tree-parsing structures (`xmlbuilder` / dynamic string formatting).
* **The Logic:** Converts JSON documents representing the stage layout and network architecture directly into an asset format fully compatible with the `.xml` patch structure utilized by grandMA3 lighting consoles. Technicians can import this file directly into native console environments (`grandMA3 onPC`) to achieve instant hardware configuration.

### 3. Real-Time FOH-to-Backstage Sync Engine
Live event environments change rapidly; if an instrument fails or changes position, the backstage crew and the FOH engineer must stay in lockstep.
* **The Tech:** Developed a persistent bi-directional communications layer utilizing WebSockets (Socket.io).
* **The Logic:** State mutations triggered inside the organizer's dashboard or the FOH patching studio are instantly broadcasted with sub-100ms latency to all connected staging clients, preventing out-of-sync instrumentation logs.

---

## 🚀 Tech Stack & System Architecture

StageVerse is engineered with highly scalable, non-blocking asynchronous technologies to ensure stability under high operational concurrent load.

* **Frontend:** Next.js / React.js (Structured with atomic design patterns, customized with a dark/neon cyberpunk UI optimized for low-light FOH conditions).
* **Backend:** Node.js & Express.js (Asynchronous REST API architecture optimized for fast I/O throughput).
* **Database:** MongoDB (Flexible, document-based NoSQL schema modeled to dynamically scale depending on shifting fixture parameter layers).
* **Real-Time Layer:** Socket.io (State-synchronization over persistent TCP connections).

### Database Schema Concept (Relational Integrity in NoSQL)
```
[Festival/Show] ── (1:N) ──> [Staging Zones] ── (1:N) ──> [DMX Universes] ── (1:N) ──> [Fixture Instances]
```

---

## 🌐 Theoretical Application: IT Networking Meets Live Entertainment

StageVerse is engineered with advanced IT networking fundamentals that map directly onto the architecture of modern touring rigs:
* **Protocol Alignment:** Architected to complement network entertainment distributions such as **Art-Net** and **sACN** (Streaming ACN) by grouping patch data inside matching UDP packet structures.
* **Subnet & VLAN Architecture:** Designed with logical segmentations that match network segregation methodologies used on managed corporate switches to separate lighting data, audio protocols, and video broadcast feeds.

---

## ⚙️ Installation & Local Setup

Follow these steps to clone and spin up the development environment locally.

### Prerequisites
* Node.js (v16.x or higher)
* MongoDB (Local instance or Atlas URI Cluster)

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR_GITHUB_USERNAME/stageverse.git](https://github.com/YOUR_GITHUB_USERNAME/stageverse.git)
cd stageverse
```

### 2. Install Dependencies
```bash
# Install root/backend dependencies
npm install

# Navigate to client and install frontend dependencies
cd client
npm install
cd ..
```

### 3. Environment Variables Configuration
Create a `.env` file in the root directory and append the following variables:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_json_web_token_secret
```

### 4. Run the Application
```bash
# Run both the Backend server and Next.js client concurrently
npm run dev
```
The application will launch locally on `http://localhost:3000`.

---

## 🗺️ Product Roadmap

- [x] High-performance DMX calculation engine and overlapping channel validation.
- [x] GrandMA3 operational syntax translation and XML file creation.
- [ ] Integration of an Art-Net packet simulator module to visualize data transmission directly inside the browser.
- [ ] RDM (Remote Device Management) telemetry tracking integration to simulate automated asset monitoring.

---

## ⚖️ License & Contact

Developed by **Priyansh Waghela**  
Information Technology Engineering Student at Dwarkadas J. Sanghvi College of Engineering (DJSCE), Mumbai.

*For software architecture inquiries, placement collaborations, or professional outreach, please connect via **[LinkedIn](https://www.linkedin.com/in/priyansh-waghela-3b754b282/)** or view my complete repository matrix on **[GitHub](https://github.com/YOUR_GITHUB_USERNAME)**.*
