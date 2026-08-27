const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initializeDatabase } = require('./scripts/init_db');
const authController = require('./controllers/authController');
const doctorController = require('./controllers/doctorController');
const patientController = require('./controllers/patientController');
const prescriptionController = require('./controllers/prescriptionController');
const blogController = require('./controllers/blogController');
const aiController = require('./controllers/aiController');
const analyticsController = require('./controllers/analyticsController');
const hospitalController = require('./controllers/hospitalController');
const appointmentController = require('./controllers/appointmentController');
const drugController = require('./controllers/drugController');
const bloodController = require('./controllers/bloodController');
const messageController = require('./controllers/messageController');
const aiRoutes = require('./routes/aiRoutes');
const { authenticateToken, isDoctor, isPatient } = require('./middleware/authMiddleware');
const upload = require('./middleware/uploadMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Proxy (Required for Cloudflare / Reverse Proxy Tunnels)
app.set('trust proxy', 1);

// Security Headers via Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors());

// Rate Limiting Security
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 20 : 100,
  message: { success: false, message: 'Too many authentication attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth', authLimiter);

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many search queries, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/medicines/search', searchLimiter);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// HTML Views routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/doctor-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'doctor-dashboard.html'));
});

app.get('/patient-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'patient-dashboard.html'));
});

app.get('/doctors', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'doctor-directory.html'));
});

app.get('/appointments', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'doctor-directory.html'));
});

app.get('/directory', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'doctor-directory.html'));
});

app.get('/prescription-view', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'prescription-view.html'));
});

app.get('/verify/prescription/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'verify.html'));
});

app.get('/ai-assistant', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'ai-chat.html'));
});

app.get('/ai-chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'ai-chat.html'));
});

app.get('/blood', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'blood-bank.html'));
});

app.get('/blood-bank', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'blood-bank.html'));
});

// =============================================================
// REST API ROUTES
// =============================================================

// --- Auth Routes ---
app.post('/api/auth/register-citizen', authController.registerCitizen);
app.post('/api/auth/login-citizen', authController.loginCitizen);
app.post('/api/auth/register-doctor', authController.registerDoctor);
app.post('/api/auth/login-doctor', authController.loginDoctor);
app.post('/api/auth/login', (req, res) => {
  if (req.body.role === 'doctor' || (req.body.identifier && req.body.identifier.includes('@'))) {
    return authController.loginDoctor(req, res);
  }
  return authController.loginCitizen(req, res);
});
app.get('/api/auth/me', authenticateToken, authController.getCurrentUser);

// --- Doctor Portal Routes ---
app.get('/api/doctor/patient/:uid', authenticateToken, isDoctor, doctorController.searchPatientByUid);
app.get('/api/doctor/analytics', authenticateToken, isDoctor, doctorController.getDoctorAnalytics);

// --- Medicine Catalog & Autocomplete (In-Memory Cached) ---
app.get('/api/medicines/search', prescriptionController.searchMedicines);

// --- Bangladesh Government Free & Emergency Essential Drugs ---
app.get('/api/drugs/government-essential', drugController.getGovernmentDrugs);
app.get('/api/drugs/emergency', drugController.getEmergencyDrugs);
app.get('/api/drugs/government-essential/:id', drugController.getDrugDetails);

// --- Prescription & Advanced DBMS Analytics Routes ---
app.post('/api/prescriptions', authenticateToken, isDoctor, prescriptionController.createPrescription);
app.get('/api/prescriptions/:id', authenticateToken, prescriptionController.getPrescriptionDetails);
app.get('/api/prescriptions/:id/audit-trail', authenticateToken, prescriptionController.getPrescriptionAuditTrail);
app.get('/api/doctor/analytics', authenticateToken, isDoctor, prescriptionController.getDoctorAnalytics);
app.get('/api/patients/:uid/complete-history', authenticateToken, prescriptionController.getPatientCompleteHistory);
app.get('/api/verify/prescription/:id', prescriptionController.verifyPrescriptionPublic);

