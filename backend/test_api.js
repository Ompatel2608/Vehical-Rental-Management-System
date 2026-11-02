const http = require('http');
const app = require('express')();
const path = require('path');
const cors = require('cors');

// Build test server with the exact configuration
require('dotenv').config({ path: path.join(__dirname, '.env') });
app.use(cors());
app.use(require('express').json());
app.use(require('express').urlencoded({ extended: true }));

app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use(require('express').static(path.join(__dirname, '../frontend')));

const server = app.listen(3001, async () => {
  console.log('Testing server started on port 3001');

  function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = res.headers['content-type']?.includes('application/json')
              ? JSON.parse(data)
              : data;
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, body: data });
          }
        });
      });

      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ ${name}:`, e.message);
      failed++;
    }
  }

  try {
    console.log('\n--- 1. Testing Frontend Static Files ---');
    await test('GET / returns HTML', async () => {
      const res = await request('GET', '/');
      if (res.status !== 200 || !res.body.includes('AutoRent')) {
        throw new Error(`Expected 200 with AutoRent HTML, got ${res.status}`);
      }
    });

    await test('GET /style.css returns CSS', async () => {
      const res = await request('GET', '/style.css');
      if (res.status !== 200 || !res.body.includes('--primary')) {
        throw new Error(`Expected 200 with CSS, got ${res.status}`);
      }
    });

    await test('GET /script.js returns JS', async () => {
      const res = await request('GET', '/script.js');
      if (res.status !== 200 || !res.body.includes('AutoRent')) {
        throw new Error(`Expected 200 with JS, got ${res.status}`);
      }
    });

    console.log('\n--- 2. Testing Dashboard API ---');
    await test('GET /api/dashboard/stats', async () => {
      const res = await request('GET', '/api/dashboard/stats');
      if (res.status !== 200 || !res.body.success) throw new Error('Failed to get stats');
      console.log('    Stats received:', res.body.data);
    });

    await test('GET /api/dashboard/recent-activity', async () => {
      const res = await request('GET', '/api/dashboard/recent-activity');
      if (res.status !== 200 || !res.body.success) throw new Error('Failed to get recent activity');
    });

    console.log('\n--- 3. Testing Vehicles API ---');
    await test('GET /api/vehicles/meta/lookup', async () => {
      const res = await request('GET', '/api/vehicles/meta/lookup');
      if (res.status !== 200 || !res.body.data.categories || !res.body.data.branches) {
        throw new Error('Failed lookup');
      }
    });

    await test('GET /api/vehicles', async () => {
      const res = await request('GET', '/api/vehicles');
      if (res.status !== 200 || !Array.isArray(res.body.data)) throw new Error('Failed list vehicles');
    });

    let testVehicleId;
    const testRegNo = `TEST${Date.now().toString().slice(-6)}`;
    await test('POST /api/vehicles (Create Vehicle)', async () => {
      const res = await request('POST', '/api/vehicles', {
        reg_no: testRegNo,
        model: 'Test Toyota Camry',
        color: 'Silver',
        daily_rate: 3200,
        status: 'Available',
        category_id: 1,
        branch_id: 1,
        fuel_type: 'Hybrid',
        seats: 5,
      });
      if (res.status !== 201 || !res.body.success) throw new Error(JSON.stringify(res.body));
      testVehicleId = res.body.data.vehicle_id;
    });

    await test('GET /api/vehicles/:id', async () => {
      const res = await request('GET', `/api/vehicles/${testVehicleId}`);
      if (res.status !== 200 || res.body.data.vehicle_id !== testVehicleId) {
        throw new Error('Vehicle fetch mismatch');
      }
    });

    await test('PUT /api/vehicles/:id', async () => {
      const res = await request('PUT', `/api/vehicles/${testVehicleId}`, {
        reg_no: testRegNo,
        model: 'Test Toyota Camry Updated',
        color: 'Gold',
        daily_rate: 3500,
        status: 'Available',
        category_id: 1,
        branch_id: 1,
        fuel_type: 'Hybrid',
        seats: 5,
      });
      if (res.status !== 200 || res.body.data.color !== 'Gold') {
        throw new Error('Vehicle update failed');
      }
    });

    console.log('\n--- 4. Testing Customers API ---');
    await test('GET /api/customers', async () => {
      const res = await request('GET', '/api/customers');
      if (res.status !== 200 || !Array.isArray(res.body.data)) throw new Error('Failed list customers');
    });

    let testCustomerId;
    const testEmail = `testuser${Date.now()}@example.com`;
    const testLicense = `LIC${Date.now().toString().slice(-7)}`;
    await test('POST /api/customers (Create Customer)', async () => {
      const res = await request('POST', '/api/customers', {
        name: 'Arjun Verma',
        email: testEmail,
        phone: '9898989898',
        license_no: testLicense,
        address: 'Satellite, Ahmedabad',
      });
      if (res.status !== 201 || !res.body.success) throw new Error(JSON.stringify(res.body));
      testCustomerId = res.body.data.user_id;
    });

    await test('GET /api/customers/:id', async () => {
      const res = await request('GET', `/api/customers/${testCustomerId}`);
      if (res.status !== 200 || res.body.data.user_id !== testCustomerId) {
        throw new Error('Customer fetch mismatch');
      }
    });

    await test('PUT /api/customers/:id', async () => {
      const res = await request('PUT', `/api/customers/${testCustomerId}`, {
        name: 'Arjun Verma Updated',
        email: testEmail,
        phone: '9898989899',
        license_no: testLicense,
        address: 'Bopal, Ahmedabad',
      });
      if (res.status !== 200 || res.body.data.name !== 'Arjun Verma Updated') {
        throw new Error('Customer update failed');
      }
    });

    console.log('\n--- 5. Testing Bookings API ---');
    let testBookingId;
    await test('POST /api/bookings (Create Rental Booking)', async () => {
      const today = new Date();
      const future = new Date();
      future.setDate(today.getDate() + 3);

      const toISO = (d) => d.toISOString().split('T')[0];
      const res = await request('POST', '/api/bookings', {
        user_id: testCustomerId,
        vehicle_id: testVehicleId,
        start_date: toISO(today),
        end_date: toISO(future),
      });

      if (res.status !== 201 || !res.body.success) throw new Error(JSON.stringify(res.body));
      testBookingId = res.body.data.booking_id;
      console.log(`    Created Booking ID: ${testBookingId}, Total Amount: ${res.body.data.total_amount}`);
    });

    await test('Verify vehicle is marked Inactive (unavailable)', async () => {
      const res = await request('GET', `/api/vehicles/${testVehicleId}`);
      if (res.body.data.status !== 'Inactive') {
        throw new Error(`Expected vehicle status Inactive, got ${res.body.data.status}`);
      }
    });

    await test('GET /api/bookings/:id', async () => {
      const res = await request('GET', `/api/bookings/${testBookingId}`);
      if (res.status !== 200 || res.body.data.booking_id !== testBookingId) {
        throw new Error('Booking fetch mismatch');
      }
    });

    console.log('\n--- 6. Testing Payments API ---');
    await test('GET /api/payments', async () => {
      const res = await request('GET', '/api/payments');
      if (res.status !== 200 || !Array.isArray(res.body.data)) throw new Error('Failed list payments');
    });

    await test('POST /api/payments (Record Payment)', async () => {
      const res = await request('POST', '/api/payments', {
        booking_id: testBookingId,
        amount: 10500,
        payment_method: 'UPI',
        status: 'Paid',
      });
      if (res.status !== 201 || !res.body.success) throw new Error(JSON.stringify(res.body));
      console.log(`    Recorded Payment ID: ${res.body.data.payment_id}, Status: ${res.body.data.status}`);
    });

    console.log('\n--- 7. Testing Vehicle Return & Completion ---');
    await test('POST /api/bookings/:id/return (Return Vehicle)', async () => {
      const res = await request('POST', `/api/bookings/${testBookingId}/return`);
      if (res.status !== 200 || res.body.data.status !== 'Completed') {
        throw new Error(JSON.stringify(res.body));
      }
    });

    await test('Verify vehicle restored to Available', async () => {
      const res = await request('GET', `/api/vehicles/${testVehicleId}`);
      if (res.body.data.status !== 'Available') {
        throw new Error(`Expected vehicle status Available, got ${res.body.data.status}`);
      }
    });

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    server.close(() => {
      console.log('Testing server stopped.');
      process.exit(failed > 0 ? 1 : 0);
    });
  }
});

