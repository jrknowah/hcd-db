const express = require('express');
const sql = require('mssql');
const router = express.Router();

// Database connection
const { getPool } = require('../store/azureSql');

/**
 * GET /api/personal-inventory/item/:inventoryID
 * Get a single inventory item by ID
 * ✅ Must be before /:clientID to avoid route shadowing
 */
router.get('/personal-inventory/item/:inventoryID', async (req, res) => {
  try {
    const { inventoryID } = req.params;

    if (!inventoryID) {
      return res.status(400).json({ message: 'Inventory ID is required' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('inventoryID', sql.Int, inventoryID)
      .query(`
        SELECT 
          inventoryID,
          clientID,
          itemDescription,
          category,
          photoDocs,
          createdAt,
          updatedAt,
          createdBy,
          updatedBy
        FROM PersonalInventory 
        WHERE inventoryID = @inventoryID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      message: 'Error fetching inventory item',
      error: error.message
    });
  }
});

/**
 * GET /api/personal-inventory/:clientID/summary
 * Get summary statistics for client's inventory
 * ✅ Must be before /:clientID to avoid route shadowing
 */
router.get('/personal-inventory/:clientID/summary', async (req, res) => {
  try {
    const { clientID } = req.params;

    const pool = await getPool();
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT 
          COUNT(*) as totalItems,
          COUNT(CASE WHEN category = 'Electronics' THEN 1 END) as electronics,
          COUNT(CASE WHEN category = 'Jewelry' THEN 1 END) as jewelry,
          COUNT(CASE WHEN category = 'Furniture' THEN 1 END) as furniture,
          COUNT(CASE WHEN category = 'Appliances' THEN 1 END) as appliances,
          COUNT(CASE WHEN category = 'Clothing' THEN 1 END) as clothing,
          COUNT(CASE WHEN category = 'Documents' THEN 1 END) as documents,
          COUNT(CASE WHEN category = 'Medical Equipment' THEN 1 END) as medicalEquipment,
          COUNT(CASE WHEN category = 'Personal Items' THEN 1 END) as personalItems,
          COUNT(CASE WHEN category = 'Other' THEN 1 END) as other,
          MAX(createdAt) as lastUpdated
        FROM PersonalInventory 
        WHERE clientID = @clientID
      `);

    res.json(result.recordset[0] || {
      totalItems: 0,
      electronics: 0,
      jewelry: 0,
      furniture: 0,
      appliances: 0,
      clothing: 0,
      documents: 0,
      medicalEquipment: 0,
      personalItems: 0,
      other: 0,
      lastUpdated: null
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({
      message: 'Error fetching inventory summary',
      error: error.message
    });
  }
});

/**
 * GET /api/personal-inventory/:clientID
 * Get all inventory files for a specific client
 * ✅ After specific routes so it doesn't shadow /item/:id or /:clientID/summary
 */
router.get('/personal-inventory/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;

    if (!clientID) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT 
          inventoryID,
          clientID,
          itemDescription,
          category,
          photoDocs,
          createdAt,
          updatedAt,
          createdBy,
          updatedBy
        FROM PersonalInventory 
        WHERE clientID = @clientID
        ORDER BY createdAt DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching personal inventory:', error);
    res.status(500).json({
      message: 'Error fetching personal inventory',
      error: error.message
    });
  }
});

/**
 * POST /api/personal-inventory
 * Create a new inventory item
 */
router.post('/personal-inventory', async (req, res) => {
  try {
    const {
      clientID,
      itemDescription,
      category,
      photoDocs
    } = req.body;

    if (!clientID) {
      return res.status(400).json({ message: 'Client ID is required' });
    }
    if (!itemDescription) {
      return res.status(400).json({ message: 'Item description is required' });
    }
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .input('itemDescription', sql.NVarChar(500), itemDescription)
      .input('category', sql.NVarChar(100), category)
      .input('photoDocs', sql.NVarChar(sql.MAX), photoDocs || null)
      .input('createdBy', sql.NVarChar(100), 'system') // TODO: Replace with actual user
      .query(`
        INSERT INTO PersonalInventory (
          clientID,
          itemDescription,
          category,
          photoDocs,
          createdBy,
          createdAt,
          updatedBy,
          updatedAt
        )
        OUTPUT INSERTED.*
        VALUES (
          @clientID,
          @itemDescription,
          @category,
          @photoDocs,
          @createdBy,
          GETDATE(),
          @createdBy,
          GETDATE()
        )
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({
      message: 'Error creating inventory item',
      error: error.message
    });
  }
});

/**
 * PUT /api/personal-inventory/:inventoryID
 * Update an inventory item
 */
router.put('/personal-inventory/:inventoryID', async (req, res) => {
  try {
    const { inventoryID } = req.params;
    const {
      itemDescription,
      category,
      photoDocs
    } = req.body;

    const pool = await getPool();

    const updates = [];
    const request = pool.request();
    request.input('inventoryID', sql.Int, inventoryID);

    if (itemDescription !== undefined) {
      updates.push('itemDescription = @itemDescription');
      request.input('itemDescription', sql.NVarChar(500), itemDescription);
    }
    if (category !== undefined) {
      updates.push('category = @category');
      request.input('category', sql.NVarChar(100), category);
    }
    if (photoDocs !== undefined) {
      updates.push('photoDocs = @photoDocs');
      request.input('photoDocs', sql.NVarChar(sql.MAX), photoDocs);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push('updatedAt = GETDATE()');
    updates.push('updatedBy = @updatedBy');
    request.input('updatedBy', sql.NVarChar(100), 'system'); // TODO: Replace with actual user

    const result = await request.query(`
      UPDATE PersonalInventory
      SET ${updates.join(', ')}
      OUTPUT INSERTED.*
      WHERE inventoryID = @inventoryID
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({
      message: 'Error updating inventory item',
      error: error.message
    });
  }
});

/**
 * DELETE /api/personal-inventory/:inventoryID
 * Delete an inventory item
 */
router.delete('/personal-inventory/:inventoryID', async (req, res) => {
  try {
    const { inventoryID } = req.params;

    const pool = await getPool();

    const checkResult = await pool.request()
      .input('inventoryID', sql.Int, inventoryID)
      .query(`
        SELECT inventoryID, photoDocs 
        FROM PersonalInventory 
        WHERE inventoryID = @inventoryID
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    await pool.request()
      .input('inventoryID', sql.Int, inventoryID)
      .query(`
        DELETE FROM PersonalInventory 
        WHERE inventoryID = @inventoryID
      `);

    res.json({
      message: 'Inventory item deleted successfully',
      inventoryID: inventoryID
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      message: 'Error deleting inventory item',
      error: error.message
    });
  }
});

module.exports = router;