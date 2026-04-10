const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  assignedHospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    // This is null initially until the system finds the nearest hospital
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String } // Optional: Reverse geocoded address
  },
  symptomsReported: {
    type: String, // E.g., "Severe chest pain, sweating"
    required: true
  },
  aiPredictedDisease: {
    type: String, // E.g., "Myocardial Infarction"
  },
  severity: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'],
    default: 'MODERATE'
  },
  status: {
    type: String,
    enum: ['SEARCHING_AMBULANCE', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED_AT_HOSPITAL', 'RESOLVED'],
    default: 'SEARCHING_AMBULANCE'
  },
  aiChatTranscript: [{
    role: { type: String, enum: ['user', 'ai'] },
    message: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Emergency', emergencySchema);