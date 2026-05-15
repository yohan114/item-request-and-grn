const { body } = require('express-validator');
const { Op } = require('sequelize');
const { MRN, User, Attachment, ReceivedItem } = require('../models');
const { createMRNWithRetry } = require('../services/mrnService');
const { createAuditLog } = require('../utils/auditLogger');
const { computePendingItems, parseItems } = require('../utils/pendingItemsHelper');

const createValidation = [
  body('request_for').trim().notEmpty().withMessage('Request For is required'),
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items').custom((items) => {
    if (!Array.isArray(items)) return true;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemName = item.item_name || item.item_no;
      if (!itemName || (typeof itemName === 'string' && !itemName.trim())) {
        throw new Error(`Item ${i + 1} must have an item name or item number`);
      }
      if (!item.description || (typeof item.description === 'string' && !item.description.trim())) {
        throw new Error(`Item ${i + 1} must have a description`);
      }
      const qty = item.quantity !== undefined ? item.quantity : item.qty;
      if (qty === undefined || qty === null || isNaN(qty) || parseFloat(qty) <= 0) {
        throw new Error(`Item ${i + 1} must have a quantity greater than 0`);
      }
    }
    return true;
  }),
  body('supplier_name').optional({ values: 'falsy' }).trim(),
  body('project_name').optional({ values: 'falsy' }).trim(),
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
      const itemName = item.item_name || item.item_no;
      if (!itemName || (typeof itemName === 'string' && !itemName.trim())) {
        throw new Error(`Item ${i + 1} must have an item name or item number`);
      }
      if (!item.description || (typeof item.description === 'string' && !item.description.trim())) {
        throw new Error(`Item ${i + 1} must have a description`);
      }
      const qty = item.quantity !== undefined ? item.quantity : item.qty;
      if (qty === undefined || qty === null || isNaN(qty) || parseFloat(qty) <= 0) {
        throw new Error(`Item ${i + 1} must have a quantity greater than 0`);
      }
    }
    return true;
  }),
  body('supplier_name').optional({ values: 'falsy' }).trim(),
  body('project_name').optional({ values: 'falsy' }).trim(),
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
      supplier_name,
      project_name,
      request_person_name,
      request_person_designation,
      approval_person_name,
      approval_person_designation
    } = req.body;

    // Normalize items to include item_status
    const normalizedItems = (Array.isArray(items) ? items : []).map(item => ({
      item_name: item.item_name || item.item_no,
      item_no: item.item_no || item.item_name,
      description: item.description,
      quantity: item.quantity !== undefined ? parseFloat(item.quantity) : parseFloat(item.qty),
      qty: item.qty !== undefined ? parseFloat(item.qty) : parseFloat(item.quantity),
      unit: item.unit || null,
      remarks: item.remarks || null,
      item_status: 'Pending Approval'
    }));

    const mrn = await createMRNWithRetry({
      request_for,
      items: normalizedItems,
      supplier_name: supplier_name || null,
      project_name: project_name || null,
      request_person_name: request_person_name || null,
      request_person_designation: request_person_designation || null,
      approval_person_name: approval_person_name || null,
      approval_person_designation: approval_person_designation || null,
      status: 'Draft',
      approval_status: 'Pending',
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
      approval_status,
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
    if (approval_status) {
      where.approval_status = approval_status;
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

    // Calculate pending_items_count for each MRN
    const mrnIds = rows.map(r => r.id);
    const allReceivedItems = mrnIds.length > 0
      ? await ReceivedItem.findAll({ where: { mrn_id: { [Op.in]: mrnIds } } })
      : [];

    const dataWithPending = rows.map(row => {
      const mrnJson = row.toJSON();
      const mrnReceivedItems = allReceivedItems.filter(ri => ri.mrn_id === row.id);
      const pendingItems = computePendingItems(mrnJson.items, mrnReceivedItems);
      mrnJson.pending_items_count = pendingItems.length;
      return mrnJson;
    });

    res.json({
      success: true,
      data: dataWithPending,
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
          model: User,
          as: 'approver',
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

    // Cannot edit an approved MRN
    if (mrn.approval_status === 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit an approved MRN'
      });
    }

    // Can only edit when status is Draft
    if (mrn.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only edit MRN when status is Draft'
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
      'request_for', 'items', 'supplier_name', 'project_name',
      'request_person_name', 'request_person_designation',
      'approval_person_name', 'approval_person_designation'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Normalize items if provided
    if (updateData.items && Array.isArray(updateData.items)) {
      updateData.items = updateData.items.map(item => ({
        item_name: item.item_name || item.item_no,
        item_no: item.item_no || item.item_name,
        description: item.description,
        quantity: item.quantity !== undefined ? parseFloat(item.quantity) : parseFloat(item.qty),
        qty: item.qty !== undefined ? parseFloat(item.qty) : parseFloat(item.quantity),
        unit: item.unit || null,
        remarks: item.remarks || null,
        item_status: item.item_status || 'Pending Approval'
      }));
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

const submit = async (req, res, next) => {
  try {
    const { id } = req.params;

    const mrn = await MRN.findByPk(id);

    if (!mrn) {
      return res.status(404).json({
        success: false,
        message: 'MRN record not found'
      });
    }

    // Only owner or Admin/Manager can submit
    if (req.user.role === 'Store Keeper' && mrn.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only submit your own records'
      });
    }

    // Can only submit from Draft status
    if (mrn.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only submit MRN when status is Draft'
      });
    }

    // Can only submit when approval_status is Pending or Rejected
    if (mrn.approval_status !== 'Pending' && mrn.approval_status !== 'Rejected') {
      return res.status(400).json({
        success: false,
        message: 'Can only submit MRN when approval status is Pending or Rejected'
      });
    }

    const oldValues = mrn.toJSON();

    await mrn.update({
      status: 'Submitted',
      approval_status: 'Pending'
    });

    await createAuditLog({
      user_id: req.user.id,
      action: 'SUBMIT',
      entity_type: 'MRN',
      entity_id: mrn.id,
      old_values: oldValues,
      new_values: mrn.toJSON(),
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'MRN submitted successfully',
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

const approveMRN = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approval_remarks } = req.body;

    const mrn = await MRN.findByPk(id);

    if (!mrn) {
      return res.status(404).json({
        success: false,
        message: 'MRN record not found'
      });
    }

    if (mrn.created_by === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot approve/reject your own record'
      });
    }

    if (mrn.approval_status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `MRN is already ${mrn.approval_status.toLowerCase()}`
      });
    }

    const oldValues = mrn.toJSON();

    // Update items to set item_status to 'Approved'
    const items = parseItems(mrn.items);
    const updatedItems = items.map(item => ({
      ...item,
      item_status: 'Approved'
    }));

    // Build approval history entry
    const approvalHistoryEntry = {
      action: 'Approved',
      user_id: req.user.id,
      user_name: req.user.full_name || req.user.username,
      date: new Date().toISOString(),
      remarks: approval_remarks || null
    };

    const currentHistory = mrn.approval_history || [];

    await mrn.update({
      approval_status: 'Approved',
      status: 'Approved',
      approved_by: req.user.id,
      approval_remarks: approval_remarks || null,
      items: updatedItems,
      approval_history: [...currentHistory, approvalHistoryEntry]
    });

    await createAuditLog({
      user_id: req.user.id,
      action: 'APPROVE',
      entity_type: 'MRN',
      entity_id: mrn.id,
      old_values: oldValues,
      new_values: mrn.toJSON(),
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'MRN approved successfully',
      data: mrn
    });
  } catch (error) {
    next(error);
  }
};

