const express = require('express');

const cors = require('cors');

const helmet = require('helmet');

const rateLimit = require('express-rate-limit');

const path = require('path');

const fs = require('fs');

require('dotenv').config();

const { initializeDatabase } = require('./scripts/init_db');

const aiRoutes = require('./routes/aiRoutes');

const drugController = require('./controllers/drugController');

const blogController = require('./controllers/blogController');

const authController = require('./controllers/authController');

const bloodController = require('./controllers/bloodController');

const messageController = require('./controllers/messageController');

const hospitalController = require('./controllers/hospitalController');

const appointmentController = require('./controllers/appointmentController');

const doctorController = require('./controllers/doctorController');

const { authenticateToken, isPatient } = require('./middleware/authMiddleware');

const upload = require('./middleware/uploadMiddleware');

const { phpDispatcher } = require('./middleware/phpDispatcher');

const app = express();

const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors());

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

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

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
  res.sendFile(path.join(__dirname, 'views', 'appointments.html'));
});
app.get('/appointments', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'appointments.html'));
});
app.get('/book-appointment', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'appointments.html'));
});

app.get('/govt-drugs', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'govt-drugs.html'));
});
app.get('/free-drugs', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'govt-drugs.html'));
});

app.get('/blood', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'blood-bank.html'));
});
app.get('/blood-bank', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'blood-bank.html'));
});

app.get('/clinical-blogs', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'clinical-blogs.html'));
});
app.get('/blogs', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'clinical-blogs.html'));
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

app.use('/api/ai', aiRoutes);

app.get('/api/auth/me', authController.getSessionStatus);
app.get('/api/auth/profile', authController.getSessionStatus);
app.post('/api/auth/login', authController.loginUnified);
app.post('/api/auth/login-citizen', authController.loginCitizen);
app.post('/api/auth/login-doctor', authController.loginDoctor);
app.post('/api/auth/register-citizen', authController.registerCitizen);
app.post('/api/auth/register-doctor', authController.registerDoctor);
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('xmed_token');
  return res.status(200).json({ success: true, authenticated: false, message: 'Logged out successfully.' });
});

app.get('/api/drugs/emergency', drugController.getEmergencyDrugs);
app.get('/api/drugs/government-essential/:id', drugController.getDrugDetails);
app.get('/api/drugs/government-essential', drugController.getGovernmentDrugs);

app.get('/api/blogs/:id', blogController.getBlogById);
app.get('/api/blogs', blogController.getBlogs);
app.post('/api/blogs', authenticateToken, blogController.createBlog);

app.get('/api/blood/stats', bloodController.getStats);
app.get('/api/blood/posts', bloodController.getPosts);
app.post('/api/blood/posts', bloodController.createPost);
app.patch('/api/blood/posts/:id/status', bloodController.updateStatus);

app.get('/api/messages/conversations', messageController.getConversations);
app.get('/api/messages/thread/:targetUid', messageController.getThread);
app.post('/api/messages/send', messageController.sendMessage);
app.get('/api/messages/contacts', messageController.getContacts);

app.get('/api/hospitals', hospitalController.getHospitals);
app.get('/api/hospitals/:id/doctors', hospitalController.getHospitalDoctors);
app.get('/api/hospitals/:id', hospitalController.getHospitalById);

app.post('/api/appointments/request', appointmentController.requestAppointmentPublic);
app.post('/api/appointments/book', appointmentController.bookAppointment);
app.get('/api/appointments/my', authenticateToken, appointmentController.getAppointments);
app.get('/api/appointments/doctor/queue', authenticateToken, appointmentController.getDoctorAppointmentQueue);
app.get('/api/doctor/appointments/queue', appointmentController.getDoctorAppointmentQueue);
app.post('/api/doctor/appointments/:id/decide', appointmentController.decideAppointment);
app.get('/api/doctor/analytics', authenticateToken, doctorController.getDoctorAnalytics);
app.get('/api/doctor/patient/:uid', authenticateToken, doctorController.searchPatientByUid);

app.post('/api/patient/reports', authenticateToken, isPatient, upload.single('report_file'), (req, res, next) => {
  if (req.file) {
    req.body.report_file_url = `/uploads/${req.file.filename}`;
  }
  next();
}, phpDispatcher);

app.use('/api', phpDispatcher);

/**
 * Initializes database schemas, procedures, views, and starts the HTTP server listener.
 */
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
