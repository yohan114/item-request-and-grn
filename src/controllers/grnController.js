const { body } = require('express-validator');
const { Op } = require('sequelize');
const { GRN, User, Attachment, ReceivedItem, MRN, sequelize } = require('../models');
const { createGRNWithRetry } = require('../services/grnService');
const { createAuditLog } = require('../utils/auditLogger');
const { parseItems, getItemIdentifier, parseItemDetails } = require('../utils/pendingItemsHelper');

const createValidation = [
  body('supplier_name').trim().notEmpty().withMessage('Supplier name is required'),
  body('project_name').optional({ values: 'falsy' }).trim(),
  body('invoice_number').optional({ values: 'falsy' }).trim(),
  body('items').optional().isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.item_no').optional().trim(),
  body('items.*.item_name').optional().trim(),
  body('items.*.description').optional().trim().notEmpty().withMessage('Each item must have a description'),
  body('items').custom((items, { req: request }) => {
    // Items validation only required when no received_item_ids (legacy flow)
    const receivedItemIds = request.body.received_item_ids;
    if (receivedItemIds && (Array.isArray(receivedItemIds) ? receivedItemIds.length > 0 : true)) {
      // Items will be derived server-side from received items
      return true;
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Items are required when received_item_ids is not provided');
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemName = item.item_name || item.item_no;
      if (!itemName || (typeof itemName === 'string' && !itemName.trim())) {
        throw new Error(`Item ${i + 1} must have an item name or item number`);
      }
      const qty = item.quantity !== undefined ? item.quantity : item.qty;
      if (qty === undefined || qty === null || isNaN(qty) || parseFloat(qty) <= 0) {
        throw new Error(`Item ${i + 1} must have a quantity greater than 0`);
      }
    }
    return true;
  }),
  body('request_person_name').optional({ values: 'falsy' }).trim(),
  body('request_person_designation').optional({ values: 'falsy' }).trim(),
  body('approval_person_name').optional({ values: 'falsy' }).trim(),
  body('approval_person_designation').optional({ values: 'falsy' }).trim()
];

