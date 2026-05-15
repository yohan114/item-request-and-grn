const { body } = require('express-validator');
const { Op } = require('sequelize');
const { MRN, User, Attachment } = require('../models');
const { createMRNWithRetry } = require('../services/mrnService');
const { createAuditLog } = require('../utils/auditLogger');

const createValidation = [
  body('request_for').trim().notEmpty().withMessage('Request For is required'),
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.item_no').trim().notEmpty().withMessage('Each item must have an item number'),
  body('items.*.description').trim().notEmpty().withMessage('Each item must have a description'),
  body('items.*.qty').isFloat({ gt: 0 }).withMessage('Each item must have a quantity greater than 0'),
  body('request_person_name').optional({ values: 'falsy' }).trim(),
  body('request_person_designation').optional({ values: 'falsy' }).trim(),
  body('approval_person_name').optional({ values: 'falsy' }).trim(),
  body('approval_person_designation').optional({ values: 'falsy' }).trim()
];

const updateValidation = [
  body('request_for').optional().trim().notEmpty().withMessage('Request For cannot be empty'),
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
    }
    return true;
  }),
  body('items.*.item_no').trim().notEmpty().withMessage('Each item must have an item number'),
  body('items.*.description').trim().notEmpty().withMessage('Each item must have a description'),
  body('items.*.qty').isFloat({ gt: 0 }).withMessage('Each item must have a quantity greater than 0'),
  body('request_person_name').optional({ values: 'falsy' }).trim(),
  body('request_person_designation').optional({ values: 'falsy' }).trim(),
  body('approval_person_name').optional({ values: 'falsy' }).trim(),
  body('approval_person_designation').optional({ values: 'falsy' }).trim()
];

const create = async (req, res, next) => {
  try {
    const {
      request_for,
      items,
      request_person_name,
      request_person_designation,
      approval_person_name,
      approval_person_designation
    } = req.body;

    const mrn = await createMRNWithRetry({
      request_for,
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
      mrn_number,
      status,
      request_for,
      date_from,
      date_to
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
    if (request_for) {
      where.request_for = { [Op.like]: `%${request_for}%` };
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
      'request_for', 'items', 'request_person_name', 'request_person_designation',
      'approval_person_name', 'approval_person_designation', 'status'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

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
