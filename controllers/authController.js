const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const citizenModel = require('../models/citizenModel');
const doctorModel = require('../models/doctorModel');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'xmed_super_secure_national_health_secret_key_2026_bd';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// -------------------------------------------------------------
// Citizen (Patient) Auth
// -------------------------------------------------------------
async function registerCitizen(req, res) {
  try {
    const { full_name, dob, gender, blood_group, phone, email, password } = req.body;

    if (!full_name || !dob || !gender || !blood_group || !phone || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Check if email or phone already exists
    const existingEmail = await citizenModel.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'A citizen with this email address already exists.' });
    }

    const existingPhone = await citizenModel.findByPhone(phone);
    if (existingPhone) {
      return res.status(409).json({ success: false, message: 'A citizen with this phone number already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create citizen
    const newCitizen = await citizenModel.createCitizen({
      full_name,
      dob,
      gender,
      blood_group,
      phone,
      email,
      password_hash
    });

    const token = createToken({
      uid: newCitizen.uid,
      email: newCitizen.email,
      full_name: newCitizen.full_name,
      role: 'patient'
    });

    return res.status(201).json({
      success: true,
      message: 'Citizen registration successful.',
      token,
      user: {
        uid: newCitizen.uid,
        full_name: newCitizen.full_name,
        dob: newCitizen.dob,
        gender: newCitizen.gender,
        blood_group: newCitizen.blood_group,
        phone: newCitizen.phone,
        email: newCitizen.email,
        role: 'patient'
      }
    });
  } catch (error) {
    console.error('[Auth Error] registerCitizen:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
}

async function loginCitizen(req, res) {
  try {
    const { identifier, password } = req.body; // Can be email, phone, or UID

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Citizen ID/Email and password are required.' });
    }

    let citizen = null;
    if (identifier.startsWith('BD-')) {
      citizen = await citizenModel.findByUid(identifier);
    } else if (identifier.includes('@')) {
      citizen = await citizenModel.findByEmail(identifier);
    } else {
      citizen = await citizenModel.findByPhone(identifier);
    }

    if (!citizen) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Citizen account not found.' });
    }

    const isMatch = await bcrypt.compare(password, citizen.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Password does not match.' });
    }

    const token = createToken({
      uid: citizen.uid,
      email: citizen.email,
      full_name: citizen.full_name,
      role: 'patient'
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        uid: citizen.uid,
        full_name: citizen.full_name,
        dob: citizen.dob,
        gender: citizen.gender,
        blood_group: citizen.blood_group,
        phone: citizen.phone,
        email: citizen.email,
        role: 'patient'
      }
    });
  } catch (error) {
    console.error('[Auth Error] loginCitizen:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
}

// -------------------------------------------------------------
// Doctor Auth
// -------------------------------------------------------------
async function registerDoctor(req, res) {
  try {
    const { license_no, full_name, specialization, phone, email, password } = req.body;

    if (!license_no || !full_name || !specialization || !phone || !email || !password) {
      return res.status(400).json({ success: false, message: 'All doctor fields are required.' });
    }

    // Check existing
    const existingEmail = await doctorModel.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'A doctor with this email is already registered.' });
    }

    const existingLicense = await doctorModel.findByLicense(license_no);
    if (existingLicense) {
      return res.status(409).json({ success: false, message: 'A doctor with this BMDC license number already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newDoctor = await doctorModel.createDoctor({
      license_no,
      full_name,
      specialization,
      phone,
      email,
      password_hash
    });

    const token = createToken({
      id: newDoctor.doctor_id,
      doctor_id: newDoctor.doctor_id,
      license_no: newDoctor.license_no,
      full_name: newDoctor.full_name,
      email: newDoctor.email,
      role: 'doctor'
    });

    return res.status(201).json({
      success: true,
      message: 'Doctor account registered successfully.',
      token,
      user: {
        doctor_id: newDoctor.doctor_id,
        license_no: newDoctor.license_no,
        full_name: newDoctor.full_name,
        specialization: newDoctor.specialization,
        phone: newDoctor.phone,
        email: newDoctor.email,
        role: 'doctor'
      }
    });
  } catch (error) {
    console.error('[Auth Error] registerDoctor:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during doctor registration.' });
  }
}

