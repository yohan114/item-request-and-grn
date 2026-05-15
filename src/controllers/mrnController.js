const { body } = require('express-validator');
const { Op } = require('sequelize');
const { MRN, User, Attachment } = require('../models');
const { calculateTotalAmount, createMRNWithRetry } = require('../services/mrnService');
const { createAuditLog } = require('../utils/auditLogger');

const createValidation = [
  body('supplier_name').trim().notEmpty().withMessage('Supplier name is required'),
  body('purchase_category').trim().notEmpty().withMessage('Purchase category is required'),
  body('item_name').trim().notEmpty().withMessage('Item name is required'),
  body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be a positive number'),
  body('unit_price').isFloat({ gt: 0 }).withMessage('Unit price must be a positive number'),
  body('remarks').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Remarks must not exceed 1000 characters'),
  body('purchase_reason').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Purchase reason must not exceed 1000 characters')
];

const updateValidation = [
  body('supplier_name').optional().trim().notEmpty().withMessage('Supplier name cannot be empty'),
  body('purchase_category').optional().trim().notEmpty().withMessage('Purchase category cannot be empty'),
  body('item_name').optional().trim().notEmpty().withMessage('Item name cannot be empty'),
  body('quantity').optional().isFloat({ gt: 0 }).withMessage('Quantity must be a positive number'),
  body('unit_price').optional().isFloat({ gt: 0 }).withMessage('Unit price must be a positive number'),
  body('remarks').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Remarks must not exceed 1000 characters'),
  body('purchase_reason').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Purchase reason must not exceed 1000 characters')
];

const create = async (req, res, next) => {
  try {
    const {
      supplier_name,
      purchase_category,
      item_name,
      item_description,
      quantity,
      unit_price,
      purchase_reason,
      remarks,
      manual_mrn_reference,
      received_date
    } = req.body;

    const total_amount = calculateTotalAmount(quantity, unit_price);

    const mrn = await createMRNWithRetry({
      supplier_name,
      purchase_category,
      item_name,
      item_description: item_description || null,
      quantity,
      unit_price,
      total_amount,
      purchase_reason: purchase_reason || null,
      remarks: remarks || null,
      manual_mrn_reference: manual_mrn_reference || null,
      received_date: received_date || null,
      created_by: req.user.id
    });

    await createAuditLog({
      user_id: req.user.id,
      action: 'CREATE',
      entity_type: 'MRN',
      entity_id: mrn.id,
      new_values: mrn.toJSON(),
      ip_address: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'MRN record created successfully',
      data: mrn
    });
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      supplier_name,
      mrn_number,
      status,
      purchase_category,
      date_from,
      date_to
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    if (supplier_name) {
      where.supplier_name = { [Op.like]: `%${supplier_name}%` };
    }
    if (mrn_number) {
      where.mrn_number = { [Op.like]: `%${mrn_number}%` };
    }
    if (status) {
      where.status = status;
    }
    if (purchase_category) {
      where.purchase_category = purchase_category;
    }
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) {
        where.created_at[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        where.created_at[Op.lte] = new Date(date_to + 'T23:59:59.999Z');
      }
    }

    const { count, rows } = await MRN.findAndCountAll({
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

    const mrn = await MRN.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: Attachment,
          as: 'attachments'
        }
      ]
    });

    if (!mrn) {
      return res.status(404).json({
        success: false,
        message: 'MRN record not found'
      });
    }

    res.json({
      success: true,
      data: mrn
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    const mrn = await MRN.findByPk(id);

    if (!mrn) {
      return res.status(404).json({
        success: false,
        message: 'MRN record not found'
      });
    }

    // Store Keeper can only edit their own records
    if (req.user.role === 'Store Keeper' && mrn.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own records'
      });
    }

    const oldValues = mrn.toJSON();

    const updateData = {};
    const allowedFields = [
      'supplier_name', 'purchase_category', 'item_name', 'item_description',
      'quantity', 'unit_price', 'purchase_reason', 'remarks',
      'manual_mrn_reference', 'received_date', 'status'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Recalculate total_amount if quantity or unit_price changed
    const newQuantity = updateData.quantity !== undefined ? updateData.quantity : mrn.quantity;
    const newUnitPrice = updateData.unit_price !== undefined ? updateData.unit_price : mrn.unit_price;
    updateData.total_amount = calculateTotalAmount(newQuantity, newUnitPrice);

    await mrn.update(updateData);

    await createAuditLog({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'MRN',
      entity_id: mrn.id,
      old_values: oldValues,
      new_values: mrn.toJSON(),
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'MRN record updated successfully',
      data: mrn
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const mrn = await MRN.findByPk(id);

    if (!mrn) {
      return res.status(404).json({
        success: false,
        message: 'MRN record not found'
      });
    }

    const oldValues = mrn.toJSON();

    await mrn.destroy();

    await createAuditLog({
      user_id: req.user.id,
      action: 'DELETE',
      entity_type: 'MRN',
      entity_id: id,
      old_values: oldValues,
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'MRN record deleted successfully'
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
