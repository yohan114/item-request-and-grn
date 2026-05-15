const { LocalPurchase, ApprovalHistory, User, Attachment } = require('../models');
const { createAuditLog } = require('../utils/auditLogger');

const VALID_TRANSITIONS = {
  'MRN Created': ['MRN Uploaded'],
  'MRN Uploaded': ['Item Purchased'],
  'Item Purchased': ['Goods Received at Stores'],
  'Goods Received at Stores': ['GRN Pending'],
  'GRN Pending': ['Invoice Attached'],
  'Invoice Attached': ['GRN Completed'],
  'GRN Completed': ['Pending Approval'],
  'Pending Approval': ['Approved', 'Rejected'],
  'Approved': ['Completed'],
  'Rejected': [],
  'Completed': []
};

const validateTransition = (currentStatus, newStatus) => {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    return false;
  }
  return true;
};

const changeStatus = async ({ purchaseId, newStatus, userId, remarks, ipAddress }) => {
  const purchase = await LocalPurchase.findByPk(purchaseId);

  if (!purchase) {
    return { success: false, status: 404, message: 'Local purchase record not found' };
  }

  // Prevent self-approval: the approver cannot be the record creator
  if ((newStatus === 'Approved' || newStatus === 'Rejected') && purchase.created_by === userId) {
    return {
      success: false,
      status: 403,
      message: 'You cannot approve or reject your own records'
    };
  }

  if (!validateTransition(purchase.status, newStatus)) {
    return {
      success: false,
      status: 400,
      message: `Cannot transition from ${purchase.status} to ${newStatus}`
    };
  }

  if (newStatus === 'Rejected' && (!remarks || !remarks.trim())) {
    return {
      success: false,
      status: 400,
      message: 'Remarks are required when rejecting a record'
    };
  }

  // Business rule: Before transitioning to 'MRN Uploaded', check for MRN attachment
  if (newStatus === 'MRN Uploaded') {
    const mrnAttachment = await Attachment.findOne({
      where: {
        local_purchase_id: purchaseId,
        attachment_type: ['Manual MRN Photo', 'Manual MRN Scanned Copy']
      }
    });
    if (!mrnAttachment) {
      return {
        success: false,
        status: 400,
        message: 'Cannot advance to MRN Uploaded: a Manual MRN Photo or Manual MRN Scanned Copy attachment is required'
      };
    }
  }

  // Business rule: Before transitioning to 'GRN Completed', check invoice_attached
  if (newStatus === 'GRN Completed') {
    if (!purchase.invoice_attached) {
      return {
        success: false,
        status: 400,
        message: 'Cannot advance to GRN Completed: invoice must be attached first'
      };
    }
  }

  // Business rule: Before transitioning to 'Completed', check grn_completed, invoice_attached, and MRN attachment
  if (newStatus === 'Completed') {
    if (!purchase.grn_completed || !purchase.invoice_attached) {
      return {
        success: false,
        status: 400,
        message: 'Cannot complete: GRN must be completed and invoice must be attached'
      };
    }
    const mrnAttachment = await Attachment.findOne({
      where: {
        local_purchase_id: purchaseId,
        attachment_type: ['Manual MRN Photo', 'Manual MRN Scanned Copy']
      }
    });
    if (!mrnAttachment) {
      return {
        success: false,
        status: 400,
        message: 'Cannot complete: a Manual MRN attachment is required'
      };
    }
  }

  const oldStatus = purchase.status;

  await purchase.update({ status: newStatus });

  await ApprovalHistory.create({
    local_purchase_id: purchaseId,
    status: newStatus,
    remarks: remarks || null,
    action_by: userId
  });

  await createAuditLog({
    user_id: userId,
    action: `STATUS_CHANGE_${newStatus.toUpperCase().replace(/ /g, '_')}`,
    entity_type: 'LocalPurchase',
    entity_id: purchaseId,
    old_values: { status: oldStatus },
    new_values: { status: newStatus },
    ip_address: ipAddress
  });

  const updated = await LocalPurchase.findByPk(purchaseId, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'username', 'full_name'] }
    ]
  });

  return { success: true, data: updated };
};

const getApprovalHistory = async (purchaseId) => {
  const purchase = await LocalPurchase.findByPk(purchaseId);

  if (!purchase) {
    return { success: false, status: 404, message: 'Local purchase record not found' };
  }

  const history = await ApprovalHistory.findAll({
    where: { local_purchase_id: purchaseId },
    include: [
      { model: User, as: 'actor', attributes: ['id', 'username', 'full_name'] }
    ],
    order: [['created_at', 'DESC']]
  });

  return { success: true, data: history };
};

module.exports = {
  changeStatus,
  getApprovalHistory,
  validateTransition
};