async function loginDoctor(req, res) {
  try {
    const { identifier, password } = req.body; // Can be email or license number

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Doctor email/license number and password are required.' });
    }

    let doctor = null;
    if (identifier.includes('@')) {
      doctor = await doctorModel.findByEmail(identifier);
    } else {
      doctor = await doctorModel.findByLicense(identifier);
    }

    if (!doctor) {
      return res.status(401).json({ success: false, message: 'Doctor account not found.' });
    }

    const isMatch = await bcrypt.compare(password, doctor.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Password does not match.' });
    }

    const token = createToken({
      id: doctor.doctor_id,
      doctor_id: doctor.doctor_id,
      license_no: doctor.license_no,
      full_name: doctor.full_name,
      email: doctor.email,
      role: 'doctor'
    });

    return res.json({
      success: true,
      message: 'Doctor authenticated successfully.',
      token,
      user: {
        doctor_id: doctor.doctor_id,
        license_no: doctor.license_no,
        full_name: doctor.full_name,
        specialization: doctor.specialization,
        phone: doctor.phone,
        email: doctor.email,
        role: 'doctor'
      }
    });
  } catch (error) {
    console.error('[Auth Error] loginDoctor:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during doctor login.' });
  }
}

// -------------------------------------------------------------
// Safe Session Status Probe: GET /api/auth/me
// -------------------------------------------------------------
async function getSessionStatus(req, res) {
  try {
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query && req.query.token) {
      token = req.query.token;
    } else if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';');
      for (const c of cookies) {
        const [name, val] = c.trim().split('=');
        if (name === 'xmed_token') {
          token = decodeURIComponent(val);
          break;
        }
      }
    }

    if (!token) {
      return res.status(200).json({ authenticated: false, user: null });
    }

    let decoded = null;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(200).json({ authenticated: false, user: null, message: 'Invalid or expired token.' });
    }

    if (!decoded) {
      return res.status(200).json({ authenticated: false, user: null });
    }

    if (decoded.role === 'doctor') {
      const doctorId = decoded.doctor_id || decoded.id;
      const doctor = await doctorModel.findById(doctorId);
      if (!doctor) {
        return res.status(200).json({ authenticated: false, user: null });
      }
      return res.status(200).json({
        authenticated: true,
        user: {
          doctor_id: doctor.doctor_id,
          uid: doctor.uid || `DOC-${doctor.doctor_id}`,
          name: doctor.name || doctor.full_name,
          full_name: doctor.full_name || doctor.name,
          email: doctor.email,
          phone: doctor.phone,
          specialization: doctor.specialization,
          hospital_id: doctor.hospital_id,
          hospital_name: doctor.hospital_name || 'Central Hospital',
          role: 'doctor'
        }
      });
    } else {
      const citizenUid = decoded.uid;
      const citizen = await citizenModel.findByUid(citizenUid);
      if (!citizen) {
        return res.status(200).json({ authenticated: false, user: null });
      }
      return res.status(200).json({
        authenticated: true,
        user: {
          uid: citizen.uid,
          name: citizen.name || citizen.full_name,
          full_name: citizen.full_name || citizen.name,
          email: citizen.email,
          phone: citizen.phone,
          gender: citizen.gender,
          blood_group: citizen.blood_group,
          area: citizen.area,
          city: citizen.city,
          role: 'patient'
        }
      });
    }
  } catch (error) {
    console.error('[Auth Error] getSessionStatus:', error);
    return res.status(200).json({ authenticated: false, user: null });
  }
}

// -------------------------------------------------------------
// Current Authenticated User Profile
// -------------------------------------------------------------
async function getCurrentUser(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (req.user.role === 'doctor') {
      const doctorId = req.user.doctor_id || req.user.id;
      const doctor = await doctorModel.findById(doctorId);
      if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });
      return res.json({
        success: true,
        user: { ...doctor, role: 'doctor' }
      });
    } else {
      const citizen = await citizenModel.findByUid(req.user.uid);
      if (!citizen) return res.status(404).json({ success: false, message: 'Citizen not found.' });
      return res.json({
        success: true,
        user: {
          uid: citizen.uid,
          name: citizen.name || citizen.full_name,
          full_name: citizen.full_name || citizen.name,
          dob: citizen.dob,
          gender: citizen.gender,
          blood_group: citizen.blood_group,
          phone: citizen.phone,
          email: citizen.email,
          role: 'patient'
        }
      });
    }
  } catch (error) {
    console.error('[Auth Error] getCurrentUser:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
}

// -------------------------------------------------------------
// Logout Session: POST /api/auth/logout
// -------------------------------------------------------------
async function logout(req, res) {
  try {
    res.clearCookie('xmed_token', { path: '/' });
    return res.json({
      success: true,
      message: 'Logged out successfully.',
      authenticated: false
    });
  } catch (error) {
    console.error('[Auth Error] logout:', error);
    return res.status(500).json({ success: false, message: 'Logout failed.' });
  }
}

module.exports = {
  registerCitizen,
  loginCitizen,
  registerDoctor,
  loginDoctor,
  getCurrentUser,
  getSessionStatus,
  logout
};
