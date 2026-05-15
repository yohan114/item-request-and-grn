const { body } = require('express-validator');
const { Op } = require('sequelize');
const { GRN, MRN, User, Attachment } = require('../models');
const { createGRNWithRetry } = require('../services/grnService');
const { createAuditLog } = require('../utils/auditLogger');

const createValidation = [
  body('supplier_name').trim().notEmpty().withMessage('Supplier name is required'),
  body('project_name').optional({ values: 'falsy' }).trim(),
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.item_no').trim().notEmpty().withMessage('Each item must have an item number'),
  body('items.*.description').trim().notEmpty().withMessage('Each item must have a description'),
  body('items.*.qty').isFloat({ gt: 0 }).withMessage('Each item must have a quantity greater than 0'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Each item must have a price of 0 or more'),
  body('request_person_name').optional({ values: 'falsy' }).trim(),
  body('request_person_designation').optional({ values: 'falsy' }).trim(),
  body('approval_person_name').optional({ values: 'falsy' }).trim(),
  body('approval_person_designation').optional({ values: 'falsy' }).trim()
];

const updateValidation = [
  body('supplier_name').optional().trim().notEmpty().withMessage('Supplier name cannot be empty'),
  body('project_name').optional({ values: 'falsy' }).trim(),
  body('items').optional().isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items').optional().custom((items) => {
    if (!Array.isArray(items)) return true;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.item_no || (typeof item.item_no === 'string' && !item.item_no.trim())) {
        throw new Error(`Item ${i + 1} must have an item number`);
      }
      if (!item.description || (typeof item.description === 'string' && !item.description.trim())) {
        throw new Error(`Item ${i + 1} must have a description`);
      }
      if (item.qty === undefined || item.qty === null || isNaN(item.qty) || parseFloat(item.qty) <= 0) {
        throw new Error(`Item ${i + 1} must have a quantity greater than 0`);
      }
      if (item.price === undefined || item.price === null || isNaN(item.price) || parseFloat(item.price) < 0) {
        throw new Error(`Item ${i + 1} must have a price of 0 or more`);
      }
    }
    return true;
  }),
  body('items.*.item_no').trim().notEmpty().withMessage('Each item must have an item number'),
  body('items.*.description').trim().notEmpty().withMessage('Each item must have a description'),
  body('items.*.qty').isFloat({ gt: 0 }).withMessage('Each item must have a quantity greater than 0'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Each item must have a price of 0 or more'),
  body('request_person_name').optional({ values: 'falsy' }).trim(),
  body('request_person_designation').optional({ values: 'falsy' }).trim(),
  body('approval_person_name').optional({ values: 'falsy' }).trim(),
  body('approval_person_designation').optional({ values: 'falsy' }).trim()
];

const create = async (req, res, next) => {
  try {
    const {
      supplier_name,
      project_name,
      items,
      request_person_name,
      request_person_designation,
      approval_person_name,
      approval_person_designation
    } = req.body;

    const grn = await createGRNWithRetry({
      supplier_name,
      project_name: project_name || null,
      items,
      request_person_name: request_person_name || null,
      request_person_designation: request_person_designation || null,
      approval_person_name: approval_person_name || null,
      approval_person_designation: approval_person_designation || null,
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
      'supplier_name', 'project_name', 'items',
      'request_person_name', 'request_person_designation',
      'approval_person_name', 'approval_person_designation', 'status'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
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
