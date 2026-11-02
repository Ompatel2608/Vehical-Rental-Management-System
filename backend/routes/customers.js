const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/customers - View all customers with optional search
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT user_id, name, email, license_no, phone, address, role
      FROM users
      WHERE role = 'customer'
    `;
    const params = [];

    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR phone LIKE $${params.length} OR LOWER(COALESCE(license_no, '')) LIKE $${params.length})`;
    }

    query += ' ORDER BY user_id ASC';

    const result = await db.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving customers' });
  }
});

// GET /api/customers/:id - View single customer
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT user_id, name, email, license_no, phone, address, role FROM users WHERE user_id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving customer' });
  }
});

// POST /api/customers - Add new customer
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, license_no, address } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone are required fields.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    const insertQuery = `
      INSERT INTO users (name, email, phone, license_no, address, role)
      VALUES ($1, $2, $3, $4, $5, 'customer')
      RETURNING user_id, name, email, license_no, phone, address, role
    `;
    const values = [
      name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      license_no ? license_no.trim() : null,
      address ? address.trim() : null,
    ];

    const result = await db.query(insertQuery, values);
    res.status(201).json({ success: true, message: 'Customer added successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error adding customer:', error);
    if (error.code === '23505') {
      if (error.detail && error.detail.includes('email')) {
        return res.status(409).json({ success: false, message: 'A customer with this email already exists.' });
      }
      if (error.detail && error.detail.includes('license_no')) {
        return res.status(409).json({ success: false, message: 'A customer with this license number already exists.' });
      }
      return res.status(409).json({ success: false, message: 'Customer with these unique details already exists.' });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error creating customer' });
  }
});

// PUT /api/customers/:id - Edit customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, license_no, address } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone are required fields.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    const updateQuery = `
      UPDATE users
      SET name = $1,
          email = $2,
          phone = $3,
          license_no = $4,
          address = $5
      WHERE user_id = $6
      RETURNING user_id, name, email, license_no, phone, address, role
    `;
    const values = [
      name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      license_no ? license_no.trim() : null,
      address ? address.trim() : null,
      id,
    ];

    const result = await db.query(updateQuery, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating customer:', error);
    if (error.code === '23505') {
      if (error.detail && error.detail.includes('email')) {
        return res.status(409).json({ success: false, message: 'A customer with this email already exists.' });
      }
      if (error.detail && error.detail.includes('license_no')) {
        return res.status(409).json({ success: false, message: 'A customer with this license number already exists.' });
      }
      return res.status(409).json({ success: false, message: 'Customer details violate unique constraints.' });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error updating customer' });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const checkBookings = await db.query('SELECT COUNT(*)::int AS count FROM bookings WHERE user_id = $1', [id]);
    if (checkBookings.rows[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer because they have booking history.',
      });
    }

    const result = await db.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id, name', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer deleted successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error deleting customer:', error);
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer: referenced in booking or review records.',
      });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error deleting customer' });
  }
});

module.exports = router;

