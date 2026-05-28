# ASSA — Smart Fisheries Monitoring and Digital Fish Market System

## Product Requirements Document — Version 2.0 (Production-Ready)

---

| Field            | Value                                           |
| ---------------- | ----------------------------------------------- |
| Document Version | 2.0                                             |
| Status           | Approved for Development                        |
| Date             | May 2024                                        |
| Prepared By      | ASSA Product Team                               |
| Reviewed By      | Ministry of Fisheries Ethiopia (Concept Review) |
| Classification   | Internal — Development Use                      |
| Built For        | Cursor / AI-Assisted Development                |

---

> **A note on this document's purpose:**
> This PRD is written to production standard. It covers every dimension a real engineering team, government client, and product organization would need before committing to build. It is also written as a direct instruction set for AI-assisted development tools (Cursor, Windsurf). Every section is precise enough to generate implementation from.

---

## TABLE OF CONTENTS

**Part I — Strategy**

1. Executive Summary
2. Problem Statement
3. Market Research & Validation
4. Product Vision & Strategy
5. Business Model
6. Return on Investment
7. Regulatory & Legal Context

**Part II — Product**

8. Project Goals & OKRs
9. Stakeholders & Sign-off Matrix
10. Target Users
11. User Personas
12. The Three System Modules
13. User Roles & Permissions
14. Scope Definition
15. Functional Requirements
16. User Stories
17. User Flows
18. Use Cases
19. Business Rules
20. Overfishing Control Logic
21. Verification & Compliance Logic

**Part III — Design**

22. Design System & UI/UX Standards
23. Admin Dashboard — Detailed UI Requirements
24. Fisher App — Detailed UI Requirements
25. Marketplace — Detailed UI Requirements
26. Accessibility Requirements (WCAG 2.1 AA)
27. Internationalization & Localization

**Part IV — Engineering**

28. Confirmed Tech Stack
29. System Architecture
30. Infrastructure & Deployment Architecture
31. Real-Time Architecture (SSE)
32. Database Design (PostgreSQL)
33. File Storage Architecture
34. Caching Strategy (Redis)
35. API Design (v1 — Full Contract)
36. Error Handling & Logging
37. Interconnection Flows

**Part V — Security & Compliance**

38. Threat Model (STRIDE)
39. Authentication & Authorization Architecture
40. OWASP Top 10 Compliance
41. Data Privacy & Compliance (Ethiopia PDPP 2024)
42. Data Retention Policy

**Part VI — Quality & Operations**

43. Testing Strategy
44. Performance & Scalability Requirements
45. Disaster Recovery & Business Continuity
46. Service Level Agreement (SLA)
47. Operational Runbook
48. Onboarding & Training Plan
49. Change Management

**Part VII — Delivery**

50. Non-Functional Requirements
51. Risks & Mitigations
52. Assumptions
53. MVP Delivery Plan
54. Future Roadmap
55. Success Metrics / KPIs

**Appendices**

- A: Fish Species Reference
- B: Fishing Zone Reference (Lake Tana)
- C: Price Reference (ETB/kg 2024)
- D: Seed Data Specification
- E: Environment Variables Reference
- F: Project Folder Structure

---

# PART I — STRATEGY

---

## 1. EXECUTIVE SUMMARY

ASSA (Aquatic Sustainability and Supply Administration) is a three-module digital platform designed to modernize fisheries management in Ethiopia. The system creates a complete, verifiable digital chain from the moment a fisher catches fish on Lake Tana to the moment a buyer purchases it in a market — with government oversight at every step.

The three modules are:

- **ASSA Fisher App** — A mobile-first Progressive Web App (PWA) for licensed fishers to submit daily catch reports for government verification.
- **ASSA Admin Dashboard** — A government-facing analytics and control platform for the Ministry of Fisheries to review, approve, and monitor all catch activity.
- **ASSA Fish Market** — A consumer marketplace where only government-verified catches are listed and sold.

The modules share a single PostgreSQL database and communicate through a Node.js/Express API. Real-time state propagation is implemented using Server-Sent Events (SSE), ensuring that an action in one module produces a visible, immediate effect in the others — without requiring page refreshes or manual polling.

The platform addresses three systemic failures in Ethiopia's current fisheries sector: invisible catch reporting, absent traceability, and disconnected ecosystem actors. If deployed nationally, ASSA is projected to reduce illegal fishing by 35–50%, increase fisher income by enabling direct-to-market access, and provide the Ministry of Fisheries with the first real-time digital picture of national catch activity.

**Scope of this document:** Full production specification for the MVP release (V1.0), covering product strategy, functional requirements, data model, API contract, security architecture, infrastructure, compliance, testing, and delivery plan.

---

## 2. PROBLEM STATEMENT

### 2.1 Context

Ethiopia has approximately 7,300 km² of inland water bodies, with Lake Tana (3,600 km²) being the largest. The lake supports an estimated 40,000–60,000 people directly or indirectly through fishing. The national fisheries sector contributes approximately ETB 3.2 billion annually to the economy, yet it operates almost entirely without digital infrastructure.

### 2.2 The Three Core Problems

**Problem 1 — No Digital Catch Reporting (Invisibility)**

Current state: Fishers report catches on paper forms, which are collected periodically by regional fisheries officers. Compliance is estimated at less than 20% based on Ministry of Fisheries surveys. The majority of catches are never recorded. This means:

- The government has no real picture of how much fish is being taken from the lake
- Quota limits cannot be enforced because they cannot be measured
- Overfishing goes undetected until ecological damage has occurred

Evidence: A 2022 study by the Ethiopian Institute of Agricultural Research found that tilapia populations in Lake Tana's north zone had declined by approximately 27% over a five-year period, with illegal and unreported fishing cited as the primary cause.

**Problem 2 — No Traceability (Market Opacity)**

Current state: Fish sold in markets — from roadside stalls in Bahir Dar to hotels across Amhara — has no verifiable origin. Buyers cannot know:

- Whether the fish was caught legally by a licensed fisher
- Whether it came from a sustainable zone or a breeding ground
- When it was caught (freshness verification)
- Who caught it (accountability)

This market opacity means sustainable fishers receive no price premium for legal, traceable fish. There is no economic incentive to comply with regulations, because the market does not reward compliance.

**Problem 3 — Disconnected Actors (Ecosystem Fragmentation)**

Current state: Government fisheries offices, licensed fishers, and fish markets operate in separate, non-communicating silos:

- A government restriction on a fishing zone has no automatic effect on what appears in markets
- A fisher's compliance record has no bearing on their market access
- Market price signals do not reach government quota-setters
- A fisher's approval status provides no benefit in the market

The result is that each actor optimizes individually, and the system as a whole degrades.

### 2.3 Problem Statement Summary

> Ethiopia's inland fisheries sector is ecologically at risk and economically underperforming because there is no digital infrastructure connecting the fisher, the government, and the market. Every fish caught exists in a data black hole from the moment it leaves the water until it is consumed.

---

## 3. MARKET RESEARCH & VALIDATION

### 3.1 Quantitative Context

| Metric                               | Value                | Source                                       |
| ------------------------------------ | -------------------- | -------------------------------------------- |
| Licensed fishers in Amhara Region    | ~8,400               | Amhara Regional Fisheries Bureau, 2023       |
| Registered boats, Lake Tana          | ~4,200               | Bahir Dar City Administration, 2023          |
| Annual fish production, Lake Tana    | ~8,000–12,000 tonnes | FAO Ethiopia Country Profile, 2022           |
| Estimated unreported catches         | 60–80% of total      | Ethiopian Institute of Agricultural Research |
| Fish-dependent households, Lake Tana | ~12,000              | World Bank Ethiopia Rural Survey, 2021       |
| Avg fisher income (ETB/month)        | ETB 3,200–4,800      | Field estimate, Bahir Dar area               |
| Fish market price, Tilapia (ETB/kg)  | ETB 120–180          | Bahir Dar market survey, 2023                |

### 3.2 Comparable Systems

| Country    | System                                | Relevance                                                                |
| ---------- | ------------------------------------- | ------------------------------------------------------------------------ |
| Kenya      | iFish Kenya (digital catch reporting) | Successful adoption among Lake Victoria fishers                          |
| Tanzania   | MACEMP Digital Monitoring             | Government-funded, quota-based system                                    |
| Nigeria    | FishMonger (marketplace)              | B2B fish trading platform, not government-linked                         |
| Indonesia  | eFishery                              | Aquaculture-focused, strong IoT component — too complex for this context |
| Bangladesh | MFS Fisheries Platform                | Government compliance system, paper-to-digital transition                |

**Key learning from comparables:** Systems that combine compliance (government approval) with economic incentive (market access) achieve significantly higher adoption than pure compliance systems. The ASSA model — where government approval unlocks market listing — directly applies this learning.

### 3.3 Validation Assumptions

_Note: The following represents the validation research that would be conducted before V1.0 launch. For the development MVP, these are treated as validated assumptions based on comparable research._

- Fisher smartphone ownership in Amhara urban/peri-urban areas: estimated 55–65% (Android, entry-level)
- Fisher literacy rate (Amharic): estimated 72% in target zones
- Government appetite for digital fisheries tools: HIGH — Amhara Regional Fisheries Bureau has issued two tenders for digital monitoring tools in 2022 and 2023, both unfulfilled
- Buyer willingness to pay premium for verified fish: estimated 10–20% premium accepted based on comparable markets in East Africa

---

## 4. PRODUCT VISION & STRATEGY

### 4.1 Vision Statement

> "Every fish that reaches an Ethiopian market should have a verified digital identity — caught legally, approved by government, and sold transparently. ASSA makes this possible."

### 4.2 Mission

To build the digital infrastructure layer between Ethiopia's fishers, government, and markets — making legal fishing economically attractive, enforcement data-driven, and fish purchasing trustworthy.

### 4.3 Strategic Positioning

ASSA is not a fish-selling startup. It is a **government compliance infrastructure platform with a marketplace layer**. The government component is the core; the marketplace is the economic incentive that drives fisher adoption of the compliance system.

```
Without ASSA:                    With ASSA:
Fisher → [invisible] → Market    Fisher → Submit → Admin Verify → Market
                                                         ↕
                                                  Quota Monitoring
                                                  Zone Enforcement
                                                  Compliance Records
```

### 4.4 Product Principles

1. **Compliance must have economic reward** — If fishers gain no benefit from submitting catches, they won't. Every approval must unlock something valuable (market listing, verified badge, certificate).

2. **The government module is the brain** — All data flows through admin approval. No catch enters the market without it. This is the enforcement mechanism.

3. **Simplicity is a feature** — The fisher submitting at 5 AM on a moving boat cannot deal with complexity. Every Fisher App interaction must be completable in under 3 minutes.

4. **Trust is the product** — What ASSA sells to buyers is not fish. It is certainty. Every listing is legally verified. This is the brand.

5. **Cause → effect must be visible** — Every action in the system must have a traceable, observable consequence in at least one other part. Invisible systems are not trusted systems.

---

## 5. BUSINESS MODEL

### 5.1 Revenue Model (Phase 1 — Government-Funded)

**Primary Revenue: Government Contract / Grant**

- ASSA V1 is positioned as a government digital public good, funded by the Ministry of Fisheries, Ethiopia, or through a development organization grant (World Bank, FAO, GIZ).
- Estimated annual maintenance contract: ETB 2.8–4.2 million (equivalent to $50,000–$75,000 USD)
- Justification: The system replaces manual fisheries officers doing paper-based monitoring — one officer handles ~200 fishers manually. ASSA handles the entire registered fisher base digitally.

**Secondary Revenue: Transaction Fee (Phase 2)**

- 1.5% transaction fee on marketplace orders
- At 8,000 tonnes of verified annual catch × avg ETB 140/kg = ETB 1.12 billion in marketplace value
- 1.5% of ETB 1.12 billion = ETB 16.8 million/year at full scale
- Phase 2 only — no transaction fees in V1 or V2

**Tertiary Revenue: Data & Reports (Phase 3)**

- Aggregated, anonymized catch data sold to research institutions (FAO, CGIAR, universities)
- Ministry annual reporting package (automated PDF exports, compliance dashboards)

### 5.2 Cost Structure

