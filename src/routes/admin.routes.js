const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authenticateAdmin = require('../middlewares/admin.middleware');

// ─── Public ─────────────────────────────────────────────────────────
router.post('/login', adminController.adminLogin);

// ─── Protected (Admin JWT required) ─────────────────────────────────
router.get('/dashboard', authenticateAdmin, adminController.getDashboardStats);
router.get('/users', authenticateAdmin, adminController.getAllUsers);
router.delete('/users/:id', authenticateAdmin, adminController.deleteUser);
router.get('/resources', authenticateAdmin, adminController.getAllResources);
router.delete('/resources/:id', authenticateAdmin, adminController.deleteResource);
router.get('/deals', authenticateAdmin, adminController.getAllDeals);

module.exports = router;
