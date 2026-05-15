const { body } = require('express-validator');
const { Op } = require('sequelize');
const { GRN, User, Attachment, ReceivedItem } = require('../models');
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
      approval_person_designation,
      received_item_ids,
      mrn_id
    } = req.body;

    const grnData = {
      supplier_name,
      project_name: project_name || null,
      items,
      request_person_name: request_person_name || null,
      request_person_designation: request_person_designation || null,
      approval_person_name: approval_person_name || null,
      approval_person_designation: approval_person_designation || null,
      created_by: req.user.id
    };

    if (mrn_id) {
      grnData.mrn_id = mrn_id;
    }

    // Parse received_item_ids if provided as JSON string
    let parsedReceivedItemIds = [];
    if (received_item_ids) {
      if (typeof received_item_ids === 'string') {
        try {
          parsedReceivedItemIds = JSON.parse(received_item_ids);
        } catch (e) {
          parsedReceivedItemIds = [];
        }
      } else if (Array.isArray(received_item_ids)) {
        parsedReceivedItemIds = received_item_ids;
      }
      if (parsedReceivedItemIds.length > 0) {
        grnData.received_item_ids = parsedReceivedItemIds;
      }
    }

    // Handle invoice attachment file
    if (req.file) {
      grnData.invoice_attachment = req.file.filename;
    }

    const grn = await createGRNWithRetry(grnData);

    // If received_item_ids provided, update those ReceivedItem records
    if (parsedReceivedItemIds.length > 0) {
      await ReceivedItem.update(
        { grn_id: grn.id, grn_status: 'GRN Created' },
        { where: { id: { [Op.in]: parsedReceivedItemIds } } }
      );
    }

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
      approval_status
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
    if (approval_status) {
      where.approval_status = approval_status;
    }

    const { count, rows } = await GRN.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'grnCreator',
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

    const grn = await GRN.findByPk(id, {
      include: [
        {
          model: User,
          as: 'grnCreator',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: Attachment,
          as: 'attachments'
        },
        {
          model: ReceivedItem,
          as: 'receivedItems'
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

    // Handle invoice attachment file
    if (req.file) {
      updateData.invoice_attachment = req.file.filename;
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

const approveGRN = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approval_remarks } = req.body;

    const grn = await GRN.findByPk(id);

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN record not found'
      });
    }

    if (grn.approval_status === 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'GRN is already approved'
      });
    }

    const oldValues = grn.toJSON();

    await grn.update({
      approval_status: 'Approved',
      approved_by: req.user.id,
      approval_remarks: approval_remarks || null
    });

    // Update all linked received items to 'GRN Approved'
    await ReceivedItem.update(
      { grn_status: 'GRN Approved' },
      { where: { grn_id: grn.id } }
    );

    await createAuditLog({
      user_id: req.user.id,
      action: 'APPROVE',
      entity_type: 'GRN',
      entity_id: grn.id,
      old_values: oldValues,
      new_values: grn.toJSON(),
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'GRN approved successfully',
      data: grn
    });
  } catch (error) {
    next(error);
  }
};

const rejectGRN = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approval_remarks } = req.body;

    const grn = await GRN.findByPk(id);

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN record not found'
      });
    }

    if (grn.approval_status === 'Rejected') {
      return res.status(400).json({
        success: false,
        message: 'GRN is already rejected'
      });
    }

    const oldValues = grn.toJSON();

    await grn.update({
      approval_status: 'Rejected',
      approved_by: req.user.id,
      approval_remarks: approval_remarks || null
    });

    await createAuditLog({
      user_id: req.user.id,
      action: 'REJECT',
      entity_type: 'GRN',
      entity_id: grn.id,
      old_values: oldValues,
      new_values: grn.toJSON(),
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'GRN rejected successfully',
      data: grn
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
  approveGRN,
  rejectGRN,
  createValidation,
  updateValidation
};
