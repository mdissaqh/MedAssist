const Hospital = require('../models/Hospital');

exports.updateResources = async (req, res) => {
  try {
    // req.user.id comes from your protect middleware when the hospital is logged in
    const hospitalId = req.user.id; 
    const { availableAmbulances, specialties } = req.body;

    const updatedHospital = await Hospital.findByIdAndUpdate(
      hospitalId,
      { availableAmbulances, specialties },
      { new: true }
    );

    if (!updatedHospital) {
      return res.status(404).json({ message: 'Hospital not found in database' });
    }

    res.status(200).json({ message: 'Resources updated successfully', hospital: updatedHospital });
  } catch (error) {
    console.error("Update Resources Error:", error);
    res.status(500).json({ message: 'Failed to update resources', error: error.message });
  }
};

exports.getHospitalProfile = async (req, res) => {
  try {
    // Fetch the hospital using the ID from the protect middleware
    const hospital = await Hospital.findById(req.user.id).select('-password');
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    res.status(200).json(hospital);
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ message: 'Failed to fetch hospital data' });
  }
};