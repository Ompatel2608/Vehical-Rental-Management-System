const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const totalVehiclesRes = await db.query('SELECT COUNT(*)::int AS count FROM vehicles');
    const availableVehiclesRes = await db.query("SELECT COUNT(*)::int AS count FROM vehicles WHERE status = 'Available'");
    const activeRentalsRes = await db.query("SELECT COUNT(*)::int AS count FROM bookings WHERE status = 'Confirmed'");
    const totalCustomersRes = await db.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'customer'");
    const totalRevenueRes = await db.query("SELECT COALESCE(SUM(amount), 0)::numeric AS sum FROM payments WHERE status = 'Paid'");

    res.json({
      success: true,
      data: {
        totalVehicles: totalVehiclesRes.rows[0].count,
        availableVehicles: availableVehiclesRes.rows[0].count,
        activeRentals: activeRentalsRes.rows[0].count,
        totalCustomers: totalCustomersRes.rows[0].count,
        totalRevenue: parseFloat(totalRevenueRes.rows[0].sum),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving dashboard statistics' });
  }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', async (req, res) => {
  try {
    const recentBookingsRes = await db.query(`
      SELECT 
        b.booking_id,
        b.booking_date,
        b.start_date,
        b.end_date,
        b.total_amount,
        b.status AS booking_status,
        u.name AS customer_name,
        v.model AS vehicle_model,
        v.reg_no,
        COALESCE(p.status, 'Pending') AS payment_status
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      LEFT JOIN payments p ON b.booking_id = p.booking_id
      ORDER BY b.booking_id DESC
      LIMIT 5
    `);

    const categoryBreakdownRes = await db.query(`
      SELECT c.category_name, COUNT(v.vehicle_id)::int AS count
      FROM vehicle_categories c
      LEFT JOIN vehicles v ON c.category_id = v.category_id
      GROUP BY c.category_id, c.category_name
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        recentBookings: recentBookingsRes.rows,
        categoryBreakdown: categoryBreakdownRes.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving recent activity' });
  }
});

module.exports = router;

