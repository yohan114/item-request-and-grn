const { body } = require('express-validator');
const { Op } = require('sequelize');
const { LocalPurchase, User, Attachment, ApprovalHistory } = require('../models');
const { generateMRN, generateGRN, calculateTotalAmount } = require('../services/localPurchaseService');
const { createAuditLog } = require('../utils/auditLogger');

const createValidation = [
  body('supplier_name').trim().notEmpty().withMessage('Supplier name is required'),
  body('purchase_category').trim().notEmpty().withMessage('Purchase category is required'),
  body('item_name').trim().notEmpty().withMessage('Item name is required'),
  body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be a positive number'),
  body('unit_price').isFloat({ gt: 0 }).withMessage('Unit price must be a positive number'),
  body('invoice_number').optional({ values: 'falsy' }).trim().isString(),
  body('invoice_date').optional({ values: 'falsy' }).isISO8601().withMessage('Invoice date must be a valid date'),
  body('received_date').optional({ values: 'falsy' }).isISO8601().withMessage('Received date must be a valid date'),
  body('remarks').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Remarks must not exceed 1000 characters')
];

const updateValidation = [
  body('supplier_name').optional().trim().notEmpty().withMessage('Supplier name cannot be empty'),
  body('purchase_category').optional().trim().notEmpty().withMessage('Purchase category cannot be empty'),
  body('item_name').optional().trim().notEmpty().withMessage('Item name cannot be empty'),
  body('quantity').optional().isFloat({ gt: 0 }).withMessage('Quantity must be a positive number'),
  body('unit_price').optional().isFloat({ gt: 0 }).withMessage('Unit price must be a positive number'),
  body('invoice_number').optional({ values: 'falsy' }).trim().isString(),
  body('invoice_date').optional({ values: 'falsy' }).isISO8601().withMessage('Invoice date must be a valid date'),
  body('received_date').optional({ values: 'falsy' }).isISO8601().withMessage('Received date must be a valid date'),
  body('remarks').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Remarks must not exceed 1000 characters'),
  body('status').optional().isIn(['Pending', 'Approved', 'Rejected', 'Completed']).withMessage('Invalid status')
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
      invoice_number,
      invoice_date,
      received_date,
      remarks
    } = req.body;

    const mrn_number = await generateMRN();
    const grn_number = await generateGRN();
    const total_amount = calculateTotalAmount(quantity, unit_price);

    const purchase = await LocalPurchase.create({
      supplier_name,
      purchase_category,
      item_name,
      item_description: item_description || null,
      quantity,
      unit_price,
      total_amount,
      mrn_number,
      grn_number,
      invoice_number: invoice_number || null,
      invoice_date: invoice_date || null,
      received_date: received_date || null,
      remarks: remarks || null,
      created_by: req.user.id
    });

    await createAuditLog({
      user_id: req.user.id,
      action: 'CREATE',
      entity_type: 'LocalPurchase',
      entity_id: purchase.id,
      new_values: purchase.toJSON(),
      ip_address: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Local purchase record created successfully',
      data: purchase
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
      grn_number,
      invoice_number,
      status,
      purchase_category,
      created_by,
      date_from,
      date_to
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    // Search filters
    if (supplier_name) {
      where.supplier_name = { [Op.like]: `%${supplier_name}%` };
    }
    if (mrn_number) {
      where.mrn_number = { [Op.like]: `%${mrn_number}%` };
    }
    if (grn_number) {
      where.grn_number = { [Op.like]: `%${grn_number}%` };
    }
    if (invoice_number) {
      where.invoice_number = { [Op.like]: `%${invoice_number}%` };
    }

    // Filter by exact match
    if (status) {
      where.status = status;
    }
    if (purchase_category) {
      where.purchase_category = purchase_category;
    }
    if (created_by) {
      where.created_by = created_by;
    }

    // Date range filter
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) {
        where.created_at[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        where.created_at[Op.lte] = new Date(date_to + 'T23:59:59.999Z');
      }
    }

    const { count, rows } = await LocalPurchase.findAndCountAll({
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

    const purchase = await LocalPurchase.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: Attachment,
          as: 'attachments'
        },
        {
          model: ApprovalHistory,
          as: 'approvalHistory',
          include: [
            {
              model: User,
              as: 'actor',
              attributes: ['id', 'username', 'full_name']
            }
          ]
        }
      ]
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Local purchase record not found'
      });
    }

    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchase = await LocalPurchase.findByPk(id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Local purchase record not found'
      });
    }

    // Store Keeper can only edit their own records
    if (req.user.role === 'Store Keeper' && purchase.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own records'
      });
    }

    const oldValues = purchase.toJSON();

    const updateData = {};
    const allowedFields = [
      'supplier_name', 'purchase_category', 'item_name', 'item_description',
      'quantity', 'unit_price', 'invoice_number', 'invoice_date',
      'received_date', 'remarks', 'status'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Recalculate total_amount if quantity or unit_price changed
    const newQuantity = updateData.quantity || purchase.quantity;
    const newUnitPrice = updateData.unit_price || purchase.unit_price;
    updateData.total_amount = calculateTotalAmount(newQuantity, newUnitPrice);

    await purchase.update(updateData);

    await createAuditLog({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'LocalPurchase',
      entity_id: purchase.id,
      old_values: oldValues,
      new_values: purchase.toJSON(),
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'Local purchase record updated successfully',
      data: purchase
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchase = await LocalPurchase.findByPk(id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Local purchase record not found'
      });
    }

    const oldValues = purchase.toJSON();

    await purchase.destroy();

    await createAuditLog({
      user_id: req.user.id,
      action: 'DELETE',
      entity_type: 'LocalPurchase',
      entity_id: id,
      old_values: oldValues,
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'Local purchase record deleted successfully'
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