| Cost Item                                 | Type        | Estimated (Annual) |
| ----------------------------------------- | ----------- | ------------------ |
| Cloud infrastructure (AWS/GCP)            | Operational | ETB 280,000        |
| Backend developer (1 FTE)                 | Personnel   | ETB 600,000        |
| Frontend developer (1 FTE)                | Personnel   | ETB 540,000        |
| DevOps / system admin (0.5 FTE)           | Personnel   | ETB 240,000        |
| User support staff (1 FTE)                | Personnel   | ETB 360,000        |
| SMS notification costs (Africa's Talking) | Operational | ETB 85,000         |
| Cloudinary file storage                   | Operational | ETB 42,000         |
| Total Year 1                              |             | ~ETB 2.15 million  |

### 5.3 Break-Even Analysis

Government contract at ETB 2.8 million covers Year 1 costs (ETB 2.15M) with a margin. System is sustainable from Year 1 under the government contract model without requiring transaction revenue.

---

## 6. RETURN ON INVESTMENT

### 6.1 Government ROI

| Benefit                                               | Quantified Value                            |
| ----------------------------------------------------- | ------------------------------------------- |
| Replacement of 4 manual data collection officers      | ETB 1.44M/year saved                        |
| Reduction in illegal fishing (est. 35%)               | ETB 392M/year in protected ecological value |
| Increased tax revenue from traceable transactions     | ETB 28M/year incremental                    |
| Reduced enforcement cost (data-driven zone targeting) | ETB 180M/year in patrol efficiency          |

### 6.2 Fisher ROI

- Access to wider buyer base (market beyond local village)
- 10–20% price premium for "Verified Fisher" badge
- Digital catch record = formal employment history = access to microfinance
- Reduced harassment from inspectors (digital license = instant verification)

### 6.3 Buyer ROI

- Verified freshness and source = reduced food safety risk
- Price transparency across listings = fairer market
- Traceability supports premium product positioning for hotels and restaurants

---

## 7. REGULATORY & LEGAL CONTEXT

### 7.1 Governing Laws

| Law                                                       | Relevance                                                                  |
| --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Fisheries and Aquatic Resources Proclamation No. 315/2003 | Establishes licensing, quota, and zone authority for Ministry of Fisheries |
| Amhara National Regional State Fisheries Regulation       | Regional enforcement authority over Lake Tana                              |
| Environmental Protection Proclamation No. 300/2002        | Environmental impact obligations                                           |
| Computer Crime Proclamation No. 958/2016                  | Governs digital fraud, unauthorized access                                 |
| **Personal Data Protection Proclamation No. 1321/2024**   | **CRITICAL — governs all personal data handling in ASSA**                  |
| Financial Administration Proclamation                     | Governs any transaction-related revenue handling                           |

### 7.2 PDPP 2024 — Key Requirements for ASSA

Ethiopia's Personal Data Protection Proclamation (2024) imposes the following obligations that directly affect ASSA's design:

| Requirement                 | ASSA Implementation                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Lawful basis for processing | Government mandate (compliance system) + explicit consent at registration                              |
| Data minimization           | Collect only: name, license, location, catch data. No unnecessary fields.                              |
| Purpose limitation          | Catch data used only for fisheries management. Not sold or used for other purposes.                    |
| Right of access             | Fishers can view all their personal data via Profile page                                              |
| Right to erasure            | Fisher can request account deletion; catch records retained for regulatory purposes (5 years)          |
| Data breach notification    | Must notify Ethiopian Data Protection Authority within 72 hours of a breach                            |
| Data localization           | All personal data must be stored on servers physically located in Ethiopia or authorized jurisdictions |
| Consent for marketing       | No marketing use of any data without separate, explicit consent                                        |
| Third-party sharing         | No fisher data shared with marketplace buyers beyond: first name, verified badge, catch date           |

### 7.3 Intellectual Property

All source code, database schemas, and documentation produced for ASSA are the property of the commissioning government body (Ministry of Fisheries, Ethiopia) under a work-for-hire agreement. The project team retains no commercial rights to the platform. Open-source components retain their respective licenses.

---

# PART II — PRODUCT

---

## 8. PROJECT GOALS & OKRs

### 8.1 V1.0 Launch OKRs (6-Month Post-Launch)

**Objective 1: Achieve meaningful fisher adoption in the Lake Tana pilot zone**

- KR1.1: 500+ active fishers registered within 60 days of launch
- KR1.2: 70%+ of registered fishers submit at least 1 catch per week
- KR1.3: Average catch submission time under 4 minutes

**Objective 2: Demonstrate government value through operational efficiency**

- KR2.1: Admin processes 90%+ of pending submissions within 4 hours
- KR2.2: Zero quota overruns for any species in the first 3 months (alerts working)
- KR2.3: Admin dashboard is used daily by at least 3 ministry officers

**Objective 3: Activate the marketplace with verified supply**

- KR3.1: 50+ active marketplace listings at any given time
- KR3.2: 200+ marketplace orders placed in first 3 months
- KR3.3: Average listing-to-first-order time under 24 hours

**Objective 4: Achieve system reliability**

- KR4.1: 99.5% uptime in first 6 months
- KR4.2: Zero data loss incidents
- KR4.3: API p95 response time under 400ms

### 8.2 Engineering Goals (MVP Build)

| Goal                               | Metric                                               |
| ---------------------------------- | ---------------------------------------------------- |
| Three fully interconnected modules | All 5 cross-module flows operational                 |
| Real-time state propagation        | SSE delivers state changes in < 2 seconds            |
| Production-grade auth              | JWT + refresh tokens + HttpOnly cookies              |
| Data integrity                     | All DB operations in transactions; no partial states |
| Seed data quality                  | Demo database feels operational on first load        |

---

## 9. STAKEHOLDERS & SIGN-OFF MATRIX

| Stakeholder                        | Organization                    | Role              | Sign-off Required            |
| ---------------------------------- | ------------------------------- | ----------------- | ---------------------------- |
| Director General                   | Ministry of Fisheries, Ethiopia | Executive Sponsor | Product vision, scope        |
| Head of Digital Systems            | Ministry of Fisheries           | Technical Owner   | Architecture, security       |
| Amhara Regional Fisheries Director | Regional Bureau                 | Operational Owner | Fisher workflows, zone rules |
| Legal Counsel                      | Ministry of Justice             | Compliance        | PDPP compliance, data policy |
| IT Security Officer                | Ministry of ICT                 | Security          | Threat model, auth design    |
| Project Lead (Intern Team)         | ASSA Project                    | Development Lead  | All technical decisions      |
| Lead Fisher Representative         | Lake Tana Cooperative           | User Advocate     | Fisher App UX approval       |

---

## 10. TARGET USERS

### 10.1 Fisher App — Primary Users

- Licensed fishers registered with Amhara Regional Fisheries Bureau
- Age range: 25–65 (median ~38)
- Education: Primary to secondary level
- Device: Entry-level Android smartphones (Samsung A-series, Tecno, Infinix); screen size 5.5–6.5"
- Connectivity: 3G in most zones; intermittent in remote north-zone areas; WiFi unavailable on water
- Language: Amharic primary; some Amharic-English literacy
- Usage time: Typically between 05:00–08:00 AM (after morning catch) and 17:00–19:00 PM
- Tech behavior: WhatsApp users; comfortable with dropdown forms; unfamiliar with multi-step processes
- Critical constraint: Cannot use the app for more than 3–4 minutes before needing to attend to work

### 10.2 Admin Dashboard — Primary Users

- Government fisheries officers at Ministry of Fisheries and Amhara Regional Bureau
- Age range: 30–55
- Education: University degree (agriculture, biology, public administration)
- Device: Desktop computer or laptop; Windows 10/11; Chrome browser
- Connectivity: Reliable broadband in office environment
- Language: Amharic and English
- Usage pattern: Full workday access; analytics reviewed in morning; submissions processed throughout day
- Key behavior: Used to spreadsheet-based reporting; resistant to change unless system is faster and clearer than existing process

### 10.3 Marketplace — Primary Users

- Restaurant and hotel procurement managers in Bahir Dar and nearby towns
- Individual household buyers in urban Amhara
- Fish wholesalers and market resellers
- Age range: 22–55
- Device: Mix of desktop (restaurants) and mobile (individual buyers)
- Language: Amharic primary; some English for business users
- Key motivation: Freshness, reliability, traceability, price transparency

---

## 11. USER PERSONAS

### Persona 1 — Tesfaye Alemu, The Licensed Fisher

| Attribute           | Detail                                                                             |
| ------------------- | ---------------------------------------------------------------------------------- |
| Age                 | 38                                                                                 |
| Location            | Gorgora, North Gondar                                                              |
| Household           | Married, 4 children                                                                |
| Fishing experience  | 16 years on Lake Tana                                                              |
| License             | FSH-2024-00125, valid until Dec 2024                                               |
| Boat                | "Tana Star," 8-meter wooden boat                                                   |
| Monthly income      | ETB 3,800–5,200 (varies by season)                                                 |
| Smartphone          | Tecno Spark 8, Android 11, 32GB                                                    |
| Data plan           | ETB 25 weekly data bundle (300MB)                                                  |
| Biggest frustration | "I fish legally, but I get the same price as fishers who fish anywhere they want." |
| ASSA motivation     | Legal recognition, market access, better price for verified catch                  |
| Key concern         | "Will this take too long? I have fish to sell."                                    |

**Journey before ASSA:** Tesfaye catches 30 kg of Tilapia at dawn. He carries it to the Gorgora roadside market and sells it at ETB 130/kg to a wholesaler, who resells it at ETB 160/kg. No record exists. No premium for his legal status.

**Journey with ASSA:** Tesfaye submits his catch on the app in 3 minutes while his boat is still on the water. By the time he reaches shore, the admin has approved it and his catch is listed in the ASSA marketplace at ETB 145/kg — visible to Bahir Dar restaurants. A hotel buyer orders 15 kg at ETB 155/kg. Tesfaye earns ETB 300 more that morning.

---

### Persona 2 — Ato Dawit Bekele, The Government Admin

| Attribute       | Detail                                                                        |
| --------------- | ----------------------------------------------------------------------------- |
| Age             | 47                                                                            |
| Title           | Senior Fisheries Compliance Officer                                           |
| Organization    | Ministry of Fisheries, Amhara Regional Bureau                                 |
| Location        | Bahir Dar                                                                     |
| Responsibility  | Reviews catch submissions, manages quotas, generates monthly ministry reports |
| Device          | Dell laptop, Windows 11, Chrome 122                                           |
| Current tools   | Excel spreadsheets, paper forms, occasional phone calls with field officers   |
| Frustration     | "By the time I get the paper reports, it's too late to act on anything."      |
| ASSA motivation | Real-time visibility, automated quota tracking, defensible compliance records |

**Day before ASSA:** Dawit receives 200+ paper forms weekly. He manually enters data into Excel, discovers that Tilapia quota was exceeded 3 weeks ago, and has no way to retroactively enforce anything.

**Day with ASSA:** At 8:00 AM, Dawit opens his dashboard. He sees 12 pending submissions from the last hour. He reviews and approves 10, rejects 2 (one from a prohibited zone, one with missing photos). He sees the Tilapia quota bar is at 78% and notes it on his morning report. All of this takes 25 minutes instead of 3 hours.

---

### Persona 3 — Mesfin Hailu, The Restaurant Buyer

| Attribute                  | Detail                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Age                        | 34                                                                                          |
| Occupation                 | Owner/Manager, Blue Nile Restaurant, Bahir Dar                                              |
| Weekly fish purchase       | ~60–80 kg, 3 species                                                                        |
| Current problem            | Unreliable supply; no way to pre-order; uncertain quality                                   |
| Device                     | iPhone 13 (personal), Windows laptop (business)                                             |
| ASSA motivation            | Reliable supply from verified sources; ability to pre-order; traceability for menu labeling |
| Willingness to pay premium | Up to 15% for guaranteed freshness and legal source verification                            |

---

### Persona 4 — Hirut Tadesse, The Fisheries Field Officer

| Attribute      | Detail                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Age            | 29                                                                                             |
| Role           | Zone compliance officer, Lake Tana North Zone                                                  |
| Responsibility | Physical inspections, license checks, zone monitoring                                          |
| Device         | Android phone (government-issued), field laptop                                                |
| ASSA use       | Uses Admin Dashboard mobile view for field checks; verifies fisher licenses during inspections |
| Need           | Quick lookup of any fisher's license status and recent submissions by phone                    |

---

## 12. THE THREE SYSTEM MODULES

### Visual Identity Specification

| Attribute         | Fisher App                | Admin Dashboard           | Marketplace                    |
| ----------------- | ------------------------- | ------------------------- | ------------------------------ |
| Primary Color     | #1A3B6E (Deep Navy)       | #0F2137 (Dark Navy)       | #1A7A4A (Forest Green)         |
| Accent Color      | #3B82F6 (Blue)            | #3B82F6 (Blue)            | #22C55E (Green)                |
| Background        | #F8FAFF                   | #F1F5F9                   | #FFFFFF                        |
| Typography        | Inter, system-ui fallback | Inter, system-ui fallback | Inter, system-ui fallback      |
| Border Radius     | 12px (mobile-friendly)    | 8px (professional)        | 10px (consumer)                |
| Feel              | Practical, field-ready    | Analytical, authoritative | Fresh, trustworthy, commercial |
| Viewport Priority | Mobile (375px+)           | Desktop (1280px+)         | Desktop + Mobile (768px+)      |
| Dev Port          | 3002                      | 3001                      | 3003                           |

---

## 13. USER ROLES & PERMISSIONS

### Role Definitions

| Role            | Module          | Description                                                           |
| --------------- | --------------- | --------------------------------------------------------------------- |
| `fisher`        | Fisher App      | Licensed fisher; submits catches, views own data only                 |
| `admin`         | Admin Dashboard | Ministry officer; reviews and approves catches, views all data        |
| `super_admin`   | Admin Dashboard | Full system access; manages users, quotas, zones, system settings     |
| `buyer`         | Marketplace     | Registered buyer; browses, orders, views own orders                   |
| `guest`         | Marketplace     | Unauthenticated; browse-only, cannot order                            |
| `field_officer` | Admin (limited) | Regional officer; read-only dashboard, license lookup, cannot approve |

### Full Permission Matrix

| Permission              | fisher | admin | super_admin | buyer | field_officer |
| ----------------------- | ------ | ----- | ----------- | ----- | ------------- |
| Submit catch            | ✅     | ❌    | ❌          | ❌    | ❌            |
| View own catches        | ✅     | ❌    | ✅          | ❌    | ❌            |
| View all catches        | ❌     | ✅    | ✅          | ❌    | 👁 read-only  |
| Approve catch           | ❌     | ✅    | ✅          | ❌    | ❌            |
| Reject catch            | ❌     | ✅    | ✅          | ❌    | ❌            |
| View own notifications  | ✅     | ❌    | ❌          | ✅    | ❌            |
| Browse marketplace      | ✅     | ✅    | ✅          | ✅    | ✅            |
| Place marketplace order | ❌     | ❌    | ❌          | ✅    | ❌            |
| Manage quotas           | ❌     | ❌    | ✅          | ❌    | ❌            |
| Manage fishing zones    | ❌     | ❌    | ✅          | ❌    | ❌            |
| View all analytics      | ❌     | ✅    | ✅          | ❌    | 👁 read-only  |
| Manage users            | ❌     | ❌    | ✅          | ❌    | ❌            |
| View audit logs         | ❌     | ❌    | ✅          | ❌    | ❌            |
| Lookup fisher license   | ❌     | ✅    | ✅          | ❌    | ✅            |
| Export reports          | ❌     | ✅    | ✅          | ❌    | ❌            |

### Row-Level Security Rules

- An `admin` user assigned to **Amhara Region** can only see catches from zones within Amhara Region
- A `field_officer` can only look up fishers assigned to their zone
- A `fisher` can only see their own catch submissions, notifications, and profile data
- A `buyer` can only see their own order history — not other buyers' orders

---

## 14. SCOPE DEFINITION

### 14.1 V1.0 MVP — Must Be Built

**Fisher App**

- Login / logout with JWT auth
- Home screen (license status, today's summary, quick actions)
- 4-step catch submission wizard
- My Catches history with live status
- Notification panel (approval / rejection)
- Fishing Zones view (static map with zone overlays)
- Profile page (name, license, boat)

**Admin Dashboard**

- Login / logout
- Dashboard overview (KPIs, charts, quota bars, alerts)
- Daily Catches management page (list + filter + search)
- Catch detail view with Approve / Reject workflow
- Fishermen list page (read-only)
- Quotas & Rules page (view + edit quota limits)
- Alerts page (all alerts, mark as read)
- Users & Roles management (super_admin only)

**Marketplace**

- Home page (hero, featured listings, trust badges)
- Browse / filter page (category + filters)
- Listing detail page
- Order simulation flow (quantity → confirm → success)
- Right sidebar (market stats + activity feed)
- My Orders page
- Buyer registration / login

**Backend & Database**

- Full REST API (versioned: /api/v1)
- PostgreSQL schema with all tables
- Server-Sent Events for real-time module sync
- Authentication (JWT + refresh tokens + HttpOnly cookies)
- Business logic services (quota, notification, listing auto-creation)
- Seed data script (realistic, demo-ready)
- Redis for sessions, caching, SSE pub/sub
- Cloudinary for photo storage
- Winston structured logging
- Input validation (Zod)
- Docker Compose for local development

### 14.2 V2.0 — Planned Post-Launch

- Progressive Web App (PWA) with offline catch draft capability
- Amharic language UI (i18n)
- QR-code catch certificate (PDF generation)
- SMS notifications via Africa's Talking API
- Admin bulk approve/reject
- Fisher mobile number login (OTP-based)
- Advanced analytics (30/60/90-day trends, export CSV)
- Seller rating system in marketplace
- In-app fisher support chat (simulated with support ticket)

### 14.3 V3.0 — Future Roadmap

- Multi-region support (Lakes Ziway, Hawassa, Abijata-Shala)
- Real GPS integration (device location auto-fill)
- National ID verification integration
- Mobile money payment (Telebirr / CBE Birr)
- Real-time water quality data from environmental sensors
- AI-assisted catch anomaly detection
- Ministry annual report automation
- Public API for research institutions

### 14.4 Explicitly Out of Scope (V1.0)

- Real payment processing of any kind
- Live GPS / vessel tracking
- Push notifications to real mobile devices (Firebase)
- WhatsApp / Telegram bot integration
- Video catch verification
- Machine learning or AI features
- Multi-language support
- Social features (fisher profiles visible publicly)
- External API integrations (weather, government ID, etc.)
- Enterprise SSO / OAuth
- Kubernetes or containerized production deployment (V1 uses VPS + PM2)

---

## 15. FUNCTIONAL REQUIREMENTS

### 15.1 Authentication System (All Modules)

| ID      | Requirement                                                             | Priority  | Acceptance Criteria                                            |
| ------- | ----------------------------------------------------------------------- | --------- | -------------------------------------------------------------- |
| AUTH-01 | User can log in with email and password                                 | Must Have | Returns access token + refresh token; HttpOnly cookie set      |
| AUTH-02 | Access token expires after 15 minutes                                   | Must Have | After 15 min, API returns 401 on protected routes              |
| AUTH-03 | Refresh token extends session                                           | Must Have | /api/v1/auth/refresh returns new access token without re-login |
| AUTH-04 | Refresh token expires after 7 days                                      | Must Have | After 7 days, user is redirected to login                      |
| AUTH-05 | Logout clears tokens and cookies                                        | Must Have | POST /logout removes cookie; refresh token invalidated in DB   |
| AUTH-06 | Failed login attempt after 5 tries locks account for 15 minutes         | Must Have | 429 response; admin can manually unlock                        |
| AUTH-07 | All protected routes return 401 if no valid token                       | Must Have | Client redirects to login on 401                               |
| AUTH-08 | Role mismatch returns 403 Forbidden                                     | Must Have | Fisher cannot access admin endpoints                           |
| AUTH-09 | Password must be minimum 8 characters, contain 1 number and 1 uppercase | Must Have | Enforced at registration and password change                   |

### 15.2 Fisher App

| ID    | Requirement                                                       | Priority    | Acceptance Criteria                                                                                   |
| ----- | ----------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| FA-01 | Fisher sees license status on home screen                         | Must Have   | Card shows VALID/EXPIRED/SUSPENDED + expiry date                                                      |
| FA-02 | Expired license blocks catch submission                           | Must Have   | Submit button disabled; message shown: "Your license has expired. Contact the Ministry of Fisheries." |
| FA-03 | Fisher can submit catch via 4-step wizard                         | Must Have   | All steps complete → POST /api/v1/catches → success screen                                            |
| FA-04 | Step 1: Capture species, quantity, gear, date, time               | Must Have   | All required fields validated before Next                                                             |
| FA-05 | Species list is seeded from DB (not hardcoded)                    | Must Have   | GET /api/v1/species returns current list                                                              |
| FA-06 | Step 2: Fishing zone dropdown auto-fills GPS from zone definition | Must Have   | Zone selection → coordinates populated                                                                |
| FA-07 | Step 3: Upload 1–3 photos (JPEG/PNG, max 5MB each)                | Should Have | Photo previews shown; upload to Cloudinary                                                            |
| FA-08 | Step 4: Review shows all data with Edit and Submit buttons        | Must Have   | Submit → POST /api/v1/catches                                                                         |
| FA-09 | Catch submission returns unique reference ID                      | Must Have   | Format: CATCH-YYYY-MM-DD-XXXX (zero-padded sequence)                                                  |
| FA-10 | Success screen shows reference ID and "View My Catches" CTA       | Must Have   |                                                                                                       |
| FA-11 | My Catches shows all submissions sorted by date desc              | Must Have   | Status: Pending (orange), Approved (green), Rejected (red)                                            |
| FA-12 | Tapping a catch shows full detail + rejection reason if rejected  | Must Have   |                                                                                                       |
| FA-13 | Notification bell shows unread count badge                        | Must Have   | Badge updates when new notifications arrive via SSE                                                   |
| FA-14 | Notification: Catch Approved                                      | Must Have   | "Your catch [ID] has been approved and listed in the marketplace."                                    |
| FA-15 | Notification: Catch Rejected with reason                          | Must Have   | "Your catch [ID] was not approved. Reason: [admin's text]"                                            |
| FA-16 | Fishing Zones view shows zone map with color legend               | Should Have | Green=Allowed, Orange=Restricted, Red=Prohibited                                                      |
| FA-17 | Fisher cannot see other fishers' data                             | Must Have   | Backend enforces fisher_id = current user                                                             |
| FA-18 | App is functional at 375px width                                  | Must Have   | All screens tested at 375px                                                                           |
| FA-19 | Quantity field rejects values > 500 kg and <= 0                   | Must Have   | Inline validation error shown                                                                         |
| FA-20 | Fishing date cannot be set to a future date                       | Must Have   | Date picker blocks future dates                                                                       |

### 15.3 Admin Dashboard

| ID    | Requirement                                                              | Priority    | Acceptance Criteria                                                       |
| ----- | ------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------- |
| AD-01 | Dashboard shows 5 KPI cards (fishers, boats, catch, markets, alerts)     | Must Have   | Data fetched from /api/v1/admin/dashboard/stats                           |
| AD-02 | KPI cards show delta vs previous period ("+12 this month")               | Should Have | Comparison period: previous calendar month                                |
| AD-03 | Catch by Species donut chart — today's verified catches                  | Must Have   | Recharts/Chart.js; hover shows exact kg                                   |
| AD-04 | Catches Over Time line chart — last 7 days                               | Must Have   | X-axis: dates; Y-axis: total kg approved                                  |
| AD-05 | Fishing Zones activity map — Lake Tana                                   | Should Have | Static SVG or Leaflet map; zone circles colored by activity level         |
| AD-06 | Recent Catches table — last 20 entries, paginated                        | Must Have   | Columns: Fisher, Boat, Location, Species, kg, Time, Status                |
| AD-07 | Quota Usage panel — progress bars per species                            | Must Have   | Color: green <75%, orange 75–89%, red >=90%                               |
| AD-08 | Alerts panel — last 5 unread alerts                                      | Must Have   | Severity icon + title + time; click → alerts page                         |
| AD-09 | Daily Catches page: filter by status (All/Pending/Verified/Rejected)     | Must Have   | URL param: ?status=pending                                                |
| AD-10 | Daily Catches: search by fisher name, reference ID, species              | Must Have   | Debounced input; API call on stop typing                                  |
| AD-11 | Daily Catches: date range picker                                         | Should Have | Defaults to today; accepts any range                                      |
| AD-12 | Clicking catch row → opens catch detail view (slide-over or full page)   | Must Have   | Detail shows all submission data                                          |
| AD-13 | Catch detail: compliance flags displayed prominently                     | Must Have   | Zone type, license status, quota % at time of submission                  |
| AD-14 | Catch detail: Approve button                                             | Must Have   | Single click → confirmation modal → PUT /api/v1/admin/catches/:id/approve |
| AD-15 | Catch detail: Reject button with required reason textarea                | Must Have   | Reject disabled until reason entered (min 10 chars)                       |
| AD-16 | Approval triggers: listing creation + fisher notification + quota update | Must Have   | All three must complete atomically (DB transaction)                       |
| AD-17 | Rejection triggers: fisher notification with reason                      | Must Have   |                                                                           |
| AD-18 | Admin can see real-time pending count update via SSE                     | Must Have   | SSE event: catch_submitted; badge increments                              |
| AD-19 | Fishermen page: paginated list with license status filter                | Should Have |                                                                           |
| AD-20 | Quotas & Rules: admin can edit monthly quota per species                 | Must Have   | PUT /api/v1/admin/quotas/:id; super_admin only                            |
| AD-21 | Auto-alert when species quota reaches 90%                                | Must Have   | Alert created server-side; appears in panel via SSE                       |
| AD-22 | Auto-alert when catch submitted from Restricted zone                     | Must Have   |                                                                           |
| AD-23 | Auto-alert when catch submitted from Prohibited zone                     | Must Have   | Severity: CRITICAL                                                        |
| AD-24 | Alerts page: mark individual alert as read                               | Should Have |                                                                           |
| AD-25 | Alerts page: mark all as read                                            | Should Have |                                                                           |
| AD-26 | Reports page: monthly catch summary by species and zone                  | Should Have |                                                                           |
| AD-27 | All admin actions logged to audit_logs table                             | Must Have   | Who did what, when, on which entity                                       |
| AD-28 | Users & Roles page: super_admin can create/deactivate admin users        | Must Have   |                                                                           |
| AD-29 | Dashboard stats update when marketplace order placed (via SSE)           | Must Have   | SSE event: order_placed                                                   |

### 15.4 Fish Marketplace

| ID    | Requirement                                                                                 | Priority    | Acceptance Criteria                                           |
| ----- | ------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------- |
| MP-01 | Only VERIFIED catches appear as listings                                                    | Must Have   | Backend filter: status='VERIFIED' AND quantity_available > 0  |
| MP-02 | Home page: hero banner with search, trust badges, featured listings                         | Must Have   |                                                               |
| MP-03 | Featured listings grid: 4 cards (newest approved catches)                                   | Must Have   |                                                               |
| MP-04 | Listing card: species photo, name, location, price ETB/kg, weight, verified badge           | Must Have   |                                                               |
| MP-05 | Left sidebar: category filter by species                                                    | Must Have   | Click filters listing grid; URL updates with ?species=tilapia |
| MP-06 | Left sidebar: location filter, price range slider, availability toggle                      | Should Have |                                                               |
| MP-07 | Apply Filters / Clear All                                                                   | Must Have   |                                                               |
| MP-08 | Listing detail page: full catch info + fisher info + verification timeline                  | Must Have   |                                                               |
| MP-09 | Verification timeline: "Submitted [date]" → "Verified by Ministry [date]" → "Listed [date]" | Must Have   | Shows traceability chain                                      |
| MP-10 | Order form: quantity input (kg) with available quantity displayed                           | Must Have   |                                                               |
| MP-11 | Order validation: quantity cannot exceed available quantity                                 | Must Have   | Inline error; backend also validates                          |
| MP-12 | Order confirmation modal: species, qty, total price, fisher name                            | Must Have   |                                                               |
| MP-13 | Confirmed order: reduces listing.quantity_available in DB                                   | Must Have   | Atomic update                                                 |
| MP-14 | Order success page: reference number ORD-YYYY-MM-DD-XXXX                                    | Must Have   |                                                               |
| MP-15 | If quantity_available = 0: listing status → SOLD_OUT; removed from grid                     | Should Have |                                                               |
| MP-16 | Right sidebar: Active Listings count (live via SSE)                                         | Must Have   | SSE event: listing_created                                    |
| MP-17 | Right sidebar: Fish Sold (kg), Avg Price (ETB/kg), Total Sellers                            | Must Have   | Refreshed on order_placed SSE event                           |
| MP-18 | Recent Activity feed: last 5 sales/listings (auto-updating)                                 | Must Have   | SSE event updates feed                                        |
| MP-19 | New listing badge/animation when SSE triggers listing_created                               | Should Have | Brief "NEW" badge on freshly created listing card             |
| MP-20 | My Orders page: buyer's order history                                                       | Should Have | Columns: Reference, Species, Qty, Price, Date, Status         |
| MP-21 | Guest can browse but not order; order CTA shows login prompt                                | Must Have   |                                                               |

---

## 16. USER STORIES

### Fisher App Stories

**F-US-01: Submit a daily catch**

> As a licensed fisher with a valid license, I want to submit my catch in under 4 minutes so that I can get back to my fishing work without delay.

_Acceptance Criteria:_

- [ ] Fisher completes all 4 steps without errors
- [ ] Reference ID is displayed on success screen (CATCH-YYYY-MM-DD-XXXX format)
- [ ] New catch appears in My Catches with "Pending" status immediately
- [ ] Admin Dashboard pending queue gains the new entry within 5 seconds (SSE)
- [ ] Zone-based flags are automatically applied server-side before acknowledgment

**F-US-02: Track submission status**

> As a fisher, I want to see whether my submitted catches have been approved, rejected, or are still pending so that I know when my fish is available for sale.

_Acceptance Criteria:_

- [ ] My Catches list shows status badges with distinct colors
- [ ] Status updates appear without manual page refresh (SSE connection)
- [ ] Rejected submissions show the admin's reason text

**F-US-03: Receive approval notification**

> As a fisher, I want to be notified immediately when my catch is approved so I know when buyers can see my listing.

_Acceptance Criteria:_

- [ ] Notification bell badge increments on approval event
- [ ] Notification message includes catch reference ID and links to marketplace listing
- [ ] Notification is marked as read when viewed
- [ ] Unread count decrements when notification is opened

**F-US-04: Understand fishing zone rules**

> As a fisher, I want to see which zones I'm allowed to fish in before I go out so that I don't accidentally fish in restricted or prohibited areas.

_Acceptance Criteria:_

- [ ] Fishing Zones page shows Lake Tana map with colored zone overlays
- [ ] Each zone has a label and a "tap for rules" detail panel
- [ ] Allowed (green), Restricted (orange), Prohibited (red) are clearly labeled

**F-US-05: Expired license handling**

> As a fisher whose license has expired, I want to be clearly told I cannot submit a catch and directed to renew so I know what to do next.

_Acceptance Criteria:_

- [ ] Submit Catch button is disabled with tooltip: "License expired. Contact Ministry of Fisheries to renew."
- [ ] License card on home screen shows "EXPIRED" in red
- [ ] System does not allow expired-license fishers to proceed past Step 1 even if they access the URL directly

---

### Admin Dashboard Stories

**A-US-01: Process pending submissions**

> As a government admin, I want to see all pending catch submissions in a clear, sorted queue so I can process them efficiently during my workday.

_Acceptance Criteria:_

- [ ] Daily Catches defaults to "Pending" tab on load
- [ ] Pending badge count updates via SSE when new submissions arrive
- [ ] Each row shows fisher name, species, kg, zone flag, and submission time
- [ ] Rows with zone flags (restricted/prohibited) are visually highlighted

**A-US-02: Make a well-informed approval decision**

> As an admin, I want to see all relevant compliance information on a catch detail view before I approve or reject so that my decision is defensible.

_Acceptance Criteria:_

- [ ] Detail view shows: fisher license validity, zone type, quota status at submission time, uploaded photos
- [ ] Zone flag (if any) is shown with a prominent banner, not just a small icon
- [ ] Quota bar shows current species usage including this catch's impact if approved
- [ ] Approve and Reject buttons require a deliberate action (not one-tap from the list)

**A-US-03: Monitor quota health**

> As an admin, I want to see at a glance how close each species is to its monthly quota so I can take preventive action before overfishing occurs.

_Acceptance Criteria:_

- [ ] Quota panel on dashboard shows progress bar for each species
- [ ] Bars are color-coded (green < 75%, orange 75–89%, red >= 90%)
- [ ] Auto-alert fires and appears in panel when any species crosses 90%
- [ ] Admin can navigate to Quotas & Rules page and edit quota limits

**A-US-04: Understand system-wide health**

> As an admin, I want the dashboard overview to tell me the state of the entire fisheries system in one view so I don't need to navigate to multiple pages to understand what's happening.

_Acceptance Criteria:_

- [ ] Five KPI cards visible above the fold at 1280px width
- [ ] Charts update on page load; SSE updates KPIs when events occur
- [ ] Alert count badge shows unread alerts count; goes to 0 when all read
- [ ] Zone map shows activity clusters with visual distinction between high/low activity

---

### Marketplace Stories

**M-US-01: Find fresh, verified fish quickly**

> As a restaurant buyer, I want to search and filter the marketplace for specific fish types from nearby locations so I can plan my daily menu purchases.

_Acceptance Criteria:_

- [ ] Search bar accepts species name, location, or seller name
- [ ] Category sidebar filters instantly update the listing grid
- [ ] Location filter narrows to results within the selected zone
- [ ] Results show only VERIFIED listings with Available quantity > 0

**M-US-02: Trust what I'm buying**

> As a buyer, I want to see clear verification information on every listing so I know the fish is legally caught and government-approved before I commit to ordering.

_Acceptance Criteria:_

- [ ] Every listing card shows "Verified ✓" badge from ASSA
- [ ] Listing detail shows the full verification timeline
- [ ] Fisher's license number and validity are shown on the detail page
- [ ] No listing appears that does not have status = 'VERIFIED' in the database

**M-US-03: Be first to see new supply**

> As a frequent buyer, I want to know when new fish listings appear in real time so I can order fresh stock before it sells out.

_Acceptance Criteria:_

- [ ] SSE connection to marketplace pushes listing_created events
- [ ] New listing appears in the featured grid with a "NEW" badge within 5 seconds of admin approval
- [ ] Recent Activity feed shows "Tilapia (25 kg) listed by Tesfaye Alemu" in real time

---

## 17. USER FLOWS

### Flow 1 — Fisher Submits a Catch (Happy Path)

```
[Fisher App - Home Screen]
Fisher taps "Submit Catch"
         │
         ▼
[Step 1 - Details]
Species: Tilapia (dropdown)
Quantity: 25 kg (number)
Number of Fish: 12 (optional)
Gear: Gill Net (dropdown)
Date: 12 May 2024 (date picker, no future dates)
Time: 06:30 AM (time picker)
Taps "Next: Location"
         │
         ▼
[Step 2 - Location]
Fishing Zone: "Lake Tana – North Zone" (dropdown)
GPS auto-populates: 11.6045° N, 37.3940° E
Taps "Next: Photo"
         │
         ▼
[Step 3 - Photo Upload]
Fisher uploads 2 photos from camera roll
Thumbnails display
Taps "Next: Review"
         │
         ▼
[Step 4 - Review]
Shows full summary of all entered data
Fisher taps "Submit"
         │
         ▼
[API: POST /api/v1/catches]
         │
    ┌────┴─────┐
    │ Backend  │
    │ 1. Validate input
    │ 2. Check license status
    │ 3. Check zone type → No flag (Allowed)
    │ 4. Generate reference ID: CATCH-2024-05-12-0031
    │ 5. Save to catch_submissions (status=PENDING)
    │ 6. Publish SSE event: catch_submitted
    └────┬─────┘
         │
         ▼
[Success Screen]
"Catch Submitted Successfully!"
Reference ID: CATCH-2024-05-12-0031
[View My Catches] button

Simultaneously:
[Admin Dashboard] receives SSE event
→ Pending count badge increments
→ New row appears in Daily Catches table
```

### Flow 2 — Admin Approves (Full Interconnection)

```
[Admin Dashboard - Daily Catches - Pending Tab]
Admin sees new row: Tesfaye Alemu | Tilapia | 25 kg | North Zone | Pending
Admin clicks row
         │
         ▼
[Catch Detail View]
Shows: fisher info, license ✅ VALID, zone ✅ ALLOWED
Quota status: Tilapia 73% of 5,000 kg (3,650/5,000)
Photos: 2 thumbnails visible
Admin clicks "Approve"
         │
         ▼
[Confirmation Modal]
"Approve this catch? It will be listed in the marketplace."
Admin clicks "Confirm Approval"
         │
         ▼
[API: PUT /api/v1/admin/catches/:id/approve]
         │
    ┌────┴──────────────────────────────────┐
    │ Backend (single DB transaction)       │
    │ 1. UPDATE catch status → VERIFIED     │
    │ 2. INSERT marketplace_listing          │
    │ 3. INSERT notification (fisher)        │
    │ 4. UPDATE species_quotas +25 kg        │
    │ 5. CHECK quota: 3,675/5,000 = 73.5%   │
    │    → No alert needed                   │
    │ 6. INSERT audit_log                    │
    │ 7. COMMIT transaction                  │
    │ 8. Publish SSE events:                 │
    │    - catch_approved (fisher)           │
    │    - listing_created (marketplace)     │
    │    - stats_updated (admin)             │
    └────┬──────────────────────────────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
[Fisher App]                        [Marketplace]
Bell badge +1                       New listing card appears
Notification: "Your catch           "FRESH" badge
CATCH-2024-05-12-0031               Tesfaye's Tilapia, 25 kg
has been approved and               ETB 145/kg, Verified ✓
listed in the marketplace"          "NEW" badge for 60 seconds

         ▼
[Admin Dashboard]
Today's Total Catch KPI increments
Tilapia quota bar updates to 73.5%
Catch row status changes to "Verified" (green)
```

### Flow 3 — Buyer Orders (Marketplace → Dashboard)

```
[Marketplace - Home]
Mesfin sees "NEW" badge on Tilapia listing
Clicks "View Details"
         │
         ▼
[Listing Detail Page]
Species: Tilapia | 25 kg available | ETB 145/kg
Fisher: Tesfaye Alemu | Verified Fisher ✓
Zone: Lake Tana – North Zone
Verification timeline: Submitted 06:45 → Approved 07:12 → Listed 07:12
Mesfin enters: 10 kg
         │
         ▼
[Order Confirmation Modal]
10 kg × ETB 145 = ETB 1,450
[Confirm Order]
         │
         ▼
[API: POST /api/v1/marketplace/orders]
         │
    ┌────┴──────────────────────────────────┐
    │ Backend (single DB transaction)       │
    │ 1. Validate: 10 ≤ 25 (available) ✅   │
    │ 2. INSERT order record                 │
    │ 3. UPDATE listing: qty 25→15           │
    │ 4. UPDATE daily_market_stats           │
    │ 5. COMMIT                              │
    │ 6. Publish SSE events:                 │
    │    - order_placed (admin + marketplace) │
    └────┬──────────────────────────────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
[Order Success Page]               [Admin Dashboard]
ORD-2024-05-12-0089                Markets Supply (Today)
"Order placed!"                    stat decreases by 10 kg
ETB 1,450 total                    Monthly Fish Sold +10 kg

[Marketplace Sidebar]
Activity feed: "Tilapia (10 kg) sold to Blue Nile Restaurant"
Active Listings count updates
Listing card now shows "15 kg available"
```

---

## 18. USE CASES (FULL)

### UC-01: Submit Catch

| Field         | Detail                                                                |
| ------------- | --------------------------------------------------------------------- |
| ID            | UC-01                                                                 |
| Name          | Submit Daily Catch                                                    |
| Actor         | Fisher                                                                |
| Precondition  | Fisher is authenticated; license status = VALID                       |
| Trigger       | Fisher taps "Submit Catch"                                            |
| Main Flow     | Complete 4-step wizard → Submit → Reference ID returned               |
| Alt Flow 1    | License = EXPIRED → Submit button disabled; message shown             |
| Alt Flow 2    | Zone = PROHIBITED → Catch accepted; auto-alert created; zone_flag set |
| Alt Flow 3    | Quantity > 500 kg → Validation error at Step 1                        |
| Alt Flow 4    | Network failure during submit → Retry prompt; catch not duplicated    |
| Postcondition | Catch saved as PENDING; admin queue updated via SSE                   |
| Business Rule | BR-01, BR-02, BR-04, BR-05                                            |

### UC-02: Approve Catch

| Field          | Detail                                                                           |
| -------------- | -------------------------------------------------------------------------------- |
| ID             | UC-02                                                                            |
| Name           | Approve Catch Submission                                                         |
| Actor          | Admin                                                                            |
| Precondition   | Catch exists with status = PENDING; admin authenticated                          |
| Trigger        | Admin clicks Approve on catch detail view                                        |
| Main Flow      | Review detail → Click Approve → Confirm → Atomic transaction executes            |
| Alt Flow 1     | Transaction fails → Rollback; error message; catch remains PENDING               |
| Alt Flow 2     | Quota reaches 90% during this approval → Alert auto-created                      |
| Alt Flow 3     | Same catch approved twice (race condition) → Second attempt returns 409 Conflict |
| Postcondition  | Catch = VERIFIED; listing created; fisher notified; quota updated                |
| Business Rules | BR-03, BR-11, BR-12                                                              |

### UC-03: Reject Catch

| Field         | Detail                                                                                 |
| ------------- | -------------------------------------------------------------------------------------- |
| ID            | UC-03                                                                                  |
| Name          | Reject Catch Submission                                                                |
| Actor         | Admin                                                                                  |
| Precondition  | Catch exists with status = PENDING; admin authenticated                                |
| Trigger       | Admin clicks Reject and submits reason                                                 |
| Main Flow     | Click Reject → Enter reason (min 10 chars) → Confirm → Status updated                  |
| Alt Flow      | Admin submits with empty reason → Button remains disabled; inline error                |
| Postcondition | Catch = REJECTED; fisher notification with reason; no listing created; quota unchanged |
| Business Rule | BR-06                                                                                  |

### UC-04: Place Marketplace Order

| Field         | Detail                                                                           |
| ------------- | -------------------------------------------------------------------------------- |
| ID            | UC-04                                                                            |
| Name          | Place Fish Order                                                                 |
| Actor         | Buyer                                                                            |
| Precondition  | Buyer authenticated; listing status = ACTIVE; quantity_available > 0             |
| Trigger       | Buyer enters quantity and clicks Order                                           |
| Main Flow     | Enter qty → Validation → Confirm modal → POST order → Success                    |
| Alt Flow 1    | Requested qty > available qty → Error: "Only X kg available"                     |
| Alt Flow 2    | Listing sold out during checkout → Error: "This listing is no longer available"  |
| Alt Flow 3    | Guest user clicks Order → Redirected to login                                    |
| Postcondition | Order saved; listing qty reduced; dashboard stats updated; activity feed updated |
| Business Rule | BR-07, BR-08                                                                     |

### UC-05: Quota Alert

| Field         | Detail                                                                             |
| ------------- | ---------------------------------------------------------------------------------- |
| ID            | UC-05                                                                              |
| Name          | Species Quota Threshold Alert                                                      |
| Actor         | System (automated), Admin                                                          |
| Trigger       | Catch approval pushes species monthly total to >= 90% of limit                     |
| Main Flow     | Approval transaction checks quota → Threshold crossed → Alert created → SSE pushed |
| Postcondition | Admin sees alert in panel; quota bar turns red/orange                              |

---

## 19. BUSINESS RULES

| ID    | Rule                                                                                           | Enforcement Point                            | Violation Response                                                                  |
| ----- | ---------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| BR-01 | Only VALID license holders may submit catches                                                  | Backend middleware on POST /catches          | 403: "License is not valid for catch submission"                                    |
| BR-02 | Required catch fields: species, quantity_kg, fishing_gear, fishing_date, fishing_time, zone_id | Zod schema validation                        | 400: field-level validation errors                                                  |
| BR-03 | Only VERIFIED catches may appear in the marketplace                                            | DB query filter on all marketplace endpoints | N/A — never reached                                                                 |
| BR-04 | Catches from PROHIBITED zones trigger CRITICAL alert                                           | Backend post-save hook                       | Alert created; zone_flag = 'PROHIBITED_ZONE'                                        |
| BR-05 | Catches from RESTRICTED zones trigger WARNING alert                                            | Backend post-save hook                       | Alert created; zone_flag = 'RESTRICTED_ZONE'                                        |
| BR-06 | Rejection requires admin to provide written reason (min 10 characters)                         | Frontend validation + backend validation     | 400: "Rejection reason is required"                                                 |
| BR-07 | Marketplace order quantity cannot exceed listing.quantity_available                            | Backend validation                           | 400: "Requested quantity exceeds available stock"                                   |
| BR-08 | When quantity_available reaches 0, listing status → SOLD_OUT                                   | Backend post-order hook                      | Listing removed from active marketplace                                             |
| BR-09 | Monthly species quotas are tracked across all approved catches                                 | Backend service after each approval          | Alert at 90%; flag at 100%                                                          |
| BR-10 | Reference IDs are system-generated and immutable                                               | Backend generation only                      | No endpoint to modify reference IDs                                                 |
| BR-11 | Catch approval atomically creates a marketplace listing at fisher's default price              | DB transaction                               | If listing creation fails, approval rolls back                                      |
| BR-12 | Admin approval or rejection creates a notification for the submitting fisher                   | DB transaction, same as BR-11                | If notification creation fails, entire transaction rolls back                       |
| BR-13 | All admin actions are written to audit_logs (immutable)                                        | Backend middleware on admin routes           | Audit log write failure does not block the action but is logged to error monitoring |
| BR-14 | A catch cannot be approved or rejected twice                                                   | Backend idempotency check                    | 409: "This catch has already been reviewed"                                         |
| BR-15 | Fisher can only see their own catches (row-level security)                                     | Backend WHERE fisher_id = req.user.fisher_id | 403 if direct ID access attempted                                                   |

---

## 20. OVERFISHING CONTROL LOGIC

### 20.1 Quota System Design

Quotas are defined per species per calendar month. The admin (super_admin role) sets quota limits via the Quotas & Rules page. The system tracks cumulative approved catch weight against these limits.

### 20.2 Quota Calculation Logic

```typescript
// Executed after every catch approval, within the same DB transaction

async function checkAndUpdateQuota(
  species: string,
  quantityKg: number,
  month: number,
  year: number,
): Promise<QuotaCheckResult> {
  // Get or create quota record for this species/month
  const quota = await db.species_quotas.findOrCreate({
    where: { species, month, year },
    defaults: { current_month_kg: 0 },
  });

  const newTotal = quota.current_month_kg + quantityKg;
  const usagePercent = (newTotal / quota.monthly_limit_kg) * 100;

  // Update the running total (within parent transaction)
  await quota.update({ current_month_kg: newTotal });

  // Alert logic
  if (usagePercent >= 100 && !quota.exceeded_alert_sent) {
    await createAlert({
      type: 'QUOTA_EXCEEDED',
      severity: 'CRITICAL',
      title: `${species} Monthly Quota Exceeded`,
      message: `Total approved catches for ${species} have reached ${newTotal.toFixed(1)} kg, exceeding the ${quota.monthly_limit_kg} kg monthly limit.`,
      related_entity_type: 'quota',
      related_entity_id: quota.id,
    });
    await quota.update({ exceeded_alert_sent: true });
  } else if (usagePercent >= 90 && !quota.warning_alert_sent) {
    await createAlert({
      type: 'QUOTA_WARNING',
      severity: 'WARNING',
      title: `${species} Quota at ${Math.round(usagePercent)}%`,
      message: `${species} monthly quota is at ${newTotal.toFixed(1)} / ${quota.monthly_limit_kg} kg. Consider limiting further approvals.`,
      related_entity_type: 'quota',
      related_entity_id: quota.id,
    });
    await quota.update({ warning_alert_sent: true });
  }

  return {
    newTotal,
    usagePercent,
    monthlyLimit: quota.monthly_limit_kg,
    status: usagePercent >= 100 ? 'EXCEEDED' : usagePercent >= 90 ? 'WARNING' : 'OK',
  };
}
```

### 20.3 Default Monthly Quotas (Lake Tana Pilot Zone)

| Species        | Monthly Limit (kg) | Basis                                    |
| -------------- | ------------------ | ---------------------------------------- |
| Tilapia        | 5,000              | FAO Lake Tana sustainable yield estimate |
| Nile Perch     | 2,000              | Regional bureau guideline                |
| Catfish        | 2,000              | Regional bureau guideline                |
| Carp           | 1,500              | Introduced species — controlled          |
| Barbus (Ganfo) | 1,000              | Endemic species — protected              |
| Other          | 800                | General allowance                        |

### 20.4 Zone-Based Restrictions

```typescript
// Zone flag logic — runs during POST /api/v1/catches before saving

function evaluateZoneFlag(zoneType: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED'): {
  flag: string | null;
  alertType: string | null;
  severity: string | null;
} {
  switch (zoneType) {
    case 'ALLOWED':
      return { flag: null, alertType: null, severity: null };
    case 'RESTRICTED':
      return {
        flag: 'RESTRICTED_ZONE',
        alertType: 'ZONE_RESTRICTION',
        severity: 'WARNING',
      };
    case 'PROHIBITED':
      return {
        flag: 'PROHIBITED_ZONE',
        alertType: 'ZONE_VIOLATION',
        severity: 'CRITICAL',
      };
  }
}
```

---

## 21. VERIFICATION & COMPLIANCE LOGIC

### 21.1 Catch Lifecycle State Machine

```
                       ┌──────────────────────────┐
                       │                          │
                  [SUBMITTED]                     │
                       │                          │
             (Admin reviews)                      │
                       │                          │
          ┌────────────┼────────────┐             │
          │                        │             │
     [APPROVED]              [REJECTED]          │
    (VERIFIED)                     │             │
          │                  Fisher sees          │
  Listing created           reason in app         │
  Fisher notified           No listing            │
  Quota updated             created               │
          │                                       │
   [LISTED in Market]                             │
          │                                       │
   Buyer places order                             │
          │                                       │
  [PARTIALLY_SOLD]                                │
  or [SOLD_OUT] ──────────────────────────────────┘
```

### 21.2 Compliance Display on Catch Detail (Admin View)

The admin catch detail view must surface the following compliance indicators:

| Indicator           | Source                                                   | Display                                                                                                     |
| ------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| License Status      | fishers.license_status at time of catch                  | Green badge: "VALID" / Red badge: "EXPIRED"                                                                 |
| Zone Type           | fishing_zones.type                                       | Green: "ALLOWED" / Orange banner: "RESTRICTED ZONE" / Red banner: "PROHIBITED ZONE — Requires close review" |
| Quota Status        | species_quotas at time of review                         | Bar showing current % for this species                                                                      |
| Photo Provided      | catch_submissions.photo_urls                             | ✅ "Photos uploaded" or ⚠️ "No photos"                                                                      |
| Previous Violations | COUNT(catches) WHERE fisher_id AND zone_flag IS NOT NULL | "2 previous zone flags this month"                                                                          |

---

# PART III — DESIGN

---

## 22. DESIGN SYSTEM & UI/UX STANDARDS

### 22.1 Color Tokens

```css
/* Global */
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-danger: #ef4444;
--color-info: #3b82f6;
--color-neutral-50: #f9fafb;
--color-neutral-100: #f3f4f6;
--color-neutral-700: #374151;
--color-neutral-900: #111827;

/* Fisher App */
--fisher-primary: #1a3b6e;
--fisher-accent: #3b82f6;
--fisher-bg: #f8faff;
--fisher-card: #ffffff;

/* Admin Dashboard */
--admin-sidebar: #0f2137;
--admin-sidebar-text: #cbd5e1;
--admin-sidebar-active: #3b82f6;
--admin-content-bg: #f1f5f9;
--admin-card: #ffffff;

/* Marketplace */
--market-primary: #1a7a4a;
--market-accent: #22c55e;
--market-bg: #ffffff;
--market-card-border: #e5e7eb;
--market-hero-bg: #f0fdf4;
```

### 22.2 Status Badge Specification

| Status            | Text     | Background | Text Color | Border  |
| ----------------- | -------- | ---------- | ---------- | ------- |
| Pending           | PENDING  | #FEF3C7    | #92400E    | #F59E0B |
| Verified/Approved | VERIFIED | #DCFCE7    | #166534    | #22C55E |
| Rejected          | REJECTED | #FEE2E2    | #991B1B    | #EF4444 |
| Sold Out          | SOLD OUT | #F3F4F6    | #6B7280    | #D1D5DB |
| Fresh             | FRESH    | #DCFCE7    | #166534    | none    |
| Limited           | LIMITED  | #FEF3C7    | #92400E    | none    |

### 22.3 Typography Scale

| Token       | Size | Weight | Use                    |
| ----------- | ---- | ------ | ---------------------- |
| --text-xs   | 12px | 400    | Labels, captions       |
| --text-sm   | 14px | 400    | Body text, table cells |
| --text-base | 16px | 400    | Default body           |
| --text-lg   | 18px | 600    | Card titles            |
| --text-xl   | 20px | 600    | Section headings       |
| --text-2xl  | 24px | 700    | Page titles            |
| --text-3xl  | 30px | 700    | KPI numbers            |
| --text-4xl  | 36px | 800    | Hero headline          |

### 22.4 Spacing System (4px base unit)

2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 px

### 22.5 Component Standards

**Cards:** `rounded-xl shadow-sm border border-neutral-100 bg-white p-6`
**Buttons — Primary:** `bg-[var(--module-primary)] text-white rounded-lg px-4 py-2.5 font-semibold hover:opacity-90 transition`
**Buttons — Destructive:** `bg-danger text-white rounded-lg px-4 py-2.5 font-semibold`
**Input Fields:** `border border-neutral-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[module-accent] focus:outline-none`
**Table Rows:** `hover:bg-neutral-50 cursor-pointer transition-colors`
**Sidebar Navigation Items:** Active state uses `--admin-sidebar-active` background at 20% opacity + full-color left border

---

## 26. ACCESSIBILITY REQUIREMENTS (WCAG 2.1 AA)

| Requirement                 | Standard                             | Implementation                                               |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| Color contrast (text)       | 4.5:1 minimum                        | All text against background tested with contrast checker     |
| Color contrast (large text) | 3:1 minimum                          | Headings 24px+                                               |
| Focus indicators            | Visible on all interactive elements  | `focus:ring-2 focus:ring-offset-2` on all focusable elements |
| Alternative text            | All images have descriptive alt text | Required for fish listing photos, icons, and charts          |
| Form labels                 | All inputs have associated labels    | No placeholder-only labels                                   |
| Error messages              | Not only communicated by color       | Color + icon + text for all error states                     |
| Keyboard navigation         | All actions completable by keyboard  | Tab order logical; no keyboard traps                         |
| Touch targets               | Minimum 44×44px on Fisher App        | All buttons and tappable elements verified                   |
| Status changes              | Announced to screen readers          | aria-live regions for SSE-driven updates                     |
| Language attribute          | `lang="en"` on html element          | Applied; will be `lang="am"` in V2                           |

---

## 27. INTERNATIONALIZATION & LOCALIZATION

**V1.0:** English only.

**V2.0 Architecture Preparation (build now to avoid rework):**

All user-facing strings must be stored in translation files from Day 1, even if only English exists.

```
/fisher-app/src/locales/
  en/
    common.json
    catch.json
    notifications.json
  am/           ← Empty in V1, populated in V2
    common.json
    catch.json
    notifications.json
```

Use `react-i18next` in all three frontend modules. Never hardcode display strings in components — always use `t('key')`. This is a non-negotiable architectural requirement for V2 compatibility.

**Locale-sensitive formatting:**

- Numbers: ETB currency formatted as `ETB 1,450` (not "$1,450")
- Dates: `DD MMM YYYY` format (e.g., "12 May 2024")
- Times: 12-hour format with AM/PM for Fisher App; 24-hour for Admin Dashboard

---

# PART IV — ENGINEERING

---

## 28. CONFIRMED TECH STACK

| Layer              | Technology                     | Version            | Rationale                                                   |
| ------------------ | ------------------------------ | ------------------ | ----------------------------------------------------------- |
| Frontend Framework | React                          | 18.x               | Industry standard; excellent ecosystem                      |
| Frontend Build     | Vite                           | 5.x                | Fast dev server; optimal for multi-module                   |
| Styling            | Tailwind CSS                   | 3.x                | Utility-first; fast iteration; design system compatible     |
| Data Fetching      | TanStack Query (React Query)   | 5.x                | Caching, background refetch, SSE integration                |
| Routing            | React Router                   | 6.x                | Nested routes, layout routes                                |
| Charts             | Recharts                       | 2.x                | React-native; no D3 complexity; sufficient for requirements |
| Form Validation    | React Hook Form + Zod          | Latest             | Type-safe forms; same schema as backend                     |
| Icons              | Lucide React                   | Latest             | Consistent, tree-shakeable                                  |
| i18n               | react-i18next                  | Latest             | V2 readiness                                                |
| Backend            | Node.js + Express              | 20 LTS + 4.x       | Stable; well-known; low-friction                            |
| Language           | TypeScript                     | 5.x                | Type safety; better Cursor/AI code generation               |
| Database           | PostgreSQL                     | 16.x               | Production-grade; ACID compliant; concurrent writes         |
| ORM                | Drizzle ORM                    | Latest             | TypeScript-first; lightweight; excellent migrations         |
| Cache / Pub-Sub    | Redis                          | 7.x                | Sessions, API caching, SSE event broadcasting               |
| File Storage       | Cloudinary                     | SDK v2             | Free tier; image optimization; CDN delivery                 |
| Authentication     | JWT (access + refresh)         | jsonwebtoken 9.x   | Stateless access token + DB-tracked refresh                 |
| Validation         | Zod                            | 3.x                | Shared schemas between frontend and backend                 |
| Logging            | Winston                        | 3.x                | Structured JSON logs; multiple transports                   |
| Testing (backend)  | Jest + Supertest               | Latest             | API integration testing                                     |
| Testing (frontend) | Vitest + React Testing Library | Latest             | Component and integration testing                           |
| Containerization   | Docker + Docker Compose        | Latest             | One-command local development environment                   |
| Process Manager    | PM2                            | 5.x                | Production process management on VPS                        |
| Reverse Proxy      | Nginx                          | 1.25               | Static file serving; SSL termination; proxy to Node         |
| API Docs           | Swagger / OpenAPI 3.0          | swagger-ui-express | Auto-generated from route definitions                       |

---

## 29. SYSTEM ARCHITECTURE

### 29.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  Fisher App  │   │    Admin     │   │   Marketplace    │   │
│  │  React PWA   │   │  Dashboard   │   │   React App      │   │
│  │  Port: 3002  │   │  React App   │   │   Port: 3003     │   │
│  │  Mobile-1st  │   │  Port: 3001  │   │   Desktop        │   │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────────┘   │
└─────────┼──────────────────┼──────────────────┼───────────────┘
          │                  │                  │
          │     HTTPS + SSE  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NGINX (Reverse Proxy)                       │
│  SSL Termination | Static Files | Rate Limiting | Gzip          │
│  /fisher   → :3002  |  /admin → :3001  |  /market → :3003      │
│  /api      → :4000  |  /sse   → :4000/events                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API SERVER                           │
│              Node.js + Express + TypeScript                     │
│                       Port: 4000                                │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Auth    │ │  Catches │ │  Admin   │ │   Marketplace    │  │
│  │  Router  │ │  Router  │ │  Router  │ │   Router         │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬────────────┘  │
│       └────────────┴────────────┴─────────────┘                │
│                            │                                    │
│  ┌─────────────────────────▼──────────────────────────────┐    │
│  │              Business Logic Services                   │    │
│  │  QuotaService | NotificationService | ListingService   │    │
│  │  AuditService | SSEService | ZoneService               │    │
│  └─────────────────────────┬──────────────────────────────┘    │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
          ┌──────────────────┼────────────────┐
          │                  │                │
          ▼                  ▼                ▼
┌─────────────────┐ ┌────────────────┐ ┌────────────────┐
│   PostgreSQL    │ │    Redis       │ │   Cloudinary   │
│   Port: 5432    │ │   Port: 6379   │ │   CDN / API    │
│   Primary DB    │ │   Cache/SSE    │ │   File Store   │
└─────────────────┘ └────────────────┘ └────────────────┘
```

### 29.2 Module Entry Points (Production URLs)

| Module          | Dev URL                        | Production URL                   |
| --------------- | ------------------------------ | -------------------------------- |
| Fisher App      | http://localhost:3002          | https://fisher.assa.gov.et       |
| Admin Dashboard | http://localhost:3001          | https://admin.assa.gov.et        |
| Marketplace     | http://localhost:3003          | https://market.assa.gov.et       |
| API             | http://localhost:4000          | https://api.assa.gov.et          |
| API Docs        | http://localhost:4000/api-docs | https://api.assa.gov.et/api-docs |

---

## 30. INFRASTRUCTURE & DEPLOYMENT ARCHITECTURE

### 30.1 Production Server Specification

| Resource           | Specification                       | Notes                                                       |
| ------------------ | ----------------------------------- | ----------------------------------------------------------- |
| Application Server | 4 vCPU, 8GB RAM VPS                 | DigitalOcean Droplet or AWS t3.medium                       |
| Database Server    | 2 vCPU, 4GB RAM, 50GB SSD           | Managed PostgreSQL (DigitalOcean Managed DB) or self-hosted |
| Redis              | 1GB managed instance                | Redis Cloud free tier sufficient for MVP                    |
| File Storage       | Cloudinary                          | Free tier: 25GB storage, 25GB bandwidth/month               |
| SSL Certificates   | Let's Encrypt via Certbot           | Auto-renewal via cron                                       |
| Backups            | Daily automated PostgreSQL dump     | Stored in object storage (Backblaze B2 or S3)               |
| Monitoring         | UptimeRobot (free) + PM2 monitoring | Alert on downtime via email                                 |

### 30.2 Environment Strategy

| Environment | Purpose                | Database                  | Notes                       |
| ----------- | ---------------------- | ------------------------- | --------------------------- |
| Local Dev   | Development            | Local PostgreSQL (Docker) | docker-compose up           |
| Staging     | Pre-production testing | Staging PostgreSQL clone  | Mirror of production config |
| Production  | Live system            | Managed PostgreSQL        | PM2 + Nginx                 |

### 30.3 Docker Compose (Local Development)

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: assa_db
      POSTGRES_USER: assa_user
      POSTGRES_PASSWORD: assa_dev_password
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  backend:
    build: ./backend
    ports:
      - '4000:4000'
    environment:
      DATABASE_URL: postgresql://assa_user:assa_dev_password@postgres:5432/assa_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev_jwt_secret_change_in_production
      JWT_REFRESH_SECRET: dev_refresh_secret_change_in_production
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
      NODE_ENV: development
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend/src:/app/src

volumes:
  postgres_data:
```

### 30.4 PM2 Configuration (Production)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'assa-api',
      script: 'dist/server.js',
      instances: 2, // 2 instances for load balancing
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
  ],
};
```

### 30.5 Nginx Configuration Snippet

```nginx
# /etc/nginx/sites-available/assa
server {
    listen 443 ssl;
    server_name api.assa.gov.et;

    ssl_certificate /etc/letsencrypt/live/assa.gov.et/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/assa.gov.et/privkey.pem;

    # SSE endpoint — disable proxy buffering
    location /api/v1/events {
        proxy_pass http://localhost:4000;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding on;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:4000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
    limit_req zone=api burst=20 nodelay;
}
```

---

## 31. REAL-TIME ARCHITECTURE (SSE)

### 31.1 Why SSE Over WebSockets

| Factor                       | SSE                                                          | WebSockets                                        |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| Complexity                   | Simple — HTTP-based                                          | Higher — requires separate protocol               |
| Direction                    | Server → Client only                                         | Bidirectional                                     |
| Use case fit                 | ASSA needs server-push only (events from backend to browser) | Bidirectional needed for chat — not required here |
| Proxy/firewall compatibility | Better (HTTP/2 compatible)                                   | Can be blocked by some corporate firewalls        |
| Reconnection                 | Automatic browser reconnect built in                         | Manual                                            |
| Load balancing               | Requires sticky sessions OR pub/sub                          | Same                                              |
| Redis pub/sub integration    | Simple                                                       | Simple                                            |

SSE is the correct choice for ASSA's pattern: the backend generates events, clients subscribe and react. No client-to-client communication is needed.

### 31.2 SSE Event Types

| Event Name        | Trigger                         | Subscribers                     | Payload                                                    |
| ----------------- | ------------------------------- | ------------------------------- | ---------------------------------------------------------- |
| `catch_submitted` | New catch saved (PENDING)       | Admin Dashboard                 | `{ catchId, fisherId, species, quantityKg, zoneFlag }`     |
| `catch_approved`  | Catch status → VERIFIED         | Fisher App (fisher_id specific) | `{ catchId, referenceId, listingId }`                      |
| `catch_rejected`  | Catch status → REJECTED         | Fisher App (fisher_id specific) | `{ catchId, referenceId, reason }`                         |
| `listing_created` | New marketplace listing created | Marketplace, Admin Dashboard    | `{ listingId, species, quantityKg, pricePerKg, fisherId }` |
| `order_placed`    | Order confirmed                 | Marketplace, Admin Dashboard    | `{ orderId, listingId, quantityKg, species }`              |
| `quota_warning`   | Species quota >= 90%            | Admin Dashboard                 | `{ species, currentKg, limitKg, percentage }`              |
| `quota_exceeded`  | Species quota >= 100%           | Admin Dashboard                 | `{ species, currentKg, limitKg }`                          |
| `alert_created`   | Any new system alert            | Admin Dashboard                 | `{ alertId, type, severity, title }`                       |
| `stats_updated`   | Any metric-affecting event      | Admin Dashboard, Marketplace    | `{ dashboardStats }`                                       |

### 31.3 SSE Implementation

```typescript
// backend/src/services/sse.service.ts

import { Redis } from 'ioredis';
import { Response } from 'express';

const publisher = new Redis(process.env.REDIS_URL!);
const subscriber = new Redis(process.env.REDIS_URL!);

// Connected clients registry
const clients: Map<
  string,
  {
    res: Response;
    userId: number;
    role: string;
    channels: string[];
  }
> = new Map();

// Subscribe to Redis channel on startup
subscriber.subscribe('assa_events');
subscriber.on('message', (channel: string, message: string) => {
  const event = JSON.parse(message);
  broadcastToRelevantClients(event);
});

function broadcastToRelevantClients(event: SSEEvent) {
  clients.forEach((client) => {
    if (isEventRelevantToClient(event, client)) {
      client.res.write(`event: ${event.type}\n`);
      client.res.write(`data: ${JSON.stringify(event.payload)}\n\n`);
    }
  });
}

function isEventRelevantToClient(event: SSEEvent, client: ClientInfo): boolean {
  switch (event.type) {
    case 'catch_submitted':
    case 'quota_warning':
    case 'quota_exceeded':
    case 'alert_created':
      return client.role === 'admin' || client.role === 'super_admin';

    case 'catch_approved':
    case 'catch_rejected':
      // Only the specific fisher who submitted this catch
      return client.role === 'fisher' && client.userId === event.payload.fisherId;

    case 'listing_created':
    case 'order_placed':
      return ['admin', 'super_admin', 'buyer', 'guest'].includes(client.role);

    case 'stats_updated':
      return client.role === 'admin' || client.role === 'super_admin';

    default:
      return false;
  }
}

// Publish event from anywhere in the backend
export async function publishEvent(type: string, payload: object) {
  await publisher.publish('assa_events', JSON.stringify({ type, payload }));
}

// SSE endpoint handler
export function sseHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx SSE fix
  res.flushHeaders();

  // Send heartbeat every 30s to prevent proxy timeout
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  const clientId = crypto.randomUUID();
  clients.set(clientId, {
    res,
    userId: req.user.id,
    role: req.user.role,
    channels: [],
  });

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(clientId);
  });
}
```

### 31.4 Frontend SSE Integration (React + TanStack Query)

```typescript
// shared hook used in all three modules
// src/hooks/useSSE.ts

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useSSE() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource('/api/v1/events', {
      withCredentials: true,
    });

    eventSource.addEventListener('catch_submitted', () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'catches', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'stats'] });
    });

    eventSource.addEventListener('catch_approved', (e) => {
      const data = JSON.parse(e.data);
      queryClient.invalidateQueries({ queryKey: ['fisher', 'catches'] });
      queryClient.invalidateQueries({ queryKey: ['fisher', 'notifications'] });
    });

    eventSource.addEventListener('listing_created', () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'stats'] });
    });

    eventSource.addEventListener('order_placed', () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'stats'] });
    });

    eventSource.onerror = () => {
      // Browser will automatically reconnect after EventSource error
      console.warn('SSE connection lost. Browser will reconnect.');
    };

    return () => eventSource.close();
  }, [queryClient]);
}
```

---

## 32. DATABASE DESIGN (POSTGRESQL)

### 32.1 Full Schema

```sql
-- ============================================================
-- ASSA DATABASE SCHEMA v1.0
-- PostgreSQL 16
-- Run: psql -d assa_db -f schema.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
  id               SERIAL PRIMARY KEY,
  uuid             UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  email            VARCHAR(255) UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  role             VARCHAR(50) NOT NULL CHECK (role IN ('fisher','admin','super_admin','buyer','field_officer')),
  full_name        VARCHAR(255) NOT NULL,
  phone            VARCHAR(20),
  is_active        BOOLEAN DEFAULT true NOT NULL,
  region           VARCHAR(100) DEFAULT 'Amhara',
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until     TIMESTAMPTZ,
  last_login       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- TABLE: refresh_tokens
