const fs = require('fs');
const path = require('path');
const { body } = require('express-validator');
const { Op } = require('sequelize');
const { ReceivedItem, User, MRN } = require('../models');
const { createReceivedItemWithRetry } = require('../services/receivedItemService');
const { createAuditLog } = require('../utils/auditLogger');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

const createValidation = [
  body('mrn_id').trim().notEmpty().withMessage('MRN is required'),
  body('item_details').notEmpty().withMessage('Item details are required'),
  body('received_qty').isFloat({ gt: 0 }).withMessage('Received quantity must be greater than 0')
];

const updateValidation = [
  body('item_details').optional().notEmpty().withMessage('Item details cannot be empty'),
  body('received_qty').optional().isFloat({ gt: 0 }).withMessage('Received quantity must be greater than 0'),
  body('status').optional().isIn(['Pending', 'Verified', 'Rejected']).withMessage('Invalid status')
];

const create = async (req, res, next) => {
  try {
    const {
      mrn_id,
      mrn_number,
      item_details,
      received_qty,
      notes
    } = req.body;

    // Validate that the referenced MRN exists
    const mrn = await MRN.findByPk(mrn_id);
    if (!mrn) {
      // Remove uploaded file if MRN not found
      if (req.file) {
        const filePath = path.join(uploadsDir, req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      return res.status(404).json({ success: false, message: 'Referenced MRN not found' });
    }

    const receivedItemData = {
      mrn_id,
      mrn_number: mrn_number || null,
      item_details,
      received_qty: parseFloat(received_qty),
      notes: notes || null,
      created_by: req.user.id
    };

    // Handle image file upload
    if (req.file) {
      receivedItemData.image = req.file.filename;
    }

    const receivedItem = await createReceivedItemWithRetry(receivedItemData);

    await createAuditLog({
      user_id: req.user.id,
      action: 'CREATE',
      entity_type: 'ReceivedItem',
      entity_id: receivedItem.id,
      new_values: receivedItem.toJSON(),
      ip_address: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Received item record created successfully',
      data: receivedItem
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      mrn_number,
      status
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    if (mrn_number) {
      where.mrn_number = { [Op.like]: `%${mrn_number}%` };
    }
    if (status) {
      where.status = status;
    }

    const { count, rows } = await ReceivedItem.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'full_name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const receivedItem = await ReceivedItem.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    if (!receivedItem) {
      return res.status(404).json({
        success: false,
        message: 'Received item record not found'
      });
    }

    res.json({
      success: true,
      data: receivedItem
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    const receivedItem = await ReceivedItem.findByPk(id);

    if (!receivedItem) {
      return res.status(404).json({
        success: false,
        message: 'Received item record not found'
      });
    }

    // Store Keeper can only edit their own records
    if (req.user.role === 'Store Keeper' && receivedItem.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own records'
      });
    }

    // Only pending records can be edited
    if (receivedItem.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending records can be edited'
      });
    }

    const oldValues = receivedItem.toJSON();

    const updateData = {};
    const allowedFields = [
      'item_details', 'received_qty', 'notes', 'status'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.received_qty !== undefined) {
      updateData.received_qty = parseFloat(updateData.received_qty);
    }

    // Handle image file upload
    if (req.file) {
      // Remove old image file if it exists
      if (receivedItem.image) {
        const oldImagePath = path.join(uploadsDir, receivedItem.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.image = req.file.filename;
    }

    await receivedItem.update(updateData);

    await createAuditLog({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'ReceivedItem',
      entity_id: receivedItem.id,
      old_values: oldValues,
      new_values: receivedItem.toJSON(),
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'Received item record updated successfully',
      data: receivedItem
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const receivedItem = await ReceivedItem.findByPk(id);

    if (!receivedItem) {
      return res.status(404).json({
        success: false,
        message: 'Received item record not found'
      });
    }

    const oldValues = receivedItem.toJSON();

    // Remove image file from disk if it exists
    if (receivedItem.image) {
      const imagePath = path.join(uploadsDir, receivedItem.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await receivedItem.destroy();

    await createAuditLog({
      user_id: req.user.id,
      action: 'DELETE',
      entity_type: 'ReceivedItem',
      entity_id: id,
      old_values: oldValues,
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'Received item record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  createValidation,
  updateValidation
};