const updateValidation = [
  body('supplier_name').optional().trim().notEmpty().withMessage('Supplier name cannot be empty'),
  body('project_name').optional({ values: 'falsy' }).trim(),
  body('invoice_number').optional({ values: 'falsy' }).trim(),
  body('items').optional().isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.item_no').optional().trim(),
  body('items.*.item_name').optional().trim(),
  body('items.*.description').optional().trim().notEmpty().withMessage('Each item must have a description'),
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
      invoice_number,
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
      invoice_number: invoice_number || null,
      items: [], // Will be derived from received items if received_item_ids provided
      request_person_name: request_person_name || null,
      request_person_designation: request_person_designation || null,
      approval_person_name: approval_person_name || null,
      approval_person_designation: approval_person_designation || null,
      status: 'Submitted',
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

    // Validate received_item_ids before creating GRN
    if (parsedReceivedItemIds.length > 0) {
      const receivedItems = await ReceivedItem.findAll({
        where: { id: { [Op.in]: parsedReceivedItemIds } }
      });

      // Check all IDs correspond to existing records
      if (receivedItems.length !== parsedReceivedItemIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more received item IDs are invalid'
        });
      }

      // Check all items have grn_status === 'Pending'
      const nonPending = receivedItems.filter(ri => ri.grn_status !== 'Pending');
      if (nonPending.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'One or more received items are already linked to a GRN'
        });
      }

      // If mrn_id is provided, check all items belong to that MRN
      if (mrn_id) {
        const mismatch = receivedItems.filter(ri => ri.mrn_id !== mrn_id);
        if (mismatch.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'One or more received items do not belong to the specified MRN'
          });
        }
      }

      // Derive items array from actual received item records (Fix #5: don't trust client payload)
      grnData.items = receivedItems.map(ri => {
        const details = parseItemDetails(ri.item_details);
        return {
          item_name: getItemIdentifier(details) || 'Unknown Item',
          item_no: getItemIdentifier(details) || 'Unknown Item',
          description: details.description || '',
          quantity: parseFloat(ri.received_qty) || 0,
          qty: parseFloat(ri.received_qty) || 0,
          unit: details.unit || '',
          item_index: ri.item_index !== null && ri.item_index !== undefined ? ri.item_index : undefined
        };
      });
    } else {
      // No received_item_ids: use client-provided items (legacy/fallback)
      grnData.items = items || [];
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
      approval_status,
      mrn_number
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

    // Filter by mrn_number: look up the MRN ID first
    if (mrn_number) {
      const matchingMrns = await MRN.findAll({
        where: { mrn_number: { [Op.like]: `%${mrn_number}%` } },
        attributes: ['id']
      });
      const mrnIds = matchingMrns.map(m => m.id);
      if (mrnIds.length > 0) {
        where.mrn_id = { [Op.in]: mrnIds };
      } else {
        // No matching MRNs, return empty result
        return res.json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: pageNum,
            limit: limitNum,
            total_pages: 0
          }
        });
      }
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

    // Cannot edit an approved GRN
    if (grn.approval_status === 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit an approved GRN'
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
      'supplier_name', 'project_name', 'invoice_number', 'items',
      'request_person_name', 'request_person_designation',
      'approval_person_name', 'approval_person_designation'
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

    // If GRN was rejected, on edit reset to Submitted/Pending for re-approval
    if (grn.approval_status === 'Rejected') {
      updateData.status = 'Submitted';
      updateData.approval_status = 'Pending';
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

    if (grn.created_by === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot approve/reject your own record'
      });
    }

    if (grn.approval_status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `GRN is already ${grn.approval_status.toLowerCase()}`
      });
    }

    const oldValues = grn.toJSON();

    // Build approval history entry
    const approvalHistoryEntry = {
      action: 'Approved',
      user_id: req.user.id,
      user_name: req.user.full_name || req.user.username,
      date: new Date().toISOString(),
      remarks: approval_remarks || null
    };

    const currentHistory = grn.approval_history || [];

    await grn.update({
      approval_status: 'Approved',
      status: 'Approved',
      approved_by: req.user.id,
      approval_remarks: approval_remarks || null,
      approval_history: [...currentHistory, approvalHistoryEntry]
    });

    // Update all linked received items to 'GRN Approved'
    await ReceivedItem.update(
      { grn_status: 'GRN Approved' },
      { where: { grn_id: grn.id } }
    );

    // Update corresponding MRN item_status to 'GRN Completed' for the received items
    if (grn.mrn_id) {
      try {
        const mrnRecord = await MRN.findByPk(grn.mrn_id);
        if (mrnRecord) {
          const linkedReceivedItems = await ReceivedItem.findAll({
            where: { grn_id: grn.id }
          });
          const mrnItems = parseItems(mrnRecord.items);
          const updatedItems = mrnItems.map((item, index) => {
            const itemId = getItemIdentifier(item);
            // Check if any of the linked received items correspond to this MRN item
            const hasLinkedRI = linkedReceivedItems.some(ri => {
              const riDetails = typeof ri.item_details === 'string' ? JSON.parse(ri.item_details) : ri.item_details;
              return getItemIdentifier(riDetails || {}) === itemId || ri.item_index === index;
            });
            if (hasLinkedRI) {
              return { ...item, item_status: 'GRN Completed' };
            }
            return item;
          });
          await mrnRecord.update({ items: updatedItems });
        }
      } catch (mrnUpdateErr) {
        console.error('Failed to update MRN item statuses after GRN approval:', mrnUpdateErr);
      }
    }

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

    if (grn.created_by === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot approve/reject your own record'
      });
    }

    if (grn.approval_status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `GRN is already ${grn.approval_status.toLowerCase()}`
      });
    }

    const oldValues = grn.toJSON();

    // Build approval history entry
    const approvalHistoryEntry = {
      action: 'Rejected',
      user_id: req.user.id,
      user_name: req.user.full_name || req.user.username,
      date: new Date().toISOString(),
      remarks: approval_remarks || null
    };

    const currentHistory = grn.approval_history || [];

    // Wrap GRN rejection and received item unlink in a single transaction (Fix #4)
    await sequelize.transaction(async (t) => {
      await grn.update({
        approval_status: 'Rejected',
        status: 'Rejected',
        approved_by: req.user.id,
        approval_remarks: approval_remarks || null,
        approval_history: [...currentHistory, approvalHistoryEntry]
      }, { transaction: t });

      // Revert linked received items so they can be re-linked to a new GRN
      await ReceivedItem.update(
        { grn_status: 'Pending', grn_id: null },
        { where: { grn_id: grn.id }, transaction: t }
      );
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
