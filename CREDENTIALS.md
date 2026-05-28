# ASSA — Demo Login Credentials

**Local development only.** All seeded users share one password per role (see below).  
Do not use these in production. Do not commit real secrets to git.

After `npm run seed`, these accounts exist in PostgreSQL.

---

## Quick reference (start here)

| App                                 | URL                              | Email                      | Password       |
| ----------------------------------- | -------------------------------- | -------------------------- | -------------- |
| **Admin / Command Center**          | http://localhost:3001            | `dawit@fisheries.gov.et`   | `admin123`     |
| **Inspector** (same app, port 3001) | http://localhost:3001            | `solomon@fisheries.gov.et` | `inspector123` |
| **Fisher App**                      | http://localhost:3002            | `tesfaye@fisher.et`        | `fisher123`    |
| **Marketplace (buyer)**             | http://localhost:3003            | `mesfin@buyer.et`          | `buyer123`     |
| **Backend API**                     | http://localhost:4000/api/health | —                          | —              |

### Password by role

| Role                                | Password (all users of that role) |
| ----------------------------------- | --------------------------------- |
| Admin / Superadmin / Regional admin | `admin123`                        |
| Inspector                           | `inspector123`                    |
| Fisher                              | `fisher123`                       |
| Buyer                               | `buyer123`                        |

---

## Government — Admin & Superadmin

**App:** Admin dashboard (http://localhost:3001)  
**Password for all:** `admin123`

| Name           | Email                   | Role       |
| -------------- | ----------------------- | ---------- |
| Dawit Bekele   | dawit@fisheries.gov.et  | superadmin |
| Tigist Haile   | tigist@fisheries.gov.et | admin      |
| Yonas Tadesse  | yonas@fisheries.gov.et  | admin      |
| Mekdes Alemu   | mekdes@fisheries.gov.et | admin      |
| Biruk Getachew | biruk@fisheries.gov.et  | admin      |

---

## Regional administrators (Phase 5)

**App:** Admin dashboard — scoped to one lake; cannot switch regions  
**Password:** `admin123`

| Name        | Email                 | Region     |
| ----------- | --------------------- | ---------- |
| Aster Zewdu | regional@ziway.gov.et | Lake Ziway |

National admins (`dawit@fisheries.gov.et`, etc.) can use the header region selector for **All lakes (national)** or a single lake (Tana, Ziway, Hawassa).

---

## Inspectors (enforcement)

**App:** Same as admin (http://localhost:3001) — limited sidebar (assignments, violations, map)  
**Password for all:** `inspector123`

| Name              | Email                    |
| ----------------- | ------------------------ |
| Solomon Tesema    | solomon@fisheries.gov.et |
| Hanna Mekonnen    | hanna@fisheries.gov.et   |
| Bereket Alemayehu | bereket@fisheries.gov.et |

---

## Fishers

**App:** Fisher app (http://localhost:3002)  
**Password for all:** `fisher123`

| Name                | Email              | License status | Notes                 |
| ------------------- | ------------------ | -------------- | --------------------- |
| Tesfaye Alemu       | tesfaye@fisher.et  | VALID          | Main demo fisher      |
| Abebe Girma         | abebe@fisher.et    | VALID          |                       |
| Mulugeta Worku      | mulugeta@fisher.et | VALID          |                       |
| Hailu Desta         | hailu@fisher.et    | EXPIRED        | License demo          |
| Kebede Molla        | kebede@fisher.et   | VALID          | Has violation history |
| Girma Tadesse       | girma@fisher.et    | VALID          |                       |
| Worku Bekele        | worku@fisher.et    | SUSPENDED      | Cannot submit catches |
| Amare Yilma         | amare@fisher.et    | VALID          |                       |
| Teshome Haile       | teshome@fisher.et  | VALID          |                       |
| Demeke Assefa       | demeke@fisher.et   | VALID          |                       |
| Sisay Negash        | sisay@fisher.et    | VALID          |                       |
| Fekadu Lemma        | fekadu@fisher.et   | VALID          |                       |
| Getachew Mesfin     | getachew@fisher.et | VALID          |                       |
| Berhane Tekle       | berhane@fisher.et  | VALID          |                       |
| Yitbarek Alemu      | yitbarek@fisher.et | VALID          |                       |
| Mekonnen Hailu      | mekonnen@fisher.et | VALID          |                       |
| Tadesse Woldemariam | tadesse@fisher.et  | VALID          |                       |
| Zewdu Kebede        | zewdu@fisher.et    | VALID          |                       |
| Alemu Gebre         | alemu@fisher.et    | VALID          |                       |
| Negash Wolde        | negash@fisher.et   | VALID          |                       |

---

## Buyers (marketplace)

**App:** Marketplace (http://localhost:3003)  
**Password for all:** `buyer123`

| Name            | Email               | Location  |
| --------------- | ------------------- | --------- |
| Mesfin Hailu    | mesfin@buyer.et     | Bahir Dar |
| Selamawit Girma | selam@buyer.et      | Bahir Dar |
| Henok Tesfaye   | henok@buyer.et      | Gondar    |
| Rahel Bekele    | rahel@buyer.et      | Bahir Dar |
| Dawit Molla     | dawitmolla@buyer.et | Woreta    |

---

## Backend setup (required for login to work)

```bash
cp backend/.env.example backend/.env
npm run seed
npm run dev
```

Default `JWT_SECRET` in `.env.example` is `change_me` — fine for local dev. Use a long random value in production.

---

## Run all services

```bash
npm run dev
```

Optional boat GPS simulator:

```bash
npm run simulate:boats
```

---

## Reset database

```bash
npm run reset   # wipe DB
npm run seed    # recreate schema + demo data
```

Credentials above apply again after seed.
