const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/payments - View all payments / payment history
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT 
        p.payment_id,
        TO_CHAR(p.payment_date, 'YYYY-MM-DD') AS payment_date,
        p.payment_method,
        p.amount,
        p.status AS payment_status,
        p.booking_id,
        TO_CHAR(b.start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(b.end_date, 'YYYY-MM-DD') AS end_date,
        b.total_amount AS booking_amount,
        b.status AS booking_status,
        u.user_id,
        u.name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        v.vehicle_id,
        v.model AS vehicle_model,
        v.reg_no AS vehicle_reg_no
      FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN users u ON b.user_id = u.user_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    query += ' ORDER BY p.payment_id DESC';

    const result = await db.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving payments' });
  }
});

// GET /api/payments/pending-bookings - List bookings awaiting payment or partial payment
router.get('/pending-bookings', async (req, res) => {
  try {
    const query = `
      SELECT 
        b.booking_id,
        TO_CHAR(b.start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(b.end_date, 'YYYY-MM-DD') AS end_date,
        b.total_amount,
        b.status AS booking_status,
        u.name AS customer_name,
        v.model AS vehicle_model,
        v.reg_no AS vehicle_reg_no,
        p.payment_id,
        COALESCE(p.status, 'Unrecorded') AS payment_status
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      LEFT JOIN payments p ON b.booking_id = p.booking_id
      WHERE p.payment_id IS NULL OR p.status != 'Paid'
      ORDER BY b.booking_id DESC
    `;
    const result = await db.query(query);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Error fetching pending bookings for payment:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving pending bookings' });
  }
});

// POST /api/payments - Record or update payment for a booking
router.post('/', async (req, res) => {
  try {
    const { booking_id, amount, payment_method, status = 'Paid' } = req.body;

    if (!booking_id || amount === undefined || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID, amount, and payment method are required.',
      });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount < 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a non-negative number.' });
    }

    const validMethods = ['Cash', 'UPI', 'Card'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: `Payment method must be one of: ${validMethods.join(', ')}`,
      });
    }

    const validStatuses = ['Pending', 'Paid', 'Failed', 'Refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Payment status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Verify booking exists
    const bookingCheck = await db.query('SELECT booking_id, total_amount FROM bookings WHERE booking_id = $1', [booking_id]);
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Upsert into payments table because booking_id is UNIQUE
    const upsertQuery = `
      INSERT INTO payments (payment_method, amount, status, booking_id, payment_date)
      VALUES ($1, $2, $3, $4, CURRENT_DATE)
      ON CONFLICT (booking_id) 
      DO UPDATE SET
        payment_method = EXCLUDED.payment_method,
        amount = EXCLUDED.amount,
        status = EXCLUDED.status,
        payment_date = CURRENT_DATE
      RETURNING *
    `;
    const result = await db.query(upsertQuery, [payment_method, payAmount, status, booking_id]);

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error recording payment' });
  }
});

// PUT /api/payments/:id - Update payment status
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_method, amount } = req.body;

    const validStatuses = ['Pending', 'Paid', 'Failed', 'Refunded'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Payment status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const validMethods = ['Cash', 'UPI', 'Card'];
    if (payment_method && !validMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: `Payment method must be one of: ${validMethods.join(', ')}`,
      });
    }

    let updateQuery = `
      UPDATE payments
      SET status = COALESCE($1, status),
          payment_method = COALESCE($2, payment_method),
          amount = COALESCE($3, amount)
      WHERE payment_id = $4
      RETURNING *
    `;
    const values = [
      status || null,
      payment_method || null,
      amount !== undefined ? parseFloat(amount) : null,
      id,
    ];

    const result = await db.query(updateQuery, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    res.json({
      success: true,
      message: 'Payment updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error updating payment' });
  }
});

module.exports = router;