-- ============================================================
CREATE TABLE refresh_tokens (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  is_revoked   BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ============================================================
-- TABLE: fishing_zones
-- ============================================================
CREATE TABLE fishing_zones (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  code         VARCHAR(50) UNIQUE NOT NULL,
  zone_type    VARCHAR(20) NOT NULL CHECK (zone_type IN ('ALLOWED','RESTRICTED','PROHIBITED')),
  description  TEXT,
  gps_lat      DECIMAL(10, 7),
  gps_lng      DECIMAL(10, 7),
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: fishers
-- ============================================================
CREATE TABLE fishers (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_number    VARCHAR(50) UNIQUE NOT NULL,
  license_status    VARCHAR(20) NOT NULL DEFAULT 'VALID'
                    CHECK (license_status IN ('VALID','EXPIRED','SUSPENDED','PENDING')),
  license_issued    DATE NOT NULL,
  license_expiry    DATE NOT NULL,
  assigned_zone_id  INTEGER REFERENCES fishing_zones(id),
  profile_photo_url TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fishers_user ON fishers(user_id);
CREATE INDEX idx_fishers_license ON fishers(license_number);
CREATE INDEX idx_fishers_status ON fishers(license_status);

-- ============================================================
-- TABLE: boats
-- ============================================================
CREATE TABLE boats (
  id                    SERIAL PRIMARY KEY,
  fisher_id             INTEGER NOT NULL REFERENCES fishers(id) ON DELETE CASCADE,
  boat_name             VARCHAR(255) NOT NULL,
  registration_number   VARCHAR(100) UNIQUE NOT NULL,
  boat_type             VARCHAR(100),
  capacity_kg           INTEGER,
  year_built            INTEGER,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_boats_fisher ON boats(fisher_id);

-- ============================================================
-- TABLE: species
-- ============================================================
CREATE TABLE species (
  id               SERIAL PRIMARY KEY,
  common_name      VARCHAR(100) NOT NULL,
  scientific_name  VARCHAR(100),
  amharic_name     VARCHAR(100),
  min_size_cm      INTEGER,
  max_catch_per_trip_kg INTEGER,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: catch_submissions
-- ============================================================
CREATE TABLE catch_submissions (
  id                SERIAL PRIMARY KEY,
  reference_id      VARCHAR(30) UNIQUE NOT NULL,
  fisher_id         INTEGER NOT NULL REFERENCES fishers(id),
  boat_id           INTEGER REFERENCES boats(id),
  species_id        INTEGER NOT NULL REFERENCES species(id),
  species_name      VARCHAR(100) NOT NULL, -- denormalized for display
  quantity_kg       DECIMAL(8,2) NOT NULL CHECK (quantity_kg > 0 AND quantity_kg <= 500),
  number_of_fish    INTEGER,
  fishing_gear      VARCHAR(100) NOT NULL,
  fishing_date      DATE NOT NULL,
  fishing_time      TIME NOT NULL,
  zone_id           INTEGER NOT NULL REFERENCES fishing_zones(id),
  zone_name         VARCHAR(255) NOT NULL, -- denormalized
  gps_lat           DECIMAL(10, 7),
  gps_lng           DECIMAL(10, 7),
  photo_urls        JSONB DEFAULT '[]'::jsonb,
  zone_flag         VARCHAR(30) CHECK (zone_flag IN (NULL,'RESTRICTED_ZONE','PROHIBITED_ZONE')),
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','VERIFIED','REJECTED')),
  rejection_reason  TEXT,
  reviewed_by       INTEGER REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  quota_at_review   DECIMAL(8,2), -- quota % at time of review (audit)
  submitted_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_catches_fisher ON catch_submissions(fisher_id);
CREATE INDEX idx_catches_status ON catch_submissions(status);
CREATE INDEX idx_catches_species ON catch_submissions(species_name);
CREATE INDEX idx_catches_date ON catch_submissions(fishing_date DESC);
CREATE INDEX idx_catches_zone ON catch_submissions(zone_id);
CREATE INDEX idx_catches_submitted ON catch_submissions(submitted_at DESC);

-- ============================================================
-- TABLE: marketplace_listings
-- ============================================================
CREATE TABLE marketplace_listings (
  id                    SERIAL PRIMARY KEY,
  catch_id              INTEGER UNIQUE NOT NULL REFERENCES catch_submissions(id),
  fisher_id             INTEGER NOT NULL REFERENCES fishers(id),
  species_name          VARCHAR(100) NOT NULL,
  quantity_available_kg DECIMAL(8,2) NOT NULL,
  original_quantity_kg  DECIMAL(8,2) NOT NULL,
  price_per_kg          DECIMAL(8,2) NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','SOLD_OUT','REMOVED')),
  description           TEXT,
  listed_at             TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_listings_species ON marketplace_listings(species_name);
CREATE INDEX idx_listings_status ON marketplace_listings(status);
CREATE INDEX idx_listings_fisher ON marketplace_listings(fisher_id);
CREATE INDEX idx_listings_listed ON marketplace_listings(listed_at DESC);

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TABLE orders (
  id              SERIAL PRIMARY KEY,
  reference_id    VARCHAR(30) UNIQUE NOT NULL,
  listing_id      INTEGER NOT NULL REFERENCES marketplace_listings(id),
  buyer_id        INTEGER NOT NULL REFERENCES users(id),
  quantity_kg     DECIMAL(8,2) NOT NULL CHECK (quantity_kg > 0),
  price_per_kg    DECIMAL(8,2) NOT NULL,
  total_price     DECIMAL(10,2) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED'
                  CHECK (status IN ('CONFIRMED','DELIVERED','CANCELLED')),
  notes           TEXT,
  ordered_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_listing ON orders(listing_id);
CREATE INDEX idx_orders_date ON orders(ordered_at DESC);

-- ============================================================
-- TABLE: species_quotas
-- ============================================================
CREATE TABLE species_quotas (
  id                    SERIAL PRIMARY KEY,
  species_name          VARCHAR(100) NOT NULL,
  monthly_limit_kg      DECIMAL(10,2) NOT NULL,
  current_month_kg      DECIMAL(10,2) NOT NULL DEFAULT 0,
  month                 INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year                  INTEGER NOT NULL,
  warning_alert_sent    BOOLEAN DEFAULT false,
  exceeded_alert_sent   BOOLEAN DEFAULT false,
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (species_name, month, year)
);

-- ============================================================
-- TABLE: alerts
-- ============================================================
CREATE TABLE alerts (
  id                    SERIAL PRIMARY KEY,
  type                  VARCHAR(50) NOT NULL,
  severity              VARCHAR(20) NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL')),
  title                 VARCHAR(255) NOT NULL,
  message               TEXT NOT NULL,
  is_read               BOOLEAN DEFAULT false NOT NULL,
  related_entity_type   VARCHAR(50),
  related_entity_id     INTEGER,
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_alerts_read ON alerts(is_read);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE notifications (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL
               CHECK (type IN ('CATCH_APPROVED','CATCH_REJECTED','ORDER_CONFIRMED','SYSTEM')),
  title        VARCHAR(255) NOT NULL,
  message      TEXT NOT NULL,
  data         JSONB DEFAULT '{}'::jsonb,  -- extra context (catch_id, listing_id, etc.)
  is_read      BOOLEAN DEFAULT false NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE audit_logs (
  id              SERIAL PRIMARY KEY,
  actor_id        INTEGER NOT NULL REFERENCES users(id),
  action          VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       INTEGER NOT NULL,
  before_state    JSONB,
  after_state     JSONB,
  ip_address      VARCHAR(45),
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================
-- TABLE: daily_market_stats
-- Materialized aggregate — updated via trigger on orders
-- ============================================================
CREATE TABLE daily_market_stats (
  id               SERIAL PRIMARY KEY,
  stat_date        DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  total_sold_kg    DECIMAL(10,2) DEFAULT 0,
  total_orders     INTEGER DEFAULT 0,
  total_revenue    DECIMAL(12,2) DEFAULT 0,
  active_listings  INTEGER DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON catch_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 32.2 Reference ID Generation

```typescript
// backend/src/utils/referenceId.ts

export async function generateCatchReferenceId(db: Database): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '-');

  // Get today's count
  const result = await db.query(
    `SELECT COUNT(*) as count FROM catch_submissions
     WHERE DATE(submitted_at) = CURRENT_DATE`,
  );
  const sequence = parseInt(result.rows[0].count) + 1;
  const paddedSeq = String(sequence).padStart(4, '0');

  return `CATCH-${dateStr}-${paddedSeq}`;
  // Example: CATCH-2024-05-19-0031
}

export async function generateOrderReferenceId(db: Database): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  const result = await db.query(
    `SELECT COUNT(*) as count FROM orders
     WHERE DATE(ordered_at) = CURRENT_DATE`,
  );
  const sequence = parseInt(result.rows[0].count) + 1;
  const paddedSeq = String(sequence).padStart(4, '0');

  return `ORD-${dateStr}-${paddedSeq}`;
}
```

---

## 33. FILE STORAGE ARCHITECTURE (CLOUDINARY)

### 33.1 Upload Configuration

```typescript
// backend/src/config/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const catchPhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `assa/catches/${new Date().getFullYear()}/${new Date().getMonth() + 1}`,
    public_id: `${Date.now()}-${req.user.id}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, height: 900, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
    resource_type: 'image',
  }),
});

export const catchPhotoUpload = multer({
  storage: catchPhotoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 3, // Max 3 photos per catch
  },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});
```

### 33.2 Photo URL Storage

Photo URLs are stored as a JSONB array in `catch_submissions.photo_urls`:

```json
["https://res.cloudinary.com/assa/image/upload/v1234/assa/catches/2024/5/1234-42.jpg"]
```

On listing creation, the first photo URL is copied to `marketplace_listings` for the listing card thumbnail.

---

## 34. CACHING STRATEGY (REDIS)

| Cache Key Pattern                     | TTL    | Invalidated By                           | Description           |
| ------------------------------------- | ------ | ---------------------------------------- | --------------------- |
| `dashboard:stats:{date}`              | 60s    | SSE event: stats_updated                 | Admin KPI card data   |
| `marketplace:listings:{filters_hash}` | 30s    | SSE event: listing_created, order_placed | Listing grid query    |
| `marketplace:stats:{date}`            | 30s    | SSE event: order_placed                  | Sidebar stats         |
| `species:all`                         | 1 hour | Admin species edit                       | Species dropdown list |
| `zones:all`                           | 1 hour | Admin zone edit                          | Zone dropdown list    |
| `quotas:current:{month}:{year}`       | 60s    | Catch approval                           | Quota bars            |
| `fisher:{id}:profile`                 | 5 min  | Profile update                           | Fisher home screen    |

```typescript
// Cache wrapper utility
async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const fresh = await fetchFn();
  await redis.setex(key, ttlSeconds, JSON.stringify(fresh));
  return fresh;
}
```

---

## 35. API DESIGN (V1 — FULL CONTRACT)

### 35.1 API Conventions

- Base URL: `/api/v1`
- Auth: Bearer token in Authorization header OR HttpOnly cookie
- Content-Type: `application/json` for all requests and responses
- Date format: ISO 8601 (`2024-05-19T06:45:00Z`)
- Pagination: `?page=1&limit=20` with response: `{ data, pagination: { page, limit, total, totalPages } }`
- Error format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Quantity must be between 0.1 and 500 kg",
    "field": "quantity_kg"
  }
}
```

- Success format:

```json
{
  "success": true,
  "data": { ... }
}
```

### 35.2 Authentication Endpoints

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
POST   /api/v1/auth/change-password
```

**POST /api/v1/auth/login**

```json
// Request
{ "email": "tesfaye@fisher.assa.et", "password": "SecurePass1" }

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "user": { "id": 12, "name": "Tesfaye Alemu", "role": "fisher", "email": "..." }
  }
}
// Note: Refresh token set as HttpOnly cookie: Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh
```

### 35.3 Fisher App Endpoints

```
GET    /api/v1/fisher/me                    Get own profile + license
GET    /api/v1/fisher/catches               Get own catch history
GET    /api/v1/fisher/catches/:id           Get single catch detail
POST   /api/v1/catches                      Submit a new catch
POST   /api/v1/catches/photos               Upload photos (multipart/form-data, before submitting catch)
GET    /api/v1/fisher/notifications         Get own notifications
PATCH  /api/v1/fisher/notifications/:id/read  Mark notification read
PATCH  /api/v1/fisher/notifications/read-all  Mark all read
GET    /api/v1/zones                        List all fishing zones
GET    /api/v1/species                      List available species
GET    /api/v1/events                       SSE endpoint
```

**POST /api/v1/catches**

```json
// Request
{
  "speciesId": 1,
  "quantityKg": 25,
  "numberOfFish": 12,
  "fishingGear": "Gill Net",
  "fishingDate": "2024-05-12",
  "fishingTime": "06:30",
  "zoneId": 2,
  "photoUrls": ["https://res.cloudinary.com/.../photo1.jpg"]
}

// Response 201
{
  "success": true,
  "data": {
    "id": 84,
    "referenceId": "CATCH-2024-05-12-0031",
    "status": "PENDING",
    "zoneFlag": null,
    "submittedAt": "2024-05-12T06:45:00Z"
  }
}
```

### 35.4 Admin Dashboard Endpoints

```
GET    /api/v1/admin/dashboard/stats           All KPI data
GET    /api/v1/admin/dashboard/catch-trends    Line chart data (7/30 days)
GET    /api/v1/admin/dashboard/species-breakdown  Donut chart data
GET    /api/v1/admin/catches                   List all catches (filterable)
GET    /api/v1/admin/catches/:id               Catch detail with fisher+zone+quota
PUT    /api/v1/admin/catches/:id/approve       Approve catch
PUT    /api/v1/admin/catches/:id/reject        Reject catch
GET    /api/v1/admin/fishers                   Paginated fishers list
GET    /api/v1/admin/fishers/:id               Fisher detail
GET    /api/v1/admin/quotas                    All species quotas
PUT    /api/v1/admin/quotas/:id                Update quota limit (super_admin)
GET    /api/v1/admin/alerts                    All alerts
PATCH  /api/v1/admin/alerts/:id/read           Mark alert read
PATCH  /api/v1/admin/alerts/read-all           Mark all read
GET    /api/v1/admin/zones                     All zones
PUT    /api/v1/admin/zones/:id                 Update zone (super_admin)
GET    /api/v1/admin/reports/monthly           Monthly summary
GET    /api/v1/admin/users                     User management (super_admin)
POST   /api/v1/admin/users                     Create user (super_admin)
PATCH  /api/v1/admin/users/:id/deactivate      Deactivate user (super_admin)
GET    /api/v1/admin/audit-logs                Immutable audit trail
```

**GET /api/v1/admin/dashboard/stats**

```json
// Response 200
{
  "success": true,
  "data": {
    "totalFishers": 2350,
    "totalFishersDelta": 12,
    "registeredBoats": 1320,
    "registeredBoatsDelta": 8,
    "todayTotalCatchKg": 24560,
    "todayTotalCatchDeltaPercent": 9.7,
    "activeMarkets": 45,
    "activeMarketsDelta": 2,
    "activeAlerts": 7,
    "pendingSubmissions": 12,
    "monthlyStats": {
      "totalCatchKg": 520450,
      "activeFishers": 1980,
      "marketsSupplyKg": 320450,
      "illegalActivities": 23,
      "complianceRate": 92.4
    }
  }
}
```

**PUT /api/v1/admin/catches/:id/approve**

```json
// Request — no body required

// Response 200
{
  "success": true,
  "data": {
    "catchId": 84,
    "referenceId": "CATCH-2024-05-12-0031",
    "status": "VERIFIED",
    "listingId": 52,
    "fisherNotified": true,
    "quotaStatus": {
      "species": "Tilapia",
      "currentKg": 3675,
      "limitKg": 5000,
      "percentage": 73.5,
      "alertTriggered": false
    },
    "reviewedAt": "2024-05-12T07:12:00Z"
  }
}
```

**PUT /api/v1/admin/catches/:id/reject**

```json
// Request
{ "reason": "Catch location is in a prohibited spawning zone. Please review zone regulations before your next submission." }

// Response 200
{
  "success": true,
  "data": {
    "catchId": 84,
    "status": "REJECTED",
    "fisherNotified": true,
    "rejectedAt": "2024-05-12T07:14:00Z"
  }
}
```

### 35.5 Marketplace Endpoints

```
GET    /api/v1/marketplace/listings            All active listings (filterable)
GET    /api/v1/marketplace/listings/:id        Listing detail
GET    /api/v1/marketplace/listings/featured   Latest 4 approved (home page)
GET    /api/v1/marketplace/stats               Market overview sidebar
GET    /api/v1/marketplace/activity            Recent activity feed (last 5)
POST   /api/v1/marketplace/orders              Place an order
GET    /api/v1/marketplace/orders              Buyer's order history
GET    /api/v1/marketplace/orders/:id          Order detail
GET    /api/v1/marketplace/search              Full-text search across listings
```

**GET /api/v1/marketplace/listings**
Query params: `?species=Tilapia&location=North+Zone&minPrice=100&maxPrice=200&availableOnly=true&page=1&limit=12`

```json
// Response 200
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": 52,
        "species": "Tilapia",
        "quantityAvailableKg": 25,
        "pricePerKg": 145,
        "status": "ACTIVE",
        "listedAt": "2024-05-12T07:12:00Z",
        "fisher": {
          "name": "Tesfaye A.",
          "isVerified": true
        },
        "catchInfo": {
          "date": "2024-05-12",
          "zone": "Lake Tana – North Zone",
          "gear": "Gill Net"
        },
        "photos": ["https://res.cloudinary.com/.../photo1.jpg"],
        "badge": "FRESH"
      }
    ],
    "pagination": { "page": 1, "limit": 12, "total": 47, "totalPages": 4 }
  }
}
```

**POST /api/v1/marketplace/orders**

```json
// Request
{ "listingId": 52, "quantityKg": 10, "notes": "For restaurant delivery, please contact 0911..." }

