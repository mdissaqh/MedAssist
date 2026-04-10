const Hospital = require('../models/Hospital');
const bcrypt = require('bcryptjs');

// 1. ADD HOSPITAL
exports.addHospital = async (req, res) => {
  try {
    const { hospitalId, password, name, specialties, lat, lng } = req.body;

    const existingHospital = await Hospital.findOne({ hospitalId });
    if (existingHospital) return res.status(400).json({ message: 'Hospital ID already exists!' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newHospital = await Hospital.create({
      hospitalId,
      password: hashedPassword,
      name,
      specialties,
      location: { lat, lng }
    });

    res.status(201).json({ message: 'Hospital added!', hospital: newHospital });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add hospital', error: error.message });
  }
};

// 2. SEARCH HOSPITALS
exports.searchHospitals = async (req, res) => {
  try {
    const { query } = req.query;
    const hospitals = await Hospital.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { hospitalId: { $regex: query, $options: 'i' } }
      ]
    }).select('-password'); 
    
    res.status(200).json(hospitals);
  } catch (error) {
    res.status(500).json({ message: 'Search failed' });
  }
};

// 3. EDIT HOSPITAL
exports.editHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, specialties, lat, lng } = req.body;

    const updatedHospital = await Hospital.findByIdAndUpdate(
      id,
      { 
        name, 
        specialties, 
        location: { lat, lng } 
      },
      { new: true } 
    );

    if (!updatedHospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    res.status(200).json({ message: 'Hospital updated successfully!', hospital: updatedHospital });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update hospital', error: error.message });
  }
};