// Backend/seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Admin = require('./src/models/Admin');
const Hospital = require('./src/models/Hospital'); // We can seed a hospital too!

// Load environment variables so we can connect to the database
dotenv.config();

const seedDatabase = async () => {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to Database for seeding...');

    // 2. Hash the passwords
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const hospitalPassword = await bcrypt.hash('hospital123', salt);

    // 3. Clear existing dummy data (optional, but good for a fresh start)
    await Admin.deleteMany();
    await Hospital.deleteMany();

    // 4. Create the Admin
    await Admin.create({
      adminId: 'admin_001',
      password: adminPassword,
    });
    console.log('✅ Admin created! (ID: admin_001, Pass: admin123)');

    // 5. Create a Test Hospital (so you can test the hospital login too)
    await Hospital.create({
      hospitalId: 'hosp_001',
      password: hospitalPassword,
      name: 'Cambridge City Hospital',
      facilities: ['ICU', 'Trauma Center', 'Oxygen Support'],
      availableAmbulances: 5,
      location: { lat: 12.9716, lng: 77.5946 } // Example coordinates
    });
    console.log('✅ Hospital created! (ID: hosp_001, Pass: hospital123)');

    // 6. Exit the script
    console.log('Seeding complete!');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

// Run the function
seedDatabase();