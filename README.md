# xMED — National Healthcare & Electronic Health Record (EHR) Web Portal

<div align="center">

![xMED Banner](public/images/mr-med-robot.png)

**A Unified National EHR Platform, Clinical Diagnostic Hub, and AI Health Assistant**  
*Built for the Government of Bangladesh Health Services & Academic DBMS Evaluation*

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-4.21-blue.svg)](https://expressjs.com/)
[![Database](https://img.shields.io/badge/Database-MySQL%20%2F%20MariaDB-orange.svg)](https://mariadb.org/)
[![AI Assistant](https://img.shields.io/badge/AI-Google%20Gemini%203.6-purple.svg)](https://aistudio.google.com/)
[![Tests](https://img.shields.io/badge/Tests-Jest%20%26%20Supertest%20(15%2F15%20PASS)-brightgreen.svg)](https://jestjs.io/)

</div>

---

## 🌐 Live Demo & Instant Access

> 🚀 **Live Public Web Portal**: [**https://coordinated-cuisine-barbara-considered.trycloudflare.com**](https://coordinated-cuisine-barbara-considered.trycloudflare.com)  
> 🏥 **Doctor Studio**: [https://coordinated-cuisine-barbara-considered.trycloudflare.com/doctor-dashboard](https://coordinated-cuisine-barbara-considered.trycloudflare.com/doctor-dashboard)  
> 🩺 **Citizen Health Vault**: [https://coordinated-cuisine-barbara-considered.trycloudflare.com/patient-dashboard](https://coordinated-cuisine-barbara-considered.trycloudflare.com/patient-dashboard)  
> 🤖 **MR.MED AI Assistant**: [https://coordinated-cuisine-barbara-considered.trycloudflare.com/ai-assistant](https://coordinated-cuisine-barbara-considered.trycloudflare.com/ai-assistant)  
> 🔐 **Default Demo Password**: `Password123!`  
> *(Connected in real-time to local XAMPP MariaDB at `192.168.0.186:3306/xmed_db` via Cloudflare Tunnel).*

---

## 📖 Overview

**xMED** is an enterprise-grade Electronic Health Record (EHR) web ecosystem developed to centralize patient medical records, enable frictionless doctor tele-prescribing, provide tamper-evident QR verification of medical documents, and deliver automated clinical guidance powered by Google Gemini.

---

## 🌟 Key Features

### 1. 🩺 Citizen Health Vault
* **Encrypted Digital Health ID Card**: Displays patient demographics, blood group, age, and quick UID copy.
* **Unified Longitudinal Medical Timeline**: Merges official clinical consultations, multi-item drug regimens, and self-reported OTC emergency medicines in reverse-chronological order.
* **Interactive Vitals Trend Analytics**: Real-time Chart.js tracking of systolic/diastolic Blood Pressure, Blood Glucose, and BMI.
* **Diagnostic PDF Vault**: Drag-and-drop report uploader with UUID filename obfuscation, 5MB limit, and MIME whitelisting.

### 2. 🏥 Doctor Clinical Studio
* **Instant Citizen Dossier Search**: Instant UID lookup with quick-select seeded patient pills.
* **Smart Medicine Search & Autocomplete**: In-memory cached database of 600+ brand and generic medicines with dosage form and strength.
* **ACID-Compliant Multi-Item E-Prescriptions**: Atomically commits diagnoses, notes, and medications within database transactions.
* **Printable A4 & Tamper-Evident QR Code**: Generates official prescriptions with embedded verification URLs.

### 3. 🤖 "MR.MED" AI Health Assistant
* **Server-Side Proxied Gemini Integration**: Powered by Google Gemini (`gemini-3.6-flash`) via `@google/genai`.
* **Zero Client-Side Friction**: No API key input required from users; runs 100% server-side with strict medical safety guardrails.
* **Clinical Fallback Engine**: Guarantees zero downtime with an offline clinical terminology knowledge base.

---

## 🗄️ Advanced DBMS Architecture

The database layer satisfies strict academic and enterprise DBMS criteria:

1. **ACID Transactions**: Multi-table insertions in `prescriptionController.js` use `beginTransaction()`, `commit()`, and `rollback()`.
2. **Automated Database Triggers**:
   * `trg_update_medicine_usage`: Atomically increments `medicines.total_prescribed_count` on item insertion.
   * `trg_after_prescription_insert` / `update`: Creates immutable JSON audit trails in `prescription_audit_logs`.
   * `trg_chk_citizen_dob_insert` / `update`: Domain check ensuring `dob <= CURRENT_DATE`.
3. **Analytical Views**:
   * `vw_complete_patient_history`: Joins prescriptions, citizens, doctors, and aggregates medications into JSON arrays.
4. **Optimized Indexes**:
   * Composite B-Tree index on `prescriptions(patient_uid, created_at)`.
   * Full-Text inverted index on `medicines(brand_name, generic_name)`.
5. **Clean SQL Exports**:
   * [`database/schema.sql`](database/schema.sql): Complete DDL table schemas and relations.
   * [`database/procedures_triggers_views.sql`](database/procedures_triggers_views.sql): Triggers, procedures, and views.
   * [`database/sample_queries.sql`](database/sample_queries.sql): 7 comprehensive sections of academic queries.

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [MySQL](https://www.mysql.com/) or [MariaDB](https://mariadb.org/) (XAMPP or standalone service)
* [Git](https://git-scm.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/xMED.git
cd xMED
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=xmed_db
GEMINI_API_KEY=your_google_gemini_api_key
JWT_SECRET=your_jwt_secret_key
```

### 4. Initialize & Seed Database
Run the automated schema and data seeding migration:
```bash
npm run init-db
node scripts/seed_data.js
```
*Populates 100 Citizens, 20 Doctors, 600+ Medicines, 750+ Prescriptions, and 200+ OTC Logs.*

### 5. Start the Server
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Automated Testing

xMED includes an end-to-end regression test suite written with **Jest** and **Supertest**:

```bash
npm test
```

### Test Coverage (15 / 15 Tests Passing)
* **`tests/db.test.js`**: MySQL connection pool, row count verification, future DOB trigger rejection, atomic trigger execution.
* **`tests/api.test.js`**: Citizen/Doctor JWT authentication, `frequent-patients` aggregation, `high-usage-medicines` nested subqueries, ACID prescription creation, API rate limiting.
* **`tests/ai.test.js`**: MR.MED prompt guardrails, zero API key exposure, input validation.

---

## 🔑 Demo Accounts (Password: `Password123!`)

### Seeded Citizens
| Name | UID | Blood Group | Records Seeded |
| :--- | :--- | :---: | :--- |
| **Rahim Rahman** | `BD-2000-0001` | `A-` | 6 Consultations + 3 OTC Logs |
| **Fatima Chowdhury** | `BD-2000-0002` | `B+` | 7 Consultations + 2 OTC Logs |
| **Nafis Hossain** | `BD-2000-0003` | `AB-` | 9 Consultations + 1 OTC Log |
| **Sadia Begum** | `BD-2000-0010` | `O+` | 8 Consultations + 3 OTC Logs |

### Seeded Physicians
| Doctor Name | License No | Specialty | Email |
| :--- | :--- | :--- | :--- |
| **Dr. Tanvir Ahmed** | `BMDC-10001` | Cardiology | `dr.tanvir@xmed.gov.bd` |
| **Dr. Nusrat Jahan** | `BMDC-10002` | Pulmonology | `dr.nusrat@xmed.gov.bd` |
| **Dr. Shakil Hossain** | `BMDC-10003` | Dermatology | `dr.shakil@xmed.gov.bd` |
| **Dr. Farzana Kabir** | `BMDC-10004` | Pediatrics | `dr.farzana@xmed.gov.bd` |

---

## 🛡️ Security Implementations
* **Helmet.js**: Strict HTTP security headers (`HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`).
* **Rate Limiting**: `express-rate-limit` guards on authentication and search endpoints.
* **File Upload Guardrails**: Multer 5MB limit, UUID filename obfuscation, and strict MIME whitelisting (`pdf`, `jpg`, `png`).
* **Reverse Proxy Ready**: `app.set('trust proxy', 1)` configured for Cloudflare tunnels.

---

## 📄 License
This project is licensed under the ISC License.
Designed & Developed for the **xMED National Healthcare Platform Team**.
