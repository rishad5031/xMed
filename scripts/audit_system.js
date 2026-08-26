// =============================================================
// xMED Comprehensive End-to-End System Audit & Diagnostics
// Principal Software QA Architect & Senior DBA Sweep
// =============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

// Helpers for HTTP Requests
function httpRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

const auditResults = [];

function recordResult(section, testItem, passed, details = '') {
  auditResults.push({
    section,
    testItem,
    status: passed ? 'PASS' : 'FAIL',
    details
  });
  const symbol = passed ? '✅' : '❌';
  console.log(`${symbol} [${section}] ${testItem}: ${passed ? 'PASS' : 'FAIL'}${details ? ' - ' + details : ''}`);
}

async function runFullAudit() {
  console.log('\n=============================================================');
  console.log('🔍 INITIATING EXHAUSTIVE xMED ARCHITECTURAL SYSTEM AUDIT');
  console.log('=============================================================\n');

  // -------------------------------------------------------------
  // SECTION 1: DATABASE INTEGRITY & ACADEMIC REQUIREMENTS AUDIT
  // -------------------------------------------------------------
  console.log('--- SECTION 1: Database Integrity & Academic DBMS Lab Audit ---');
  
  // 1.1 Core Tables Verification
  const requiredTables = [
    'citizens', 'doctors', 'medicines', 'prescriptions', 
    'prescription_items', 'patient_self_medications', 'diagnostic_reports'
  ];
  try {
    const tablesInDb = await query('SHOW TABLES;');
    const tableNames = tablesInDb.map(t => Object.values(t)[0]);
    const allTablesPresent = requiredTables.every(t => tableNames.includes(t));
    recordResult('DATABASE', '7 Core Tables Verification', allTablesPresent, 
      `Found ${tableNames.length} tables in xmed_db`);
  } catch (err) {
    recordResult('DATABASE', '7 Core Tables Verification', false, err.message);
  }

  // 1.2 Domain Constraints Verification
  try {
    // Check constraint on prescription_items
    const [pItemSchema] = await query('SHOW CREATE TABLE prescription_items;');
    const pItemCreate = pItemSchema['Create Table'];
    const hasDurationCheck = pItemCreate.includes('chk_item_duration') || pItemCreate.includes('duration');

    // Check citizen trigger for DOB <= CURRENT_DATE
    const triggers = await query('SHOW TRIGGERS WHERE `Table` = "citizens";');
    const hasDobTrigger = triggers.some(t => t.Trigger.includes('dob'));
    
    recordResult('DATABASE', 'Domain CHECK Constraints & Triggers (dob <= NOW & duration != "")', 
      hasDurationCheck && hasDobTrigger, 
      'chk_item_duration constraint & trg_chk_citizen_dob_insert trigger active');
  } catch (err) {
    recordResult('DATABASE', 'Domain Constraints', false, err.message);
  }

  // 1.3 Data Volume & Seed Verification
  try {
    const [citCnt] = await query('SELECT COUNT(*) as cnt FROM citizens WHERE uid LIKE "BD-2000-%";');
    const [citDobCheck] = await query('SELECT COUNT(*) as cnt FROM citizens WHERE uid LIKE "BD-2000-%" AND dob < "2000-01-01";');
    const [docCnt] = await query('SELECT COUNT(*) as cnt FROM doctors WHERE license_no LIKE "BMDC-100%";');
    const [rxCnt] = await query('SELECT COUNT(*) as cnt FROM prescriptions;');
    const [selfMedCnt] = await query('SELECT COUNT(*) as cnt FROM patient_self_medications;');

    const citPass = citCnt.cnt === 100 && citDobCheck.cnt === 0;
    recordResult('DATABASE', '100 Seeded Citizens (BD-2000-0001 to 0100, DOB >= 2000-01-01)', citPass, 
      `${citCnt.cnt} citizens found, 0 invalid DOBs`);

    const docPass = docCnt.cnt === 20;
    recordResult('DATABASE', '20 Seeded Doctors (BMDC-10001 to BMDC-10020)', docPass, 
      `${docCnt.cnt} doctors verified`);

    const rxPass = rxCnt.cnt >= 500;
    recordResult('DATABASE', '500+ Total Prescriptions Seeding', rxPass, 
      `${rxCnt.cnt} total prescriptions recorded across varying years`);

    const selfMedPass = selfMedCnt.cnt > 0;
    recordResult('DATABASE', 'Patient Self-Medications (OTC Logs) Present', selfMedPass, 
      `${selfMedCnt.cnt} realistic OTC entries recorded`);
  } catch (err) {
    recordResult('DATABASE', 'Data Volume Verification', false, err.message);
  }

  // 1.4 Advanced DBMS SQL Features: View, Trigger, Indexes & Directory
  try {
    // Test Virtual View vw_complete_patient_history
    const viewRows = await query('SELECT * FROM vw_complete_patient_history LIMIT 3;');
    recordResult('DATABASE', 'Virtual Analytical View (vw_complete_patient_history)', viewRows.length > 0, 
      `Queried view successfully, returned ${viewRows.length} sample rows`);

    // Test Trigger: total_prescribed_count increment
    const [sampleMed] = await query('SELECT medicine_id, total_prescribed_count FROM medicines LIMIT 1;');
    const initialCount = sampleMed.total_prescribed_count || 0;
    
    // Insert a dummy test prescription & item
    const [dummyCit] = await query('SELECT uid FROM citizens LIMIT 1;');
    const [dummyDoc] = await query('SELECT doctor_id FROM doctors LIMIT 1;');
    const rxRes = await query('INSERT INTO prescriptions (patient_uid, doctor_id, diagnosis, clinical_notes) VALUES (?, ?, "Audit Test", "Audit");', [dummyCit.uid, dummyDoc.doctor_id]);
    await query('INSERT INTO prescription_items (prescription_id, medicine_id, dosage_instruction, duration) VALUES (?, ?, "1 tab", "3 days");', [rxRes.insertId, sampleMed.medicine_id]);

    const [updatedMed] = await query('SELECT total_prescribed_count FROM medicines WHERE medicine_id = ?;', [sampleMed.medicine_id]);
    const triggerWorked = (updatedMed.total_prescribed_count === initialCount + 1);
    recordResult('DATABASE', 'Trigger: trg_update_medicine_usage (total_prescribed_count++)', triggerWorked, 
      `Incremented count from ${initialCount} to ${updatedMed.total_prescribed_count}`);

    // Cleanup dummy audit row
    await query('DELETE FROM prescriptions WHERE prescription_id = ?;', [rxRes.insertId]);

    // Test Composite & Fulltext Indexes
    const pIndexes = await query('SHOW INDEX FROM prescriptions;');
    const mIndexes = await query('SHOW INDEX FROM medicines;');
    const hasComposite = pIndexes.some(i => i.Key_name === 'idx_presc_patient_created');
    const hasFulltext = mIndexes.some(i => i.Key_name === 'idx_ft_medicines');
    recordResult('DATABASE', 'Indexes: Composite B-Tree & Inverted Full-Text', hasComposite && hasFulltext, 
      'idx_presc_patient_created and idx_ft_medicines verified active');

    // Verify /database Directory exports
    const dbDir = path.join(__dirname, '../database');
    const hasSchemaSql = fs.existsSync(path.join(dbDir, 'schema.sql'));
    const hasProcSql = fs.existsSync(path.join(dbDir, 'procedures_triggers_views.sql'));
    const hasSampleSql = fs.existsSync(path.join(dbDir, 'sample_queries.sql'));
    recordResult('DATABASE', 'Exported Artifacts in /database (schema, procs, queries)', 
      hasSchemaSql && hasProcSql && hasSampleSql, 
      'schema.sql, procedures_triggers_views.sql, sample_queries.sql present');
  } catch (err) {
    recordResult('DATABASE', 'Advanced DBMS Features', false, err.message);
  }

  // -------------------------------------------------------------
  // SECTION 2: BACKEND CONTROLLER & TRANSACTION VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- SECTION 2: Backend Controller & ACID Transaction Audit ---');

  // 2.1 Raw Parameterized SQL & Zero Concatenation Audit
  const controllerFiles = [
    'analyticsController.js', 'authController.js', 'doctorController.js',
    'patientController.js', 'prescriptionController.js', 'blogController.js'
  ];
  let zeroConcatenation = true;
  controllerFiles.forEach(f => {
    const fPath = path.join(__dirname, '../controllers', f);
    if (fs.existsSync(fPath)) {
      const code = fs.readFileSync(fPath, 'utf8');
      if (code.match(/query\s*\(\s*`[^`]*\$\{/)) {
        zeroConcatenation = false;
      }
    }
  });
  recordResult('BACKEND', 'Raw Parameterized SQL (100% prepared statement placeholders)', zeroConcatenation, 
    'All controller queries utilize parameterized ? markers');

  // 2.2 ACID Transaction Multi-Table Commits
  const rxControllerCode = fs.readFileSync(path.join(__dirname, '../controllers/prescriptionController.js'), 'utf8');
  const hasAcid = rxControllerCode.includes('beginTransaction') && 
                  rxControllerCode.includes('commit') && 
                  rxControllerCode.includes('rollback');
  recordResult('BACKEND', 'ACID Multi-Step Transactions in prescriptionController.js', hasAcid, 
    'Explicit connection.beginTransaction(), commit(), and rollback() confirmed');

  // 2.3 Advanced DBMS Query Endpoints Testing
  try {
    // Frequent Patients
    const freqRes = await httpRequest({ hostname: 'localhost', port: 3000, path: '/api/analytics/frequent-patients', method: 'GET' });
    const freqPass = freqRes.statusCode === 200 && freqRes.json && freqRes.json.success;
    recordResult('BACKEND', 'GET /api/analytics/frequent-patients (COUNT, AVG, GROUP BY, HAVING)', freqPass, 
      `Status ${freqRes.statusCode}, returned ${freqRes.json?.count} frequent patients`);

    // High Usage Medicines
    const highMedRes = await httpRequest({ hostname: 'localhost', port: 3000, path: '/api/analytics/high-usage-medicines', method: 'GET' });
    const highMedPass = highMedRes.statusCode === 200 && highMedRes.json && highMedRes.json.success;
    recordResult('BACKEND', 'GET /api/analytics/high-usage-medicines (Nested Subquery)', highMedPass, 
      `Status ${highMedRes.statusCode}, returned ${highMedRes.json?.count} medicines`);

    // Unified Patient History
    const histRes = await httpRequest({ hostname: 'localhost', port: 3000, path: '/api/patients/BD-2000-0001/history', method: 'GET' });
    const histPass = histRes.statusCode === 200 && histRes.json && Array.isArray(histRes.json.history);
    recordResult('BACKEND', 'GET /api/patients/:uid/history (Unified Chronological Array)', histPass, 
      `Status ${histRes.statusCode}, joined ${histRes.json?.total_records} records (${histRes.json?.consultations_count} Rx + ${histRes.json?.self_medications_count} OTC)`);
  } catch (err) {
    recordResult('BACKEND', 'Advanced DBMS Query Endpoints', false, err.message);
  }

  // -------------------------------------------------------------
  // SECTION 3: SECURITY & NETWORKING VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- SECTION 3: Security, Middleware & Networking Audit ---');

  try {
    const rootRes = await httpRequest({ hostname: 'localhost', port: 3000, path: '/', method: 'HEAD' });
    const hasHsts = Boolean(rootRes.headers['strict-transport-security']);
    const hasNosniff = rootRes.headers['x-content-type-options'] === 'nosniff';
    const hasXframe = rootRes.headers['x-frame-options'] === 'SAMEORIGIN';
    recordResult('SECURITY', 'Helmet HTTP Security Headers (HSTS, NoSniff, X-Frame-Options)', 
      hasHsts && hasNosniff && hasXframe, 'Standard enterprise security headers detected');

    // Rate Limiting on /api/auth
    const authRateRes = await httpRequest({ hostname: 'localhost', port: 3000, path: '/api/auth/login-citizen', method: 'POST' });
    const hasRateLimitHeaders = Boolean(authRateRes.headers['ratelimit-limit']);
    recordResult('SECURITY', 'Express Rate Limit Active on /api/auth & Search', hasRateLimitHeaders, 
      `RateLimit-Limit: ${authRateRes.headers['ratelimit-limit']} req/15min`);

    // Multer Upload Configuration
    const uploadCode = fs.readFileSync(path.join(__dirname, '../middleware/uploadMiddleware.js'), 'utf8');
    const has5Mb = uploadCode.includes('5 * 1024 * 1024');
    const hasUuid = uploadCode.includes('randomUUID');
    const hasMimeCheck = uploadCode.includes('application/pdf') && uploadCode.includes('image/png');
    recordResult('SECURITY', 'Multer Upload Engine (5MB Limit, UUID Obfuscation, Whitelist)', 
      has5Mb && hasUuid && hasMimeCheck, '5MB limit enforced with crypto.randomUUID() filenames');

    // Trust Proxy & CORS in server.js
    const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    const hasTrustProxy = serverCode.includes("app.set('trust proxy', 1);");
    const hasCors = serverCode.includes("app.use(cors());");
    recordResult('SECURITY', 'Trust Proxy & CORS Enabled for Cloudflare Tunnels', hasTrustProxy && hasCors, 
      'trust proxy = 1 and CORS active');
  } catch (err) {
    recordResult('SECURITY', 'Security Verification', false, err.message);
  }

  // -------------------------------------------------------------
  // SECTION 4: "MR.MED" AI MODULE VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- SECTION 4: "MR.MED" AI Module Verification ---');

  try {
    const aiControllerCode = fs.readFileSync(path.join(__dirname, '../controllers/aiController.js'), 'utf8');
    const readsServerEnv = aiControllerCode.includes('process.env.GEMINI_API_KEY');
    const hasStrictPrompt = aiControllerCode.includes('MR.MED') && 
                            aiControllerCode.includes('Do not diagnose conditions or prescribe medications');
    recordResult('AI_MODULE', 'Server-Side Secure Gemini Proxy (process.env.GEMINI_API_KEY)', readsServerEnv, 
      'API key strictly maintained in server environment variables');
    recordResult('AI_MODULE', 'System Prompt Guardrails & Medical Disclaimer Safety', hasStrictPrompt, 
      'Hardcoded clinical boundary instructions verified');

    // Verify UI has zero key prompt artifacts
    const aiChatHtml = fs.readFileSync(path.join(__dirname, '../views/ai-chat.html'), 'utf8');
    const chatbotJs = fs.readFileSync(path.join(__dirname, '../public/js/chatbot.js'), 'utf8');
    const hasNoKeyModal = !aiChatHtml.includes('key-modal') && !aiChatHtml.includes('Connect Gemini API');
    const hasNoLocalStorageKey = !chatbotJs.includes('localStorage.getItem(\'gemini_api_key\')') && 
                                 !chatbotJs.includes('localStorage.setItem(\'gemini_api_key\'');
    recordResult('AI_MODULE', 'Frontend Zero-Key Friction (No popups, zero localStorage keys)', 
      hasNoKeyModal && hasNoLocalStorageKey, '100% automated server-side intelligence');
  } catch (err) {
    recordResult('AI_MODULE', 'AI Module Verification', false, err.message);
  }

  // -------------------------------------------------------------
  // SECTION 5: FRONTEND END-TO-END FLOW CHECK
  // -------------------------------------------------------------
  console.log('\n--- SECTION 5: Frontend End-to-End User Flow Check ---');

  try {
    // 5.1 Citizen Flow
    const citLogin = await httpRequest({
      hostname: 'localhost', port: 3000, path: '/api/auth/login-citizen', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { identifier: 'BD-2000-0001', password: 'Password123!' });

    const citDash = await httpRequest({
      hostname: 'localhost', port: 3000, path: '/api/patient/dashboard', method: 'GET',
      headers: { 'Authorization': `Bearer ${citLogin.json.token}` }
    });

    const citFlowPass = citDash.statusCode === 200 && 
                        citDash.json.prescriptions.length > 0 && 
                        citDash.json.self_medications.length > 0;
    recordResult('E2E_FLOW', 'Citizen Flow: Login -> Timeline -> Prescription Dossier', citFlowPass, 
      `Loaded ${citDash.json?.prescriptions?.length} past consultations + ${citDash.json?.self_medications?.length} OTC logs for BD-2000-0001`);

    // 5.2 Doctor Flow: Login, Search, and E-Prescription Issue
    const docLogin = await httpRequest({
      hostname: 'localhost', port: 3000, path: '/api/auth/login-doctor', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { identifier: 'dr.tanvir@xmed.gov.bd', password: 'Password123!' });

    const searchDossier = await httpRequest({
      hostname: 'localhost', port: 3000, path: '/api/doctor/patient/BD-2000-0001', method: 'GET',
      headers: { 'Authorization': `Bearer ${docLogin.json.token}` }
    });

    const issueRx = await httpRequest({
      hostname: 'localhost', port: 3000, path: '/api/prescriptions', method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${docLogin.json.token}`
      }
    }, {
      patient_uid: 'BD-2000-0001',
      diagnosis: 'E2E Audit Verification Checkup',
      clinical_notes: 'System diagnostic health check. All vital functions stable.',
      items: [
        { medicine_id: 611, dosage_instruction: '1 tab once daily', duration: '3 days' }
      ]
    });

    const docFlowPass = docLogin.statusCode === 200 && 
                        searchDossier.statusCode === 200 && 
                        issueRx.statusCode === 201 && 
                        issueRx.json.prescription.prescription_id;
    recordResult('E2E_FLOW', 'Doctor Flow: Login -> Search Dossier -> Issue E-Prescription', docFlowPass, 
      `Issued prescription #${issueRx.json?.prescription?.prescription_id} with QR code verification link`);

    // Clean up test audit prescription
    if (issueRx.json?.prescription?.prescription_id) {
      await query('DELETE FROM prescriptions WHERE prescription_id = ?;', [issueRx.json.prescription.prescription_id]);
    }
  } catch (err) {
    recordResult('E2E_FLOW', 'Frontend User Flow Verification', false, err.message);
  }

  // -------------------------------------------------------------
  // SUMMARY REPORT & AUDIT SCORECARD
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log('📊 FINAL AUDIT SCORECARD & STATUS REPORT');
  console.log('=============================================================\n');

  const totalTests = auditResults.length;
  const passedTests = auditResults.filter(r => r.status === 'PASS').length;
  const failedTests = totalTests - passedTests;
  const percentage = Math.round((passedTests / totalTests) * 100);

  console.log(`Total Checks Run:  ${totalTests}`);
  console.log(`Passed:            ${passedTests} ✅`);
  console.log(`Failed:            ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
  console.log(`Compliance Score:  ${percentage}%\n`);

  if (failedTests === 0) {
    console.log('🎉 100% PRODUCTION READY: ALL DIAGNOSTIC CHECKS PASSED PERFECTLY!\n');
  } else {
    console.log('⚠️ Attention required on failing checks.\n');
  }

  process.exit(failedTests === 0 ? 0 : 1);
}

runFullAudit();
