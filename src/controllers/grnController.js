const { body } = require('express-validator');
const { Op } = require('sequelize');
const { GRN, MRN, User, Attachment } = require('../models');
const { createGRNWithRetry } = require('../services/grnService');
const { createAuditLog } = require('../utils/auditLogger');

const createValidation = [
  body('supplier_name').trim().notEmpty().withMessage('Supplier name is required'),
  body('item_name').trim().notEmpty().withMessage('Item name is required'),
  body('mrn_id').optional({ values: 'falsy' }).isUUID().withMessage('mrn_id must be a valid UUID'),
  body('received_quantity').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Received quantity must be non-negative'),
  body('checked_quantity').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Checked quantity must be non-negative'),
  body('accepted_quantity').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Accepted quantity must be non-negative'),
  body('rejected_quantity').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Rejected quantity must be non-negative'),
  body('remarks').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Remarks must not exceed 1000 characters')
];

const updateValidation = [
  body('supplier_name').optional().trim().notEmpty().withMessage('Supplier name cannot be empty'),
  body('item_name').optional().trim().notEmpty().withMessage('Item name cannot be empty'),
  body('mrn_id').optional({ values: 'falsy' }).isUUID().withMessage('mrn_id must be a valid UUID'),
  body('received_quantity').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Received quantity must be non-negative'),
  body('checked_quantity').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Checked quantity must be non-negative'),
  body('accepted_quantity').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Accepted quantity must be non-negative'),
  body('rejected_quantity').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Rejected quantity must be non-negative'),
  body('remarks').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Remarks must not exceed 1000 characters')
];

const create = async (req, res, next) => {
  try {
    const {
      supplier_name,
      item_name,
      item_description,
      mrn_id,
      received_quantity,
      checked_quantity,
      accepted_quantity,
      rejected_quantity,
      store_confirmation,
      received_date,
      remarks,
      invoice_number,
      invoice_date,
      invoice_attached
    } = req.body;

    let finalSupplierName = supplier_name;
    let finalItemName = item_name;
    let finalItemDescription = item_description || null;

    // If mrn_id provided, validate and auto-fill from MRN
    if (mrn_id) {
      const mrn = await MRN.findByPk(mrn_id);
      if (!mrn) {
        return res.status(400).json({
          success: false,
          message: 'Referenced MRN not found'
        });
      }
      // Auto-fill from MRN if not explicitly provided
      if (!supplier_name) finalSupplierName = mrn.supplier_name;
      if (!item_name) finalItemName = mrn.item_name;
      if (!item_description) finalItemDescription = mrn.item_description;
    }

    const grn = await createGRNWithRetry({
      supplier_name: finalSupplierName,
      item_name: finalItemName,
      item_description: finalItemDescription,
      mrn_id: mrn_id || null,
      received_quantity: received_quantity || null,
      checked_quantity: checked_quantity || null,
      accepted_quantity: accepted_quantity || null,
      rejected_quantity: rejected_quantity || null,
      store_confirmation: store_confirmation || false,
      received_date: received_date || null,
      remarks: remarks || null,
      invoice_number: invoice_number || null,
      invoice_date: invoice_date || null,
      invoice_attached: invoice_attached || false,
      created_by: req.user.id
    });

    await createAuditLog({
      user_id: req.user.id,
      action: 'CREATE',
      entity_type: 'GRN',
      entity_id: grn.id,
      new_values: grn.toJSON(),
      ip_address: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'GRN record created successfully',
      data: grn
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
      grn_number,
      supplier_name,
      status,
      mrn_id
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    if (grn_number) {
      where.grn_number = { [Op.like]: `%${grn_number}%` };
    }
    if (supplier_name) {
      where.supplier_name = { [Op.like]: `%${supplier_name}%` };
    }
    if (status) {
      where.status = status;
    }
    if (mrn_id) {
      where.mrn_id = mrn_id;
    }

    const { count, rows } = await GRN.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'grnCreator',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: MRN,
          as: 'mrn',
          attributes: ['id', 'mrn_number', 'request_for']
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

    const grn = await GRN.findByPk(id, {
      include: [
        {
          model: User,
          as: 'grnCreator',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: MRN,
          as: 'mrn'
        },
        {
          model: Attachment,
          as: 'attachments'
        }
      ]
    });

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN record not found'
      });
    }

    res.json({
      success: true,
      data: grn
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    const grn = await GRN.findByPk(id);

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN record not found'
      });
    }

    // Store Keeper can only edit their own records
    if (req.user.role === 'Store Keeper' && grn.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own records'
      });
    }

    const oldValues = grn.toJSON();

    const updateData = {};
    const allowedFields = [
      'supplier_name', 'item_name', 'item_description',
      'received_quantity', 'checked_quantity', 'accepted_quantity',
      'rejected_quantity', 'store_confirmation', 'received_date',
      'remarks', 'status', 'invoice_number', 'invoice_date', 'invoice_attached'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Quantity integrity validation
    const receivedQty = updateData.received_quantity !== undefined
      ? parseFloat(updateData.received_quantity)
      : (grn.received_quantity !== null ? parseFloat(grn.received_quantity) : null);
    const acceptedQty = updateData.accepted_quantity !== undefined
      ? parseFloat(updateData.accepted_quantity)
      : (grn.accepted_quantity !== null ? parseFloat(grn.accepted_quantity) : null);
    const rejectedQty = updateData.rejected_quantity !== undefined
      ? parseFloat(updateData.rejected_quantity)
      : (grn.rejected_quantity !== null ? parseFloat(grn.rejected_quantity) : null);

    // Validate non-negative quantities
    if (receivedQty !== null && receivedQty < 0) {
      return res.status(400).json({ success: false, message: 'received_quantity must be >= 0' });
    }
    if (acceptedQty !== null && acceptedQty < 0) {
      return res.status(400).json({ success: false, message: 'accepted_quantity must be >= 0' });
    }
    if (rejectedQty !== null && rejectedQty < 0) {
      return res.status(400).json({ success: false, message: 'rejected_quantity must be >= 0' });
    }

    // Validate quantity relationships
    if (receivedQty !== null && acceptedQty !== null && rejectedQty !== null) {
      if ((acceptedQty + rejectedQty) > receivedQty) {
        return res.status(400).json({
          success: false,
          message: 'accepted_quantity + rejected_quantity cannot exceed received_quantity'
        });
      }
    }

    await grn.update(updateData);

    await createAuditLog({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'GRN',
      entity_id: grn.id,
      old_values: oldValues,
      new_values: grn.toJSON(),
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'GRN record updated successfully',
      data: grn
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const grn = await GRN.findByPk(id);

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN record not found'
      });
    }

    const oldValues = grn.toJSON();

    await grn.destroy();

    await createAuditLog({
      user_id: req.user.id,
      action: 'DELETE',
      entity_type: 'GRN',
      entity_id: id,
      old_values: oldValues,
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'GRN record deleted successfully'
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
