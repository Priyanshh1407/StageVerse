# ⚡ StageVerse

### *Bridging Live Event Production and Systems Engineering*

StageVerse is a full-stack web ecosystem designed to eliminate technical overhead, signal collisions, and communication gaps in large-scale concert production. By integrating full-stack web architecture with live entertainment protocols, StageVerse acts as a centralized brain for technical directors, systems engineers, and front-of-house (FOH) crews during high-pressure load-ins and live executions.

[Live Demo Link](https://stage-verse.vercel.app/) | [LinkedIn](https://www.linkedin.com/in/priyansh-waghela-3b754b282/)

---

## 🛠️ Core Engineering Features

### 1. Unified Patch Studio & Algorithmic Collision Detection
Manually assigning DMX addresses across thousands of high-parameter moving heads introduces human error that can stall a stadium-level load-in.
* **The Tech:** Implemented a continuous memory-allocation mapping algorithm that tracks data across 512-channel boundaries (DMX Universes). 
* **The Logic:** When a fixture profile (e.g., a 34-channel hybrid moving head) is assigned to a specific start address, the system runs an array overlap/intersection check to flag channel overlaps or footprint breaches in real-time before data is written to the database.

### 2. GrandMA3 Native XML Export Engine
Bridges the gap between pre-production software and industry-standard lighting consoles.
* **The Tech:** Built a custom data-serialization module using tree-parsing structures (`xmlbuilder` / dynamic string formatting).
* **The Logic:** Converts JSON documents representing the stage layout and network architecture directly into an asset format fully compatible with the `.xml` patch structure utilized by grandMA3 lighting consoles. Technicians can import this file directly into native console environments (`grandMA3 onPC`) to achieve instant console configuration.

### 3. Real-Time FOH-to-Backstage Sync Engine
Live event environments change rapidly; if an instrument fails or changes position, the backstage crew and the FOH engineer must stay in lockstep.
* **The Tech:** Developed a persistent bi-directional communications layer utilizing WebSockets (Socket.io).
* **The Logic:** State mutations triggered inside the organizer's dashboard or the FOH patching studio are instantly broadcasted with sub-100ms latency to all connected staging clients, preventing out-of-sync instrumentation logs.

---

## 🚀 Tech Stack & System Architecture

StageVerse is engineered with highly scalable, non-blocking asynchronous technologies to ensure stability under operational load.

* **Frontend:** Next.js / React.js (Structured with atomic design patterns, customized with a dark/neon cyberpunk UI optimized for low-light FOH conditions).
* **Backend:** Node.js & Express.js (Asynchronous REST API architecture optimized for fast I/O throughput).
* **Database:** MongoDB (Flexible, document-based NoSQL schema modeled to dynamically scale depending on shifting fixture parameter layers).
* **Real-Time Layer:** Socket.io (State-synchronization over persistent TCP connections).

### Database Schema Concept (Relational Integrity in NoSQL)
