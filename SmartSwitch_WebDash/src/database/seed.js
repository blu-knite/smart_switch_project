process.env.NODE_CONFIG_DIR = require('path').join(__dirname, '..', 'config');

const sequelize = require('../config/database');
const User = require('../models/User');
const Place = require('../models/Place');
const Board = require('../models/Board');
const Switch = require('../models/Switch');
const Schedule = require('../models/Schedule');
const Routine = require('../models/Routine');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('\n' + '='.repeat(50));
    console.log('🌱 SEEDING DATABASE');
    console.log('='.repeat(50));
    
    await sequelize.authenticate();
    console.log('✓ Connected to database');

    // Check if any users exist
    const userCount = await User.count();
    
    let user;
    if (userCount === 0) {
      console.log('ℹ️  No users found. Creating default admin user...');
      
      user = await User.create({
        email: 'admin@smartswitch.io',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin',
        theme: 'dark',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        isActive: true
      });

      console.log('✓ Default admin user created');
      console.log('   Email: admin@smartswitch.io');
      console.log('   Password: admin123');
      console.log('   ⚠️  PLEASE CHANGE THIS PASSWORD AFTER FIRST LOGIN!');
    } else {
      // Get the first user to use for seeding other data
      user = await User.findOne();
      console.log(`✓ Using existing user: ${user.email}`);
    }

    // Check if places exist
    const placeCount = await Place.count();
    let places = [];

    if (placeCount === 0) {
      console.log('ℹ️  No places found. Creating default places...');
      
      places = await Place.bulkCreate([
        {
          name: 'Home',
          icon: 'home',
          address: '123 Smart Street',
          userId: user.id,
          isActive: true
        },
        {
          name: 'Work Place',
          icon: 'building',
          address: '456 Office Avenue',
          userId: user.id,
          isActive: true
        },
        {
          name: 'Guest House',
          icon: 'house-user',
          address: '789 Vacation Lane',
          userId: user.id,
          isActive: true
        }
      ]);

      console.log(`✓ ${places.length} places created`);
    } else {
      places = await Place.findAll({ where: { userId: user.id } });
      console.log(`✓ ${places.length} existing places found`);
    }

    // Check if boards exist
    const boardCount = await Board.count();
    
    if (boardCount === 0) {
      console.log('ℹ️  No boards found. Creating default boards...');
      
      const boards = await Board.bulkCreate([
        {
          uid: 'SmartSwitch_b29',
          name: 'Living Room Board',
          icon: 'tv',
          description: 'Main living area controls',
          placeId: places[0]?.id || null,
          userId: user.id,
          firmwareVersion: '2.1.0',
          ipAddress: '192.168.1.101',
          isOnline: true
        },
        {
          uid: 'SmartSwitch_a45',
          name: 'Bedroom Board',
          icon: 'bed',
          description: 'Master bedroom controls',
          placeId: places[0]?.id || null,
          userId: user.id,
          firmwareVersion: '2.1.0',
          ipAddress: '192.168.1.102',
          isOnline: true
        },
        {
          uid: 'SmartSwitch_c78',
          name: 'Office Board',
          icon: 'desktop',
          description: 'Home office controls',
          placeId: places[1]?.id || null,
          userId: user.id,
          firmwareVersion: '2.1.0',
          ipAddress: '192.168.1.103',
          isOnline: true
        }
      ]);

      console.log(`✓ ${boards.length} boards created`);

      // Create switches for each board
      const switches = [];
      
      for (const board of boards) {
        // Living Room Board (4 switches)
        if (board.name.includes('Living')) {
          switches.push(
            { boardId: board.id, index: 1, name: 'Main Light', icon: 'lightbulb', color: 'primary', state: true, mode: 3, power: 60 },
            { boardId: board.id, index: 2, name: 'Dimmer Light', icon: 'lightbulb', color: 'cyan', state: false, mode: 2, power: 40 },
            { boardId: board.id, index: 3, name: 'Fan', icon: 'fan', color: 'success', state: true, mode: 1, power: 75 },
            { boardId: board.id, index: 4, name: 'TV Socket', icon: 'tv', color: 'warning', state: false, mode: 0, power: 120 }
          );
        }
        // Bedroom Board (3 switches)
        else if (board.name.includes('Bedroom')) {
          switches.push(
            { boardId: board.id, index: 1, name: 'Ceiling Light', icon: 'lightbulb', color: 'primary', state: false, mode: 3, power: 60 },
            { boardId: board.id, index: 2, name: 'Bedside Lamp', icon: 'lightbulb', color: 'accent', state: true, mode: 2, power: 25 },
            { boardId: board.id, index: 3, name: 'AC Socket', icon: 'snowflake', color: 'cyan', state: false, mode: 1, power: 1500 }
          );
        }
        // Office Board (5 switches)
        else if (board.name.includes('Office')) {
          switches.push(
            { boardId: board.id, index: 1, name: 'Desk Light', icon: 'lightbulb', color: 'primary', state: true, mode: 3, power: 40 },
            { boardId: board.id, index: 2, name: 'Monitor Socket', icon: 'desktop', color: 'purple', state: true, mode: 2, power: 200 },
            { boardId: board.id, index: 3, name: 'Heater', icon: 'fire', color: 'warning', state: false, mode: 1, power: 1000 },
            { boardId: board.id, index: 4, name: 'Router', icon: 'wifi', color: 'success', state: true, mode: 0, power: 15 },
            { boardId: board.id, index: 5, name: 'Printer', icon: 'print', color: 'muted', state: false, mode: 0, power: 50 }
          );
        }
      }

      await Switch.bulkCreate(switches);
      console.log(`✓ ${switches.length} switches created`);
    } else {
      console.log(`✓ ${boardCount} existing boards found`);
    }

    // Check if schedules exist
    const scheduleCount = await Schedule.count();
    
    if (scheduleCount === 0) {
      console.log('ℹ️  No schedules found. Creating default schedules...');
      
      await Schedule.bulkCreate([
        {
          name: 'Morning Lights',
          description: 'Turn on living room lights at 7 AM',
          boardId: 1,
          placeId: places[0]?.id || null,
          userId: user.id,
          action: 'ON',
          mode: 'manual',
          cronExpression: '0 7 * * *',
          startTime: '07:00:00',
          isActive: true
        },
        {
          name: 'Night Mode',
          description: 'Turn off all lights at 11 PM',
          boardId: 1,
          placeId: places[0]?.id || null,
          userId: user.id,
          action: 'OFF',
          mode: 'ai',
          cronExpression: '0 23 * * *',
          startTime: '23:00:00',
          isActive: true
        }
      ]);

      console.log('✓ Schedules created');
    }

    // Check if routines exist
    const routineCount = await Routine.count();
    
    if (routineCount === 0) {
      console.log('ℹ️  No routines found. Creating default routines...');
      
      await Routine.bulkCreate([
        {
          name: 'Good Morning',
          description: 'Start your day',
          boardId: 1,
          placeId: places[0]?.id || null,
          userId: user.id,
          actions: [
            { switchIndex: 1, action: 'ON' },
            { switchIndex: 3, action: 'ON' }
          ],
          trigger: 'time',
          triggerConfig: { time: '07:00' },
          enabled: true
        },
        {
          name: 'Good Night',
          description: 'Prepare for sleep',
          boardId: 1,
          placeId: places[0]?.id || null,
          userId: user.id,
          actions: [
            { switchIndex: 1, action: 'OFF' },
            { switchIndex: 2, action: 'OFF' },
            { switchIndex: 3, action: 'OFF' },
            { switchIndex: 4, action: 'OFF' }
          ],
          trigger: 'time',
          triggerConfig: { time: '23:00' },
          enabled: true
        }
      ]);

      console.log('✓ Routines created');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ DATABASE SEEDING COMPLETED!');
    console.log('='.repeat(50));
    
    // Show user credentials
    console.log('\n📝 User Credentials:');
    const users = await User.findAll({ attributes: ['id', 'email', 'name', 'role'] });
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.name}) [${u.role}]`);
    });
    
    console.log('\n🚀 You can now start the server with: npm start\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

seedDatabase();