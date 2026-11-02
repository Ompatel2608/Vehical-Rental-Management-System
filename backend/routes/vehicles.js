const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/vehicles/meta - Get categories and branches for dropdowns
router.get('/meta/lookup', async (req, res) => {
  try {
    const categoriesRes = await db.query('SELECT category_id, category_name, description FROM vehicle_categories ORDER BY category_name ASC');
    const branchesRes = await db.query('SELECT branch_id, branch_name, address FROM branches ORDER BY branch_name ASC');
    res.json({
      success: true,
      data: {
        categories: categoriesRes.rows,
        branches: branchesRes.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching lookup metadata:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving metadata' });
  }
});

// GET /api/vehicles - View all with optional search & filters
router.get('/', async (req, res) => {
  try {
    const { category_id, status, search } = req.query;
    let query = `
      SELECT 
        v.vehicle_id,
        v.reg_no,
        v.model,
        v.color,
        v.daily_rate,
        v.status,
        v.category_id,
        v.branch_id,
        v.image_url,
        v.fuel_type,
        v.seats,
        c.category_name,
        b.branch_name
      FROM vehicles v
      JOIN vehicle_categories c ON v.category_id = c.category_id
      JOIN branches b ON v.branch_id = b.branch_id
      WHERE 1=1
    `;
    const params = [];

    if (category_id && category_id !== 'all') {
      params.push(parseInt(category_id, 10));
      query += ` AND v.category_id = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND v.status = $${params.length}`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(v.model) LIKE $${params.length} OR LOWER(v.reg_no) LIKE $${params.length} OR LOWER(c.category_name) LIKE $${params.length})`;
    }

    query += ' ORDER BY v.vehicle_id ASC';

    const result = await db.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving vehicles' });
  }
});

// GET /api/vehicles/:id - View single vehicle
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        v.*,
        c.category_name,
        b.branch_name
      FROM vehicles v
      JOIN vehicle_categories c ON v.category_id = c.category_id
      JOIN branches b ON v.branch_id = b.branch_id
      WHERE v.vehicle_id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching single vehicle:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving vehicle' });
  }
});

// POST /api/vehicles - Add new vehicle
router.post('/', async (req, res) => {
  try {
    const {
      reg_no,
      model,
      color,
      daily_rate,
      status = 'Available',
      category_id,
      branch_id,
      image_url,
      fuel_type,
      seats,
    } = req.body;

    if (!reg_no || !model || !daily_rate || !category_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: 'Registration number, model, daily rate, category, and branch are required.',
      });
    }

    const rate = parseFloat(daily_rate);
    if (isNaN(rate) || rate <= 0) {
      return res.status(400).json({ success: false, message: 'Daily rate must be a positive number.' });
    }

    const validStatuses = ['Available', 'Maintenance', 'Inactive'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const seatsNum = seats ? parseInt(seats, 10) : null;
    if (seatsNum !== null && (isNaN(seatsNum) || seatsNum <= 0)) {
      return res.status(400).json({ success: false, message: 'Seats must be a positive integer.' });
    }

    const insertQuery = `
      INSERT INTO vehicles (reg_no, model, color, daily_rate, status, category_id, branch_id, image_url, fuel_type, seats)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      reg_no.trim(),
      model.trim(),
      color ? color.trim() : null,
      rate,
      status,
      parseInt(category_id, 10),
      parseInt(branch_id, 10),
      image_url ? image_url.trim() : null,
      fuel_type ? fuel_type.trim() : null,
      seatsNum,
    ];

    const result = await db.query(insertQuery, values);
    res.status(201).json({ success: true, message: 'Vehicle created successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error adding vehicle:', error);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Vehicle with this registration number already exists.' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ success: false, message: 'Invalid category ID or branch ID referenced.' });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error creating vehicle' });
  }
});

// PUT /api/vehicles/:id - Edit vehicle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reg_no,
      model,
      color,
      daily_rate,
      status,
      category_id,
      branch_id,
      image_url,
      fuel_type,
      seats,
    } = req.body;

    if (!reg_no || !model || !daily_rate || !category_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: 'Registration number, model, daily rate, category, and branch are required.',
      });
    }

    const rate = parseFloat(daily_rate);
    if (isNaN(rate) || rate <= 0) {
      return res.status(400).json({ success: false, message: 'Daily rate must be a positive number.' });
    }

    const validStatuses = ['Available', 'Maintenance', 'Inactive'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const seatsNum = seats ? parseInt(seats, 10) : null;
    if (seatsNum !== null && (isNaN(seatsNum) || seatsNum <= 0)) {
      return res.status(400).json({ success: false, message: 'Seats must be a positive integer.' });
    }

    const updateQuery = `
      UPDATE vehicles
      SET reg_no = $1,
          model = $2,
          color = $3,
          daily_rate = $4,
          status = $5,
          category_id = $6,
          branch_id = $7,
          image_url = $8,
          fuel_type = $9,
          seats = $10
      WHERE vehicle_id = $11
      RETURNING *
    `;
    const values = [
      reg_no.trim(),
      model.trim(),
      color ? color.trim() : null,
      rate,
      status || 'Available',
      parseInt(category_id, 10),
      parseInt(branch_id, 10),
      image_url ? image_url.trim() : null,
      fuel_type ? fuel_type.trim() : null,
      seatsNum,
      id,
    ];

    const result = await db.query(updateQuery, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.json({ success: true, message: 'Vehicle updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Vehicle with this registration number already exists.' });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error updating vehicle' });
  }
});

// DELETE /api/vehicles/:id - Delete vehicle
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if vehicle has bookings or other references
    const checkBookings = await db.query('SELECT COUNT(*)::int AS count FROM bookings WHERE vehicle_id = $1', [id]);
    if (checkBookings.rows[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete vehicle with existing booking records. Mark it as Inactive or Maintenance instead.',
      });
    }

    const result = await db.query('DELETE FROM vehicles WHERE vehicle_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.json({ success: true, message: 'Vehicle deleted successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete vehicle because it is referenced in maintenance, insurance, or booking records.',
      });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error deleting vehicle' });
  }
});

module.exports = router;

