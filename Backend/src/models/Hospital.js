const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  hospitalId: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: { type: String, required: true },
  facilities: [String],
  availableAmbulances: { type: Number, default: 0 },
  location: {
    lat: Number,
    lng: Number,
  }
}, { timestamps: true });

module.exports = mongoose.model('Hospital', hospitalSchema);