// Response 201
{
  "success": true,
  "data": {
    "orderId": 108,
    "referenceId": "ORD-2024-05-12-0089",
    "listingId": 52,
    "quantityKg": 10,
    "pricePerKg": 145,
    "totalPrice": 1450,
    "quantityRemainingOnListing": 15,
    "status": "CONFIRMED",
    "orderedAt": "2024-05-12T09:32:00Z"
  }
}
```

---

## 36. ERROR HANDLING & LOGGING

### 36.1 Error Codes Reference

| Code                 | HTTP Status | Meaning                                       |
| -------------------- | ----------- | --------------------------------------------- |
| `VALIDATION_ERROR`   | 400         | Input validation failed (Zod)                 |
| `UNAUTHORIZED`       | 401         | No valid access token                         |
| `FORBIDDEN`          | 403         | Authenticated but lacks permission            |
| `NOT_FOUND`          | 404         | Resource not found                            |
| `CONFLICT`           | 409         | State conflict (e.g., catch already reviewed) |
| `RATE_LIMITED`       | 429         | Too many requests                             |
| `LICENSE_EXPIRED`    | 403         | Fisher license not VALID                      |
| `QUOTA_EXCEEDED`     | 422         | Business rule violation                       |
| `INSUFFICIENT_STOCK` | 422         | Order quantity exceeds available              |
| `INTERNAL_ERROR`     | 500         | Unexpected server error                       |

### 36.2 Global Error Handler

```typescript
// backend/src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export function globalErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        fields: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Known application errors
  if (err instanceof AppError) {
    logger.warn({ code: err.code, message: err.message, path: req.path });
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // Unknown errors — log full stack trace
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    },
  });
}
```

### 36.3 Winston Logger Configuration

```typescript
// backend/src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB rotation
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
    ...(process.env.NODE_ENV !== 'production'
      ? [
          new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
          }),
        ]
      : []),
  ],
});
```

---

## 37. INTERCONNECTION FLOWS (DETAILED)

_See Section 17 (User Flows) for the full diagram. This section defines the server-side transaction boundaries._

### 37.1 Approval Transaction Boundary

The following operations MUST execute in a single PostgreSQL transaction on catch approval. If any step fails, the entire transaction rolls back:

```typescript
// backend/src/services/approval.service.ts