// --- Patient Portal Routes ---
app.get('/api/patient/dashboard', authenticateToken, isPatient, patientController.getPatientDashboard);
app.get('/api/patient/vitals', authenticateToken, isPatient, patientController.getPatientVitals);
app.get('/api/patient/reports', authenticateToken, isPatient, patientController.getPatientReports);
app.post('/api/patient/reports', authenticateToken, isPatient, upload.single('report_file'), patientController.uploadDiagnosticReport);
app.delete('/api/patient/reports/:id', authenticateToken, isPatient, patientController.deleteDiagnosticReport);
app.put('/api/patient/profile', authenticateToken, isPatient, analyticsController.updatePatientProfile);
app.post('/api/patient/self-medications', authenticateToken, isPatient, patientController.logSelfMedication);
app.get('/api/patient/self-medications', authenticateToken, isPatient, patientController.getSelfMedications);
app.get('/api/patient/self-medications/:uid', authenticateToken, patientController.getSelfMedications);

// --- Academic DBMS Lab Evaluation Analytics Routes (Raw Parameterized SQL) ---
app.get('/api/analytics/frequent-patients', analyticsController.getFrequentPatients);
app.get('/api/analytics/high-usage-medicines', analyticsController.getHighUsageMedicines);
app.get('/api/analytics/prescriptions-joined', analyticsController.getPrescriptionsInnerJoin);
app.get('/api/analytics/citizens-reports-left-join', analyticsController.getCitizensReportsLeftJoin);
app.get('/api/analytics/complete-patient-history/:uid', analyticsController.getPatientHistoryFromView);
app.get('/api/patients/:uid/history', analyticsController.getPatientUnifiedHistory);

// --- Hospital & Doctor Directory ---
app.get('/api/hospitals', hospitalController.getHospitals);
app.get('/api/hospitals/:id', hospitalController.getHospitalById);
app.get('/api/hospitals/:id/doctors', hospitalController.getHospitalDoctors);

// --- Priority & Emergency FCFS Appointments ---
app.post('/api/appointments', authenticateToken, appointmentController.createAppointment);
app.post('/api/appointments/book', appointmentController.bookAppointment);
app.post('/api/appointments/request', appointmentController.requestAppointmentPublic);
app.get('/api/appointments', authenticateToken, appointmentController.getAppointments);
app.get('/api/appointments/:id', authenticateToken, appointmentController.getAppointmentById);
app.put('/api/appointments/:id/status', authenticateToken, isDoctor, appointmentController.updateAppointmentStatus);

// --- Blood Donation & Request Hub ---
app.post('/api/blood/posts', bloodController.createPost);
app.get('/api/blood/posts', bloodController.getPosts);
app.patch('/api/blood/posts/:id/status', bloodController.updateStatus);
app.get('/api/blood/stats', bloodController.getStats);

// --- Universal Real-Time Messaging Hub ---
app.get('/api/messages/conversations', messageController.getConversations);
app.get('/api/messages/thread/:targetUid', messageController.getThread);
app.post('/api/messages/send', messageController.sendMessage);
app.get('/api/messages/contacts', messageController.getContacts);

// --- Enterprise System Audit Trail ---
app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    const { table_name, action_type, limit = 50, offset = 0 } = req.query;
    const { query: dbQuery } = require('./config/db');
    let sql = 'SELECT * FROM system_audit_logs WHERE 1=1';
    const params = [];
    if (table_name) {
      sql += ' AND table_name = ?';
      params.push(table_name);
    }
    if (action_type) {
      sql += ' AND action_type = ?';
      params.push(action_type);
    }
    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    const logs = await dbQuery(sql, params);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- Clinical Blogs ---
app.get('/api/blogs', blogController.getBlogs);
app.get('/api/blogs/:id', blogController.getBlogById);
app.post('/api/blogs', authenticateToken, isDoctor, blogController.createBlog);

// --- MR.MED AI Assistant Routes (Server-Side Proxy) ---
app.use('/api/ai', aiRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  return res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Server Initialization
async function startServer() {
  try {
    await initializeDatabase();
  } catch (dbError) {
    console.warn(`[xMED Boot Warning] Database auto-init issue: ${dbError.message}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🚀 xMED Enterprise National Healthcare Portal is Live!`);
    console.log(`🌐 Server running at: http://0.0.0.0:${PORT} (LAN / Localhost)`);
    console.log(`🏥 Doctor Portal:     http://localhost:${PORT}/doctor-dashboard`);
    console.log(`🩺 Patient Vault:     http://localhost:${PORT}/patient-dashboard`);
    console.log(`🔍 Verification:      http://localhost:${PORT}/verify/prescription/1`);
    console.log(`🎨 Design System:     Designed by F'Studio`);
    console.log(`======================================================\n`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
