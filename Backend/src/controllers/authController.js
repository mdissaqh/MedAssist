const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Patient = require('../models/Patient');
const Admin = require('../models/Admin');
const Hospital = require('../models/Hospital');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Patient Login
exports.patientLogin = async (req, res) => {
  const { mobileNumber } = req.body;
  try {
    if (!mobileNumber) {
      return res.status(400).json({ message: 'Mobile number is required' });
    }
    let patient = await Patient.findOne({ mobileNumber });
    if (!patient) {
      patient = await Patient.create({ mobileNumber });
    }
    res.status(200).json({
      _id: patient._id,
      mobileNumber: patient.mobileNumber,
      token: generateToken(patient._id, 'patient'),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Admin Login
exports.adminLogin = async (req, res) => {
  const { adminId, password } = req.body;
  try {
    const admin = await Admin.findOne({ adminId });
    if (admin && (await bcrypt.compare(password, admin.password))) {
      res.json({
        _id: admin._id,
        adminId: admin.adminId,
        token: generateToken(admin._id, 'admin'),
      });
    } else {
      res.status(401).json({ message: 'Invalid Admin ID or Password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Hospital Login
exports.hospitalLogin = async (req, res) => {
  const { hospitalId, password } = req.body;
  try {
    const hospital = await Hospital.findOne({ hospitalId });
    if (hospital && (await bcrypt.compare(password, hospital.password))) {
      res.json({
        _id: hospital._id,
        hospitalId: hospital.hospitalId,
        name: hospital.name,
        token: generateToken(hospital._id, 'hospital'),
      });
    } else {
      res.status(401).json({ message: 'Invalid Hospital ID or Password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};