export async function approveCatch(
  catchId: number,
  adminId: number,
  ipAddress: string,
): Promise<ApprovalResult> {
  return db.transaction(async (trx) => {
    // 1. Lock the catch row to prevent concurrent approval
    const catch_ = await trx('catch_submissions')
      .where({ id: catchId, status: 'PENDING' })
      .forUpdate()
      .first();

    if (!catch_) throw new AppError('CONFLICT', 'Catch not found or already reviewed', 409);

    // 2. Update catch status
    await trx('catch_submissions').where({ id: catchId }).update({
      status: 'VERIFIED',
      reviewed_by: adminId,
      reviewed_at: new Date(),
    });

    // 3. Get fisher's default price (or calculate from species average)
    const pricePerKg = await getDefaultPriceForSpecies(catch_.species_name, trx);

    // 4. Create marketplace listing
    const [listing] = await trx('marketplace_listings')
      .insert({
        catch_id: catchId,
        fisher_id: catch_.fisher_id,
        species_name: catch_.species_name,
        quantity_available_kg: catch_.quantity_kg,
        original_quantity_kg: catch_.quantity_kg,
        price_per_kg: pricePerKg,
        status: 'ACTIVE',
        listed_at: new Date(),
      })
      .returning('*');

    // 5. Create fisher notification
    await trx('notifications').insert({
      user_id: await getFisherUserId(catch_.fisher_id, trx),
      type: 'CATCH_APPROVED',
      title: 'Catch Approved',
      message: `Your catch ${catch_.reference_id} has been approved and listed in the marketplace.`,
      data: JSON.stringify({ catchId, listingId: listing.id }),
    });

    // 6. Update quota (includes alert creation logic)
    const quotaResult = await updateQuota(
      catch_.species_name,
      catch_.quantity_kg,
      new Date().getMonth() + 1,
      new Date().getFullYear(),
      trx,
    );

    // 7. Write audit log
    await trx('audit_logs').insert({
      actor_id: adminId,
      action: 'CATCH_APPROVED',
      entity_type: 'catch_submission',
      entity_id: catchId,
      after_state: JSON.stringify({ status: 'VERIFIED', listing_id: listing.id }),
      ip_address: ipAddress,
    });

    // 8. All committed — now publish SSE events (outside transaction, best effort)
    setImmediate(async () => {
      await publishEvent('catch_approved', {
        catchId,
        referenceId: catch_.reference_id,
        listingId: listing.id,
        fisherId: catch_.fisher_id,
      });
      await publishEvent('listing_created', {
        listingId: listing.id,
        species: catch_.species_name,
        quantityKg: catch_.quantity_kg,
        pricePerKg,
        fisherId: catch_.fisher_id,
      });
      await publishEvent('stats_updated', { trigger: 'catch_approved' });
    });

    return {
      catchId,
      status: 'VERIFIED',
      listingId: listing.id,
      fisherNotified: true,
      quotaStatus: quotaResult,
    };
  });
}
```

---

# PART V — SECURITY & COMPLIANCE

---

## 38. THREAT MODEL (STRIDE)

### 38.1 Asset Inventory

| Asset                                          | Sensitivity | Impact if Compromised               |
| ---------------------------------------------- | ----------- | ----------------------------------- |
| Fisher personal data (name, license, location) | HIGH        | Privacy violation, PDPP breach      |
| Catch submission data                          | HIGH        | Quota manipulation, false reporting |
| Admin credentials                              | CRITICAL    | Full system control                 |
| Marketplace order data                         | MEDIUM      | Buyer privacy                       |
| GPS coordinates                                | HIGH        | Fisher location tracking            |
| Quota enforcement data                         | HIGH        | Enables overfishing if manipulated  |

### 38.2 STRIDE Analysis

| Threat                     | Scenario                                                 | Control                                                                    |
| -------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Spoofing**               | Attacker impersonates a fisher to submit false catches   | JWT signature verification; login rate limiting; account lockout           |
| **Spoofing**               | Attacker impersonates admin to approve own catches       | Role-based middleware on all admin routes; audit logging                   |
| **Tampering**              | Attacker modifies a catch reference ID to claim approval | Reference IDs are system-generated and immutable; no PUT endpoint for them |
| **Tampering**              | SQL injection via species or location fields             | Parameterized queries via Drizzle ORM; Zod input validation                |
| **Repudiation**            | Admin denies approving a suspicious catch                | Immutable audit_logs table with IP, timestamp, actor_id                    |
| **Information Disclosure** | Buyer API endpoint leaks fisher GPS coordinates          | GPS coordinates never returned in marketplace API; only zone name          |
| **Information Disclosure** | Fisher can access another fisher's catch data            | Row-level WHERE fisher_id = req.user.fisher_id enforced in backend         |
| **Denial of Service**      | Mass submission spam from a single IP                    | Rate limiting: 60 req/min per IP via Nginx; 10 submissions/hr per fisher   |
| **Elevation of Privilege** | Fisher manipulates JWT to claim admin role               | Role stored in DB, not only in token; verified on every request            |
| **Elevation of Privilege** | IDOR: buyer accesses another buyer's orders              | GET /orders always filters by buyer_id = req.user.id                       |

---

## 39. AUTHENTICATION & AUTHORIZATION ARCHITECTURE

### 39.1 Token Design

```
Access Token:
- Algorithm: HS256
- Expiry: 15 minutes
- Payload: { sub: userId, role: 'fisher', iat, exp }
- Stored: Memory (React state) — never localStorage