const rejectMRN = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approval_remarks } = req.body;

    if (!approval_remarks || !approval_remarks.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Remarks are required for rejection'
      });
    }

    const mrn = await MRN.findByPk(id);

    if (!mrn) {
      return res.status(404).json({
        success: false,
        message: 'MRN record not found'
      });
    }

    if (mrn.created_by === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot approve/reject your own record'
      });
    }

    if (mrn.approval_status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `MRN is already ${mrn.approval_status.toLowerCase()}`
      });
    }

    const oldValues = mrn.toJSON();

    // Build approval history entry
    const approvalHistoryEntry = {
      action: 'Rejected',
      user_id: req.user.id,
      user_name: req.user.full_name || req.user.username,
      date: new Date().toISOString(),
      remarks: approval_remarks.trim()
    };

    const currentHistory = mrn.approval_history || [];

    await mrn.update({
      approval_status: 'Rejected',
      status: 'Draft',
      approved_by: req.user.id,
      approval_remarks: approval_remarks.trim(),
      approval_history: [...currentHistory, approvalHistoryEntry]
    });

    await createAuditLog({
      user_id: req.user.id,
      action: 'REJECT',
      entity_type: 'MRN',
      entity_id: mrn.id,
      old_values: oldValues,
      new_values: mrn.toJSON(),
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'MRN rejected successfully',
      data: mrn
    });
  } catch (error) {
    next(error);
  }
};

const getPendingItems = async (req, res, next) => {
  try {
    const { id } = req.params;

    const mrn = await MRN.findByPk(id);

    if (!mrn) {
      return res.status(404).json({
        success: false,
        message: 'MRN record not found'
      });
    }

    const receivedItems = await ReceivedItem.findAll({ where: { mrn_id: id } });
    const pendingItems = computePendingItems(mrn.items, receivedItems);

    res.json({
      success: true,
      data: pendingItems
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
  submit,
  remove,
  approveMRN,
  rejectMRN,
  getPendingItems,
  createValidation,
  updateValidation
};
