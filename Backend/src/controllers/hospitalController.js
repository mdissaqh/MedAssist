const Hospital = require('../models/Hospital');

exports.updateResources = async (req, res) => {
  try {
    // Assuming req.user is set by the protect middleware
    const hospitalId = req.user.id; 
    const { availableAmbulances, specialties } = req.body;

    const updatedHospital = await Hospital.findByIdAndUpdate(
      hospitalId,
      { availableAmbulances, specialties },
      { new: true }
    );

    res.status(200).json({ message: 'Resources updated successfully', hospital: updatedHospital });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update resources', error: error.message });
  }
};