Refresh Token:
- Algorithm: HS256 (different secret)
- Expiry: 7 days
- Stored: HttpOnly, Secure, SameSite=Strict cookie
- Tracked: refresh_tokens table (can be revoked)
```

### 39.2 Auth Middleware

```typescript
// backend/src/middleware/auth.ts

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Always verify user still exists and is active
    const user = await db.users.findOne({ id: payload.sub, is_active: true });
    if (!user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

    req.user = { id: user.id, role: user.role, email: user.email };
    next();
  } catch {
    return res
      .status(401)
      .json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token expired or invalid' },
      });
  }
};

export const requireRole =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    }
    next();
  };
```

### 39.3 Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});

// Login rate limit (stricter)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
});

// Catch submission rate limit
export const catchSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 submissions per hour per IP
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
});
```

---

## 40. OWASP TOP 10 COMPLIANCE

| OWASP Risk                    | ASSA Control                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------- |
| A01 Broken Access Control     | Role middleware on all routes; row-level user filtering; IDOR prevention          |
| A02 Cryptographic Failures    | Bcrypt password hashing (rounds: 12); HTTPS-only; HttpOnly cookies for tokens     |
| A03 Injection                 | Drizzle ORM parameterized queries; Zod schema validation on all inputs            |
| A04 Insecure Design           | Threat model completed; approval flow requires human review; audit logs immutable |
| A05 Security Misconfiguration | Helmet.js headers; no default credentials in production; env vars for all secrets |
| A06 Vulnerable Components     | npm audit in CI pipeline; Dependabot configured on repo                           |
| A07 Auth Failures             | Account lockout at 5 attempts; refresh token rotation; logout revokes token       |
| A08 Data Integrity Failures   | DB transactions for multi-step operations; CSRF protection (SameSite=Strict)      |
| A09 Logging Failures          | Winston structured logging; audit_logs table; error monitoring (Sentry)           |
| A10 SSRF                      | File uploads go to Cloudinary only; no server-side URL fetching                   |

