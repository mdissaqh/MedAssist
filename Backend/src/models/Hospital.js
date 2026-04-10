const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  hospitalId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  availableAmbulances: { type: Number, default: 0 },
  location: { lat: Number, lng: Number },
  
  // Replaced facilities with specialties
  specialties: [{
    disease: { 
      type: String, 
      enum: ['Heart Attack', 'Stroke', 'Cardiac Arrest', 'Severe Asthma Attack', 'Severe External Bleeding', 'Brain Hemorrhage', 'Seizure', 'Snake Bite', 'Other'] 
    },
    isAvailable: { type: Boolean, default: true } 
  }]
}, { timestamps: true });

module.exports = mongoose.model('Hospital', hospitalSchema);