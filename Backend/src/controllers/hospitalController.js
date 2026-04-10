const Hospital = require('../models/Hospital');
const Emergency = require('../models/Emergency');

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

exports.getActiveEmergencies = async (req, res) => {
  try {
    // Find emergencies assigned to THIS hospital that haven't been resolved yet
    const activeEmergencies = await Emergency.find({
      assignedHospital: req.user.id,
      status: { $in: ['DISPATCHED', 'EN_ROUTE'] }
    })
    .populate('patient') // Get the patient details (for mobile number)
    .sort({ createdAt: -1 }); // Newest first

    // Format the data to match your frontend UI perfectly
    const formattedData = activeEmergencies.map(req => ({
      id: req._id,
      patientMobile: req.patient ? req.patient.mobileNumber : "Unknown",
      address: req.location ? `Lat: ${req.location.lat.toFixed(4)}, Lng: ${req.location.lng.toFixed(4)}` : "Location pending",
      symptoms: req.symptomsReported,
      predictedDisease: req.aiPredictedDisease,
      eta: "8 Mins" // You can make this dynamic later
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Fetch Emergencies Error:", error);
    res.status(500).json({ message: 'Failed to fetch active emergencies' });
  }
};

exports.resolveEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    await Emergency.findByIdAndUpdate(id, { status: 'RESOLVED' });
    res.status(200).json({ message: 'Patient arrival confirmed and emergency resolved.' });
  } catch (error) {
    console.error("Resolve Error:", error);
    res.status(500).json({ message: 'Failed to resolve emergency' });
  }
};