### Security Headers (Helmet.js)

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", process.env.API_URL!],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
);
```

---

## 41. DATA PRIVACY & COMPLIANCE (ETHIOPIA PDPP 2024)

### 41.1 Data Processing Register

| Data Category     | Fields                               | Legal Basis                               | Retention                   | Shared With                               |
| ----------------- | ------------------------------------ | ----------------------------------------- | --------------------------- | ----------------------------------------- |
| Fisher Identity   | name, email, phone, license_number   | Legal obligation (Fisheries Proclamation) | Life of license + 5 years   | Ministry of Fisheries (internal)          |
| Catch Submissions | species, quantity, zone, GPS, photos | Legal obligation                          | 7 years (regulatory record) | Admin officers only                       |
| Location Data     | GPS coordinates (per catch)          | Legal obligation                          | With catch record (7 years) | Admin only; rounded to 2dp in any reports |
| Buyer Orders      | name, order items, amounts           | Contractual                               | 3 years                     | Seller (fisher name only, anonymized)     |
| System Logs       | IP address, user agent, actions      | Legitimate interest (security)            | 90 days rolling             | Security officers only                    |

### 41.2 Fisher Rights Implementation

| Right                  | Implementation                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Right of Access        | Profile page shows all personal data held; admin can export on request                 |
| Right to Erasure       | Account deletion request → personal fields nulled; catch records retained (regulatory) |
| Right to Rectification | Fisher can update name, phone, email via Profile; license changes via admin            |
| Right to Object        | Fisher can opt out of marketing (no marketing in V1 anyway)                            |
| Data Portability       | Admin can export a fisher's catch history as CSV on request                            |

### 41.3 Data Breach Response Plan

1. Security officer detects breach or receives report
2. Within 1 hour: Contain breach (rotate credentials, disable compromised accounts)
3. Within 24 hours: Internal assessment — what data was accessed?
4. Within 72 hours: Notify Ethiopian Data Protection Authority (per PDPP Art. 32)
5. Within 72 hours: Notify affected users if high risk to their rights
6. Within 7 days: Full incident report prepared
7. Post-incident: Root cause analysis; control improvements implemented

### 41.4 Privacy by Design Requirements

- GPS coordinates are stored in the database but NEVER returned in marketplace API responses
- Marketplace API returns only: fisher's first name, verified badge, and listing details — no license number, no contact info, no full address
- Admin API returns full fisher data only to authenticated admin/super_admin roles
- Photo filenames are random UUIDs — no personally identifiable info in URLs
- System logs are purged after 90 days via scheduled job

---

## 42. DATA RETENTION POLICY

| Data Type           | Retention Period             | Deletion Method                                  | Authority                      |
| ------------------- | ---------------------------- | ------------------------------------------------ | ------------------------------ |
| Catch submissions   | 7 years                      | Anonymize fisher data; retain catch data         | Legal (Fisheries Proclamation) |
| Marketplace orders  | 3 years                      | Anonymize buyer data; retain transaction amounts | Legal (Commercial Code)        |
| User accounts       | Duration of account + 1 year | Soft delete → hard delete after grace period     | PDPP 2024                      |
| Photos (Cloudinary) | 2 years from upload          | Cloudinary auto-delete rule                      | Internal policy                |
| System logs         | 90 days                      | Log rotation via Winston maxFiles                | Internal policy                |
| Audit logs          | 10 years                     | Archive to cold storage after 2 years            | Legal (government audit)       |
| Refresh tokens      | 7 days + expired             | Nightly cleanup job                              | Internal policy                |

---

# PART VI — QUALITY & OPERATIONS

---

## 43. TESTING STRATEGY

### 43.1 Test Pyramid

```
           ┌─────────────┐
           │   E2E Tests │  (Playwright)
           │    ~10%     │  Critical user journeys only
           ├─────────────┤
           │ Integration │  (Jest + Supertest)
           │    ~30%     │  API endpoints + DB
           ├─────────────┤
           │  Unit Tests │  (Jest / Vitest)
           │    ~60%     │  Services, utilities, components
           └─────────────┘
```

### 43.2 Backend Test Requirements

**Must test (unit):**

- `quota.service.ts` — all quota calculation branches (< 75%, 75-89%, 90-99%, 100%+)
- `referenceId.ts` — correct format generation, no duplicates
- `approval.service.ts` — transaction rollback on failure
- `zoneFlag` evaluation — all three zone types
- All Zod validation schemas — valid and invalid inputs

**Must test (integration — Supertest):**

- POST /api/v1/catches — full submission flow
- PUT /api/v1/admin/catches/:id/approve — atomic approval, listing creation, notification
- PUT /api/v1/admin/catches/:id/reject — status update, notification with reason
- POST /api/v1/marketplace/orders — order placement, quantity reduction
- Auth flow — login, refresh, logout, 401 on expired token
- RBAC — fisher cannot hit admin routes; buyer cannot hit fisher routes

### 43.3 Frontend Test Requirements

**Fisher App — must test:**

- Catch submission wizard: all 4 steps complete correctly
- License expired: submit button disabled
- My Catches status badges render correctly per status value
- Notification bell badge increments on unread notification

**Admin Dashboard — must test:**

- KPI cards render with correct values
- Quota bars change color at correct thresholds (75%, 90%)
- Approve action calls correct API endpoint with correct ID
- Reject action: disabled until reason input meets minimum length

**Marketplace — must test:**

- Listing grid shows only ACTIVE listings
- Species filter updates query params and re-fetches
- Order form: submit button disabled when quantity exceeds available
- Order confirmation modal shows correct total price calculation

### 43.4 E2E Test Scenarios (Playwright)

| Scenario                                                   | Priority |
| ---------------------------------------------------------- | -------- |
| Complete catch-to-market flow (all 5 steps, 3 windows)     | P0       |
| Fisher with expired license cannot submit                  | P0       |
| Admin approves catch → marketplace listing appears in < 5s | P0       |
| Buyer orders fish → admin dashboard stats update           | P1       |
| Catch from prohibited zone triggers alert in admin         | P1       |
| Quota reaches 90% after approval → alert appears           | P1       |

### 43.5 Test Coverage Targets

| Layer               | Target                      |
| ------------------- | --------------------------- |
| Backend services    | 90% line coverage           |
| Backend API routes  | 80% line coverage           |
| Frontend components | 70% line coverage           |
| E2E critical paths  | 100% (all 6 scenarios pass) |

---

## 44. PERFORMANCE & SCALABILITY REQUIREMENTS

### 44.1 Performance Targets

| Metric                                 | Target       | Measurement Method       |
| -------------------------------------- | ------------ | ------------------------ |
| API p50 response time                  | < 150ms      | Load test with k6        |
| API p95 response time                  | < 400ms      | Load test with k6        |
| API p99 response time                  | < 800ms      | Load test with k6        |
| Dashboard page load (all charts)       | < 2.5s       | Lighthouse / network tab |
| Fisher App first contentful paint      | < 1.5s on 3G | Lighthouse throttled     |
| Marketplace listing page load          | < 1.5s       | Lighthouse               |
| SSE event delivery (approval → client) | < 3s         | Manual test during demo  |

### 44.2 Load Test Scenarios

**Scenario 1 — Morning peak (06:00–08:00)**

- 200 concurrent fishers submitting catches
- Expected load: ~200 POST /catches within 2 hours (~3/min)
- Target: All requests succeed; p95 < 400ms

**Scenario 2 — Admin dashboard**

- 5 concurrent admin users with dashboards open (SSE connections)
- Continuous polling every 60s for stats
- Target: Stable SSE connections; no dropped events

**Scenario 3 — Marketplace peak**

- 50 concurrent buyers browsing
- 10 concurrent orders per minute
- Target: No race conditions on quantity_available; all inventory accurate

### 44.3 Scalability Design Notes

**PostgreSQL connection pooling:** Use `pg-pool` with max 20 connections per backend instance. With 2 PM2 instances = 40 total connections. PostgreSQL 16 default max_connections = 100. Headroom sufficient for V1.

**Redis pub/sub:** Single Redis instance handles all SSE broadcasting. At V1 scale (< 500 concurrent users), this is more than sufficient.

**Horizontal scaling path (V2):** When load requires multiple backend instances, Redis pub/sub already ensures SSE events broadcast correctly across all instances. Stateless JWT auth means no sticky sessions needed for API routes. The architecture is already horizontally scalable without changes.

---

## 45. DISASTER RECOVERY & BUSINESS CONTINUITY

### 45.1 Recovery Objectives

| Objective                      | Target                                               |
| ------------------------------ | ---------------------------------------------------- |
| Recovery Time Objective (RTO)  | < 1 hour                                             |
| Recovery Point Objective (RPO) | < 15 minutes                                         |
| Database backup frequency      | Every 15 minutes (WAL streaming) + daily full backup |
| Backup retention               | 30 daily backups; 12 monthly backups                 |

### 45.2 Backup Architecture

```
PostgreSQL (Primary)
    │
    ├── WAL streaming → Replica (standby)     ← Hot failover
    │
    └── Daily pg_dump → Backblaze B2           ← Point-in-time recovery
         (compressed, encrypted at rest)
```

### 45.3 Failure Scenarios & Response

| Scenario                | Detection                                | Response                                                           | RTO                  |
| ----------------------- | ---------------------------------------- | ------------------------------------------------------------------ | -------------------- |
| Backend process crash   | PM2 auto-restart; UptimeRobot alert      | PM2 restarts in < 5s automatically                                 | < 1 min              |
| Database server failure | Application error logs; monitoring alert | Promote standby replica; update connection string                  | < 20 min             |
| Redis failure           | Connection error in logs                 | Restart Redis; cache miss → DB fallback; SSE reconnects            | < 5 min              |
| Cloudinary outage       | Upload fails; log error                  | Catch submissions accepted without photos; retry upload on restore | Graceful degradation |
| Full server failure     | UptimeRobot down alert                   | Provision new VPS; restore from backup; restore DNS                | < 1 hour             |

### 45.4 Database Reset Script (Demo / Development)

```bash
# scripts/reset-demo-db.sh
# Restores the database to a known demo state in under 30 seconds

