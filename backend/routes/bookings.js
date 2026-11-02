const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/bookings - List all bookings with customer and vehicle info
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT 
        b.booking_id,
        TO_CHAR(b.booking_date, 'YYYY-MM-DD') AS booking_date,
        TO_CHAR(b.start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(b.end_date, 'YYYY-MM-DD') AS end_date,
        b.total_amount,
        b.status AS booking_status,
        b.user_id,
        b.vehicle_id,
        u.name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        v.model AS vehicle_model,
        v.reg_no AS vehicle_reg_no,
        v.daily_rate,
        p.payment_id,
        p.payment_method,
        p.amount AS payment_amount,
        COALESCE(p.status, 'Pending') AS payment_status
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      LEFT JOIN payments p ON b.booking_id = p.booking_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }

    query += ' ORDER BY b.booking_id DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving bookings' });
  }
});

// GET /api/bookings/:id - Single booking
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        b.booking_id,
        TO_CHAR(b.booking_date, 'YYYY-MM-DD') AS booking_date,
        TO_CHAR(b.start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(b.end_date, 'YYYY-MM-DD') AS end_date,
        b.total_amount,
        b.status AS booking_status,
        b.user_id,
        b.vehicle_id,
        u.name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        v.model AS vehicle_model,
        v.reg_no AS vehicle_reg_no,
        v.daily_rate,
        p.payment_id,
        p.payment_method,
        p.amount AS payment_amount,
        COALESCE(p.status, 'Pending') AS payment_status
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      LEFT JOIN payments p ON b.booking_id = p.booking_id
      WHERE b.booking_id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving booking' });
  }
});

// POST /api/bookings - Create booking
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, vehicle_id, start_date, end_date } = req.body;

    if (!user_id || !vehicle_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Customer, vehicle, start date, and end date are required.',
      });
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start or end date format.' });
    }

    if (endDateObj <= startDateObj) {
      return res.status(400).json({ success: false, message: 'End date must be strictly after start date.' });
    }

    // Check user exists
    const userRes = await client.query('SELECT user_id, name FROM users WHERE user_id = $1', [user_id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected customer not found.' });
    }

    // Check vehicle exists and is Available
    const vehicleRes = await client.query('SELECT vehicle_id, model, daily_rate, status FROM vehicles WHERE vehicle_id = $1', [vehicle_id]);
    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected vehicle not found.' });
    }

    const vehicle = vehicleRes.rows[0];
    if (vehicle.status !== 'Available') {
      return res.status(400).json({
        success: false,
        message: `Vehicle "${vehicle.model}" is currently not available (Status: ${vehicle.status}).`,
      });
    }

    // Calculate days and total amount
    const diffTime = endDateObj.getTime() - startDateObj.getTime();
    const days = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    const totalAmount = (parseFloat(vehicle.daily_rate) * days).toFixed(2);

    await client.query('BEGIN');

    // 1. Insert booking
    const insertBookingQuery = `
      INSERT INTO bookings (start_date, end_date, total_amount, user_id, vehicle_id, status)
      VALUES ($1, $2, $3, $4, $5, 'Confirmed')
      RETURNING *
    `;
    const bookingRes = await client.query(insertBookingQuery, [
      start_date,
      end_date,
      totalAmount,
      user_id,
      vehicle_id,
    ]);
    const createdBooking = bookingRes.rows[0];

    // 2. Mark vehicle unavailable (status = 'Inactive' per schema check constraint)
    await client.query("UPDATE vehicles SET status = 'Inactive' WHERE vehicle_id = $1", [vehicle_id]);

    // 3. Create initial pending payment record for this booking
    const insertPaymentQuery = `
      INSERT INTO payments (payment_method, amount, status, booking_id)
      VALUES ('Cash', $1, 'Pending', $2)
      RETURNING *
    `;
    await client.query(insertPaymentQuery, [totalAmount, createdBooking.booking_id]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Booking created successfully and vehicle marked unavailable.',
      data: {
        ...createdBooking,
        days,
        daily_rate: vehicle.daily_rate,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating booking' });
  } finally {
    client.release();
  }
});

// POST /api/bookings/:id/return - Return a rented vehicle
router.post('/:id/return', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const bookingRes = await client.query('SELECT * FROM bookings WHERE booking_id = $1', [id]);
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingRes.rows[0];
    if (booking.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'This rental has already been completed.' });
    }

    await client.query('BEGIN');

    // Update booking status to Completed
    const updateBookingRes = await client.query(
      "UPDATE bookings SET status = 'Completed' WHERE booking_id = $1 RETURNING *",
      [id]
    );

    // Update vehicle status back to Available
    await client.query("UPDATE vehicles SET status = 'Available' WHERE vehicle_id = $1", [booking.vehicle_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Vehicle returned successfully and marked available again.',
      data: updateBookingRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error returning vehicle:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error completing rental return' });
  } finally {
    client.release();
  }
});

// POST /api/bookings/:id/cancel - Cancel booking
router.post('/:id/cancel', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const bookingRes = await client.query('SELECT * FROM bookings WHERE booking_id = $1', [id]);
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingRes.rows[0];
    if (booking.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'This booking is already cancelled.' });
    }

    await client.query('BEGIN');

    // Update booking status to Cancelled
    const updateBookingRes = await client.query(
      "UPDATE bookings SET status = 'Cancelled' WHERE booking_id = $1 RETURNING *",
      [id]
    );

    // If vehicle was marked Inactive by this booking, restore it to Available
    await client.query("UPDATE vehicles SET status = 'Available' WHERE vehicle_id = $1", [booking.vehicle_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Booking cancelled successfully and vehicle marked available.',
      data: updateBookingRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling booking:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error cancelling booking' });
  } finally {
    client.release();
  }
});

module.exports = router;

