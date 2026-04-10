const Hospital = require('../models/Hospital');
const bcrypt = require('bcryptjs');

// Add a new hospital
exports.addHospital = async (req, res) => {
  try {
    const { hospitalId, password, name, facilities, availableAmbulances, lat, lng } = req.body;

    // Check if hospital already exists
    const existingHospital = await Hospital.findOne({ hospitalId });
    if (existingHospital) {
      return res.status(400).json({ message: 'Hospital ID already exists!' });
    }

    // Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the hospital
    const newHospital = await Hospital.create({
      hospitalId,
      password: hashedPassword,
      name,
      facilities,
      availableAmbulances: availableAmbulances || 0,
      location: { lat, lng }
    });

    res.status(201).json({ message: 'Hospital added successfully!', hospital: newHospital });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add hospital', error: error.message });
  }
};

// Edit an existing hospital
exports.editHospital = async (req, res) => {
  try {
    const { id } = req.params; // The database _id of the hospital
    const { name, facilities, availableAmbulances, lat, lng } = req.body;

    const updatedHospital = await Hospital.findByIdAndUpdate(
      id,
      { 
        name, 
        facilities, 
        availableAmbulances, 
        location: { lat, lng } 
      },
      { new: true } // Returns the updated document
    );

    if (!updatedHospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    res.status(200).json({ message: 'Hospital updated successfully!', hospital: updatedHospital });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update hospital', error: error.message });
  }
};