#!/bin/bash
echo "Resetting ASSA demo database..."
psql $DATABASE_URL -c "TRUNCATE TABLE orders, marketplace_listings, notifications, alerts, catch_submissions, species_quotas, audit_logs, refresh_tokens RESTART IDENTITY CASCADE;"
psql $DATABASE_URL -f ./src/database/seed.sql
echo "Demo database reset complete. ✅"
```

---

## 46. SERVICE LEVEL AGREEMENT (SLA)

### 46.1 Availability Commitments

| Tier            | Target | Measurement Period | Planned Downtime                                   |
| --------------- | ------ | ------------------ | -------------------------------------------------- |
| Production API  | 99.5%  | Monthly            | Saturdays 02:00–04:00 EAT                          |
| Admin Dashboard | 99.5%  | Monthly            | Same window                                        |
| Fisher App      | 99.0%  | Monthly            | Same window + peak fishing hours always guaranteed |
| Marketplace     | 99.0%  | Monthly            |                                                    |

**99.5% monthly = maximum 3.65 hours downtime per month**

### 46.2 Support SLA

| Priority      | Description                                | First Response  | Resolution Target |
| ------------- | ------------------------------------------ | --------------- | ----------------- |
| P1 — Critical | System down; no one can access             | 30 minutes      | 2 hours           |
| P2 — High     | Core feature broken (approval, submission) | 2 hours         | 8 hours           |
| P3 — Medium   | Non-core feature broken; workaround exists | 8 hours         | 2 business days   |
| P4 — Low      | Minor UI bug; cosmetic issue               | 2 business days | Next sprint       |

### 46.3 Incident Response Process

1. Alert triggers (UptimeRobot + PM2 + Sentry) → Team notified via Telegram/email
2. On-call engineer acknowledges within response time
3. Status page updated (simple status.assa.gov.et page)
4. Fix deployed to staging → tested → deployed to production
5. Post-incident report within 48 hours for P1/P2 incidents

---

## 47. OPERATIONAL RUNBOOK

### Common Operations

**Reset a fisher's password:**

```bash
# Via admin dashboard Users page (super_admin only)
# Or via CLI:
npx ts-node scripts/reset-password.ts --email "fisher@email.com" --temp-password "TempPass123!"
```

**Force-expire current month's quota reset:**

```sql
UPDATE species_quotas
SET current_month_kg = 0, warning_alert_sent = false, exceeded_alert_sent = false
WHERE month = EXTRACT(MONTH FROM NOW()) AND year = EXTRACT(YEAR FROM NOW());
```

**Manually reseed demo data:**

```bash
npm run db:reset-demo
# Runs /scripts/reset-demo-db.sh
```

**View live error logs:**

```bash
pm2 logs assa-api --lines 100
# Or
tail -f /app/logs/error.log
```

**Backup database manually:**

```bash
pg_dump $DATABASE_URL -Fc > backup_$(date +%Y%m%d_%H%M%S).dump
```

**Unlock a locked account:**

```sql
UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = 'user@email.com';
```

---

## 48. ONBOARDING & TRAINING PLAN

### 48.1 Fisher Onboarding

**Channel:** Organized sessions through Lake Tana Fishers Cooperative offices and landing sites

**Materials needed:**

- A4 printed quick-start guide in Amharic (4 pages, large print)
- YouTube video walkthrough in Amharic (5 minutes max)
- In-app guided tour (first login only — 5-step overlay tutorial)
- Plastic card with QR code linking to app URL + license number reminder

**Training sessions:**

- 1-day group training at Gorgora, Bahir Dar, Fogera, and Woreta landing sites
- 5–10 fishers per session; demo device provided if needed
- Focus on: login, home screen, submit catch (4 steps), checking status

**Post-training support:**

- Dedicated WhatsApp number for fisher support (staffed 06:00–18:00)
- "Contact Support" button in app routes to WhatsApp

### 48.2 Admin User Onboarding

**Who needs training:** All admin users, field officers

**Materials:**

- 30-minute recorded screen-capture walkthrough of the full admin dashboard
- Written SOP (standard operating procedure) for: reviewing catches, approving/rejecting, managing alerts, reading quota bars
- Role-specific quick reference card (1 page per role)

**Training sessions:**

- Half-day onboarding session at Ministry of Fisheries, Bahir Dar
- Practical exercises: approve 5 catches, reject 2, generate monthly report

### 48.3 Marketplace Buyer Onboarding

- Self-service registration (no training needed for tech-comfortable users)
- Onboarding email on first registration with 3-step guide
- "How ASSA Works" section on marketplace home page

---

## 49. CHANGE MANAGEMENT

### Barriers to Adoption & Mitigation

| Barrier                                     | Group Affected          | Mitigation                                                                  |
| ------------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| "I've always used paper — why change?"      | Older fishers           | Emphasize market access benefit; peer champions                             |
| Fear of government tracking (location data) | Fishers                 | Clear communication: GPS used only for catch verification, not surveillance |
| Admin staff resistance to new tools         | Ministry staff          | Training + emphasize time savings vs paper; senior champion required        |
| Internet connectivity concerns              | Fishers in remote zones | Offline draft capability (V2); WiFi hotspots at landing sites               |
| "What happens to my data?"                  | All users               | Clear privacy policy in Amharic; data rights explained at registration      |

### Change Champion Program

Identify 2–3 respected, tech-comfortable fishers from each zone to become "ASSA Champions." They receive early access, additional training, and a small compensation for helping peers onboard. This peer-to-peer model is more effective than top-down government instruction for fisher adoption.

---

# PART VII — DELIVERY

---

## 50. NON-FUNCTIONAL REQUIREMENTS

| ID     | Category        | Requirement                            | Metric                               |
| ------ | --------------- | -------------------------------------- | ------------------------------------ |
| NFR-01 | Performance     | API p95 response time                  | < 400ms under normal load            |
| NFR-02 | Performance     | SSE event delivery after trigger       | < 3 seconds                          |
| NFR-03 | Performance     | Fisher App first contentful paint (3G) | < 2 seconds                          |
| NFR-04 | Reliability     | Monthly uptime                         | >= 99.5%                             |
| NFR-05 | Reliability     | Zero data loss                         | DB transactions + backups            |
| NFR-06 | Scalability     | Concurrent users (V1)                  | 200 fishers + 20 admins + 100 buyers |
| NFR-07 | Security        | All endpoints require valid auth       | 100%                                 |
| NFR-08 | Security        | HTTPS everywhere                       | TLS 1.2+                             |
| NFR-09 | Usability       | Fisher App — complete submission       | < 4 minutes for trained user         |
| NFR-10 | Usability       | Admin — complete approval              | < 1 minute per catch                 |
| NFR-11 | Accessibility   | WCAG 2.1 AA compliance                 | All three modules                    |
| NFR-12 | Maintainability | Test coverage (backend services)       | >= 90%                               |
| NFR-13 | Maintainability | All env-specific config in .env        | No hardcoded secrets                 |
| NFR-14 | Observability   | All errors logged with context         | Winston + Sentry                     |
| NFR-15 | Observability   | All admin actions in audit log         | 100% coverage                        |

---

## 51. RISKS & MITIGATIONS

| ID   | Risk                                                           | Likelihood | Impact   | Mitigation                                                                   |
| ---- | -------------------------------------------------------------- | ---------- | -------- | ---------------------------------------------------------------------------- |
| R-01 | PostgreSQL race condition on concurrent approval of same catch | Low        | High     | SELECT FOR UPDATE lock in approval transaction                               |
| R-02 | SSE connections drop under load causing stale UI               | Medium     | Medium   | TanStack Query invalidation as fallback; 60s polling backup                  |
| R-03 | Cloudinary free tier bandwidth exceeded during demo            | Low        | Medium   | Pre-upload all demo photos; don't use Cloudinary upload during live demo     |
| R-04 | Redis unavailable — SSE events not delivered                   | Low        | Medium   | API responses still correct; UI degrades to manual refresh gracefully        |
| R-05 | Scope creep in final week                                      | High       | High     | Feature freeze after Week 4; only bug fixes in Week 5                        |
| R-06 | DB schema change breaks existing seed data                     | Medium     | High     | Drizzle migrations are versioned; test migration on copy of seed data        |
| R-07 | JWT secret leaked in code repository                           | Low        | Critical | Use .env; .gitignore; pre-commit secret scanning hook                        |
| R-08 | SSE and HTTP/2 multiplexing issues on Nginx                    | Low        | Medium   | Test Nginx config early; document the X-Accel-Buffering header fix           |
| R-09 | Drizzle ORM learning curve slows early development             | Medium     | Medium   | Use Drizzle's query builder (not raw SQL) from day 1; team workshop on Day 1 |
| R-10 | TypeScript adds overhead for junior developers                 | Medium     | Medium   | Keep types simple; use Zod inference to avoid duplicate type definitions     |

---

## 52. ASSUMPTIONS

| #    | Assumption                                                                    | Impact if Wrong                                                 |
| ---- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| A-01 | PostgreSQL 16 available on development and production machines                | Use Docker Compose to guarantee version                         |
| A-02 | Cloudinary free tier (25GB storage) is sufficient for demo + V1 pilot         | Upgrade to paid plan if needed; budget ETB 1,200/year           |
| A-03 | Redis Cloud free tier (30MB) is sufficient for SSE pub/sub at pilot scale     | Sufficient for < 1000 concurrent users                          |
| A-04 | All demo users are pre-seeded; no live account creation during presentation   | Seed script must run cleanly before every demo                  |
| A-05 | Ethiopian government servers permit SSE connections (not blocked by firewall) | Test on target network environment; have polling fallback       |
| A-06 | Fisher smartphones support modern browsers (Chrome 90+, Android 8+)           | App is tested on Chrome 90; basic layout works on older devices |
| A-07 | Team has 5 weeks of focused development time                                  | Adjust delivery plan if timeline changes                        |
| A-08 | Cloudinary image delivery is accessible from Ethiopia (not geo-blocked)       | Pre-test; fallback: serve photos from local /uploads directory  |

---

## 53. MVP DELIVERY PLAN

### 53.1 Recommended Team Structure

| Role                | Responsibilities                       | Skills Needed                           |
| ------------------- | -------------------------------------- | --------------------------------------- |
| Full-Stack Lead     | Backend API + database + auth          | TypeScript, Node.js, PostgreSQL, Docker |
| Frontend Dev 1      | Admin Dashboard (all pages + charts)   | React, Tailwind, Recharts               |
| Frontend Dev 2      | Fisher App (all screens + wizard)      | React, Tailwind, mobile-first           |
| Frontend Dev 3      | Marketplace (all pages + order flow)   | React, Tailwind, TanStack Query         |
| Product/Design Lead | PRD, design system, demo, coordination | Figma/design, QA, presentation          |

### 53.2 Development Sprint Plan (5 Weeks)

**Week 1 — Foundation (All team members)**
| Day | Task |
|-----|------|
| 1 | Docker Compose setup; PostgreSQL schema applied; Redis running; Vite projects scaffolded for all 3 modules |
| 2 | Design system: Tailwind config with color tokens, typography, component classes documented in Storybook or README |
| 3 | Auth backend: login, refresh, logout, JWT middleware, role middleware |
| 4 | Auth frontend: login pages for all 3 modules; token storage in React state; redirect on 401 |
| 5 | Seed data script: all tables populated with realistic Ethiopian data; verify DB state |

**Week 2 — Core Module Features**
| Task | Who |
|------|-----|
| Fisher App: Home screen (license card, today's summary, quick actions) | FE Dev 2 |
| Fisher App: Catch wizard Steps 1–4 (forms only, no API call yet) | FE Dev 2 |
| Admin Dashboard: Layout + sidebar navigation | FE Dev 1 |
| Admin Dashboard: Dashboard overview page (KPI cards + charts with mock data) | FE Dev 1 |
| Marketplace: Home page (hero, listing grid, filter sidebar with mock data) | FE Dev 3 |
| Backend: POST /api/v1/catches (submit catch, validate, save, reference ID) | BE Lead |
| Backend: GET /api/v1/admin/catches (list with filters) | BE Lead |
| Backend: GET /api/v1/marketplace/listings (filtered query) | BE Lead |

**Week 3 — Interconnection (Critical Week)**
| Task | Who |
|------|-----|
| Backend: Approval transaction service (approve → listing + notification + quota) | BE Lead |
| Backend: Rejection flow | BE Lead |
| Backend: SSE service + Redis pub/sub | BE Lead |
| Admin Dashboard: Catch detail view + Approve/Reject UI | FE Dev 1 |
| Fisher App: My Catches with live status (SSE integration) | FE Dev 2 |
| Fisher App: Notification panel | FE Dev 2 |
| Marketplace: SSE-driven listing updates; Recent Activity feed | FE Dev 3 |
| **END OF WEEK 3: First full end-to-end demo run** | All |

**Week 4 — Completeness & Polish**
| Task | Who |
|------|-----|
| Marketplace: Listing detail page + order flow + success page | FE Dev 3 |
| Admin Dashboard: Quota & Rules page; Alerts page; Fishermen list | FE Dev 1 |
| Fisher App: Fishing Zones view; Profile page | FE Dev 2 |
| Backend: All remaining endpoints; comprehensive error handling | BE Lead |
| Backend: Rate limiting; input validation on all routes | BE Lead |
| All modules: Loading states, empty states, error states | All FE |
| Cloudinary integration for photo uploads | BE Lead + FE Dev 2 |
| Seed data: Finalize realistic data; test demo script against it | Product Lead |

**Week 5 — QA, Demo Prep, Documentation**
| Task | Who |
|------|-----|
| Backend test suite: unit + integration tests for all critical paths | BE Lead |
| E2E test: Complete catch-to-market flow (Playwright) | Product Lead |
| Bug fixes only (feature freeze Monday of Week 5) | All |
| Demo script rehearsal × 3 (with timing) | All |
| README: Setup instructions + API documentation | BE Lead |
| Database reset script: verified working in < 30 seconds | BE Lead |
| Final presentation preparation | Product Lead |

### 53.3 Definition of Done

A feature is "done" when:

- [ ] Functionality works as specified in the PRD
- [ ] Error states handled (empty data, network failure, validation errors)
- [ ] Loading states implemented (skeleton screens or spinners)
- [ ] Works at the correct viewport (mobile for Fisher App; desktop for Admin/Marketplace)
- [ ] No console errors in browser
- [ ] Backend route has input validation (Zod)
- [ ] New API endpoint documented in Swagger
- [ ] Tested manually by at least one other team member

---

## 54. FUTURE ROADMAP

### V2.0 (3–6 months post-launch)

| Feature                | Description                                                     | Dependency                         |
| ---------------------- | --------------------------------------------------------------- | ---------------------------------- |
| Amharic UI             | Full Amharic translation using react-i18next                    | i18n architecture already in place |
| PWA offline mode       | Catch drafts cached locally, submitted when online              | Service Worker + IndexedDB         |
| Catch certificate (QR) | Admin-approved catches generate a PDF certificate with QR code  | pdfkit or puppeteer                |
| SMS notifications      | Fisher notified via SMS on approval/rejection                   | Africa's Talking API               |
| Fisher OTP login       | Login via mobile number + OTP (eliminates password for fishers) | Africa's Talking SMS OTP           |
| Bulk admin actions     | Approve/reject multiple catches at once                         | Admin UI enhancement               |
| Seller price setting   | Fishers can set their own listing price (V1 uses auto-price)    | Fisher App new feature             |
| Advanced analytics     | 30/60/90-day trends, zone comparison, species trend analysis    | Admin Dashboard extension          |
| Buyer rating system    | Buyers can rate fishers on delivery quality                     | New feature                        |

### V3.0 (12–24 months)

| Feature                  | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| Multi-region             | Support Lakes Ziway, Hawassa, Abijata-Shala           |
| Real GPS                 | Device geolocation auto-fill in Fisher App            |
| Mobile money             | Telebirr or CBE Birr payment integration              |
| National ID verification | Verify fisher identity against NIDA database          |
| Fraud detection          | ML model flagging statistically anomalous catches     |
| Public data API          | Anonymized catch trend data for research institutions |
| Mobile app (iOS/Android) | React Native wrapper for native push notifications    |
| Water quality data       | Environmental sensor data overlaid on zone map        |

---

## 55. SUCCESS METRICS / KPIs

### 55.1 Launch Success (30 Days Post-Launch)

| KPI                      | Target               | Measurement                                      |
| ------------------------ | -------------------- | ------------------------------------------------ |
| Fisher registrations     | 200+                 | users table COUNT WHERE role='fisher'            |
| Catch submissions        | 500+                 | catch_submissions COUNT                          |
| Admin approval rate      | > 85% within 4 hours | reviewed_at - submitted_at median                |
| Marketplace listings     | 50+ active           | marketplace_listings COUNT WHERE status='ACTIVE' |
| Marketplace orders       | 30+                  | orders COUNT                                     |
| System uptime            | >= 99%               | UptimeRobot monthly report                       |
| Zero data loss incidents | 0                    | Incident log                                     |

### 55.2 6-Month Operating KPIs

| KPI                                                    | Target             |
| ------------------------------------------------------ | ------------------ |
| Weekly active fishers (submitted >= 1 catch)           | 60% of registered  |
| Admin daily active users                               | >= 3               |
| Average submission-to-approval time                    | < 4 hours          |
| Quota violations (any species exceeding monthly limit) | 0 per month        |
| Fisher app crash rate                                  | < 0.5% of sessions |
| Support tickets per week                               | < 10               |
| Compliance rate (fishers submitting vs. known active)  | >= 60%             |

### 55.3 University Evaluation KPIs

| Demonstration Criterion                        | Pass Condition                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| Module visual distinction                      | Each module has unmistakably different visual identity            |
| Cause → effect: submission → admin             | New catch appears in admin queue within 5 seconds                 |
| Cause → effect: approval → marketplace         | Listing appears in marketplace within 5 seconds of admin approval |
| Cause → effect: approval → fisher notification | Fisher notification appears within 5 seconds                      |
| Cause → effect: order → dashboard stats        | Dashboard metrics update after order placed                       |
| Quota alert:                                   | Alert appears after simulated quota crossing                      |
| Realistic data                                 | Ethiopian names, ETB prices, Lake Tana zones throughout           |
| End-to-end demo duration                       | 7 minutes or less for full walkthrough                            |

---

# APPENDICES

---

## APPENDIX A — FISH SPECIES REFERENCE

| Species        | Scientific Name       | Amharic | Default Price ETB/kg | Default Monthly Quota | Notes                                               |
| -------------- | --------------------- | ------- | -------------------- | --------------------- | --------------------------------------------------- |
| Tilapia        | Oreochromis niloticus | ጢላፒያ    | 145                  | 5,000 kg              | Most common; Lake Tana's primary commercial species |
| Nile Perch     | Lates niloticus       | ናይሎቲካስ  | 195                  | 2,000 kg              | High value; larger specimen                         |
| Catfish        | Clarias gariepinus    | ቀሌጦ     | 130                  | 2,000 kg              | Common bottom feeder                                |
| Barbus (Ganfo) | Labeobarbus spp.      | ጋንፎ     | 110                  | 1,000 kg              | Endemic to Lake Tana; ecologically sensitive        |
| Carp           | Cyprinus carpio       | ካርፕ     | 95                   | 1,500 kg              | Introduced species                                  |
| Other          | Various               | ሌሎች     | 100                  | 800 kg                | Miscellaneous species                               |

---

## APPENDIX B — FISHING ZONE REFERENCE (LAKE TANA)

| Code | Zone Name                          | Type       | GPS Center             | Notes                            |
| ---- | ---------------------------------- | ---------- | ---------------------- | -------------------------------- |
| Z-01 | Lake Tana – North Zone (Gorgora)   | ALLOWED    | 12.3667° N, 37.2833° E | Primary north zone; high density |
| Z-02 | Lake Tana – East Zone (Woreta)     | ALLOWED    | 11.9211° N, 37.6925° E | Eastern shore; active            |
| Z-03 | Lake Tana – South Zone (Bahir Dar) | ALLOWED    | 11.5742° N, 37.3614° E | Near city; high volume           |
| Z-04 | Lake Tana – West Zone (Mecha)      | RESTRICTED | 11.7167° N, 37.1500° E | Seasonal restrictions May–Aug    |
| Z-05 | Zege Peninsula Waters              | RESTRICTED | 11.6800° N, 37.3200° E | Ecotourism zone; limited fishing |
| Z-06 | Lake Tana – Core Protected Area    | PROHIBITED | 11.8500° N, 37.3000° E | Breeding grounds; strict no-fish |

---

## APPENDIX C — SEED DATA SPECIFICATION

The seed script must produce the following baseline data for a convincing demo:

| Entity                        | Count | Notes                                                  |
| ----------------------------- | ----- | ------------------------------------------------------ |
| Admin users                   | 3     | 1 super_admin, 2 admin                                 |
| Fisher users                  | 15    | Mix of Valid/Expired licenses; realistic Amharic names |
| Buyer users                   | 5     | Bahir Dar residents/businesses                         |
| Boats                         | 12    | One per active fisher                                  |
| Historical catches (VERIFIED) | 45    | Spread across 30 days, all 6 species                   |
| Historical catches (REJECTED) | 8     | Mix of reasons                                         |
| Historical catches (PENDING)  | 3     | For admin to process in demo                           |
| Active marketplace listings   | 28    | Various species, quantities, prices                    |
| Historical orders             | 12    | Gives Recent Activity feed content                     |
| Pre-existing alerts           | 5     | 2 quota warnings, 2 zone flags, 1 new license          |
| Species quotas                | 6     | Set at 60–80% usage to create urgency                  |

**Key demo fisher account:**

- Name: Tesfaye Alemu
- Email: tesfaye@fisher.assa.et
- Password: Fisher2024!
- License: FSH-2024-00125 (VALID, expires Dec 2024)
- Boat: Blue Star

**Key demo admin account:**

- Name: Dawit Bekele
- Email: dawit@admin.assa.et
- Password: Admin2024!
- Role: super_admin

**Key demo buyer account:**

- Name: Mesfin Hailu
- Email: mesfin@buyer.assa.et
- Password: Buyer2024!
- Organization: Blue Nile Restaurant

---

## APPENDIX D — ENVIRONMENT VARIABLES REFERENCE

```bash
# backend/.env.example

# Server
NODE_ENV=development
PORT=4000
FRONTEND_URLS=http://localhost:3001,http://localhost:3002,http://localhost:3003

# Database
DATABASE_URL=postgresql://assa_user:password@localhost:5432/assa_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
JWT_REFRESH_SECRET=your_refresh_secret_different_from_access_secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Logging
LOG_LEVEL=debug
LOG_DIR=./logs

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60
```

---

## APPENDIX E — PROJECT FOLDER STRUCTURE

```
/assa/
├── docker-compose.yml
├── .env.example
├── README.md
│
├── /backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── ecosystem.config.js        ← PM2 config
│   ├── /src/
│   │   ├── server.ts
│   │   ├── app.ts                 ← Express app setup
│   │   ├── /config/
│   │   │   ├── cloudinary.ts
│   │   │   ├── redis.ts
│   │   │   └── database.ts
│   │   ├── /database/
│   │   │   ├── schema.sql
│   │   │   ├── schema.ts          ← Drizzle schema
│   │   │   ├── seed.sql
│   │   │   └── migrations/
│   │   ├── /middleware/
│   │   │   ├── auth.ts
│   │   │   ├── role.ts
│   │   │   ├── rateLimit.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── audit.ts
│   │   ├── /routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── fisher.routes.ts
│   │   │   ├── catches.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   ├── marketplace.routes.ts
│   │   │   └── sse.routes.ts
│   │   ├── /controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── catches.controller.ts
│   │   │   ├── admin.controller.ts
│   │   │   └── marketplace.controller.ts
│   │   ├── /services/
│   │   │   ├── approval.service.ts   ← Core interconnection logic
│   │   │   ├── quota.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── listing.service.ts
│   │   │   ├── sse.service.ts
│   │   │   └── audit.service.ts
│   │   ├── /utils/
│   │   │   ├── logger.ts
│   │   │   ├── referenceId.ts
│   │   │   └── errors.ts
│   │   └── /types/
│   │       └── index.ts
│   └── /tests/
│       ├── /unit/
│       └── /integration/
│
├── /admin-dashboard/              ← React + Vite, port 3001
│   ├── /src/
│   │   ├── /components/
│   │   │   ├── /charts/
│   │   │   ├── /tables/
│   │   │   ├── /cards/
│   │   │   └── /layout/
│   │   ├── /pages/
│   │   ├── /hooks/
│   │   ├── /services/             ← API call functions
│   │   └── /locales/
│   └── package.json
│
├── /fisher-app/                   ← React + Vite PWA, port 3002
│   ├── /src/
│   │   ├── /components/
│   │   │   ├── /wizard/
│   │   │   └── /common/
│   │   ├── /pages/
│   │   ├── /hooks/
│   │   ├── /services/
│   │   └── /locales/
│   └── package.json
│
└── /marketplace/                  ← React + Vite, port 3003
    ├── /src/
    │   ├── /components/
    │   │   ├── /listing/
    │   │   ├── /order/
    │   │   └── /sidebar/
    │   ├── /pages/
    │   ├── /hooks/
    │   ├── /services/
    │   └── /locales/
    └── package.json
```

---

_End of ASSA PRD v2.0_

---

| Document       | ASSA PRD v2.0                               |
| -------------- | ------------------------------------------- |
| Total Sections | 55 + 5 Appendices                           |
| Status         | Ready for Development                       |
| Next Action    | Backend team begins Week 1 foundation tasks |
| Review Date    | 30 days post-development start              |

_All scenarios, names, prices, GPS coordinates, and statistics in this document are for demonstration and development purposes. Names are fictional Ethiopian names used to demonstrate system realism. No real individual or government data is represented._
