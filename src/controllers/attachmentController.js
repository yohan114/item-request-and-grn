const path = require('path');
const fs = require('fs');
const { Attachment, LocalPurchase, User } = require('../models');
const { createAuditLog } = require('../utils/auditLogger');

const uploadAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { attachment_type } = req.body;

    const purchase = await LocalPurchase.findByPk(id);
    if (!purchase) {
      // Remove uploaded file if purchase not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Local purchase record not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const attachment = await Attachment.create({
      local_purchase_id: id,
      file_name: req.file.filename,
      original_name: req.file.originalname,
      file_path: req.file.path,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      attachment_type: attachment_type || 'Other',
      uploaded_by: req.user.id
    });

    await createAuditLog({
      user_id: req.user.id,
      action: 'UPLOAD',
      entity_type: 'Attachment',
      entity_id: attachment.id,
      new_values: { file_name: attachment.original_name, attachment_type: attachment.attachment_type },
      ip_address: req.ip
    });

    // Auto-advance: if MRN attachment uploaded and purchase is at 'MRN Created', advance to 'MRN Uploaded'
    if ((attachment_type === 'Manual MRN Photo' || attachment_type === 'Manual MRN Scanned Copy') && purchase.status === 'MRN Created') {
      const oldStatus = purchase.status;
      await purchase.update({ status: 'MRN Uploaded' });
      await createAuditLog({
        user_id: req.user.id,
        action: 'STATUS_CHANGE_MRN_UPLOADED',
        entity_type: 'LocalPurchase',
        entity_id: purchase.id,
        old_values: { status: oldStatus },
        new_values: { status: 'MRN Uploaded' },
        ip_address: req.ip
      });
    }

    // Auto-update: if Invoice attachment uploaded, set invoice_attached = true
    if (attachment_type === 'Invoice') {
      await purchase.update({ invoice_attached: true });
      await createAuditLog({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'LocalPurchase',
        entity_id: purchase.id,
        old_values: { invoice_attached: false },
        new_values: { invoice_attached: true },
        ip_address: req.ip
      });
    }

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: attachment
    });
  } catch (error) {
    next(error);
  }
};

const listAttachments = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchase = await LocalPurchase.findByPk(id);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Local purchase record not found'
      });
    }

    const attachments = await Attachment.findAll({
      where: { local_purchase_id: id },
      include: [{ model: User, as: 'uploader', attributes: ['id', 'username', 'full_name'] }],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: attachments
    });
  } catch (error) {
    next(error);
  }
};

const downloadAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const attachment = await Attachment.findByPk(id);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    const filePath = attachment.file_path;
    const uploadsDir = path.resolve(path.join(__dirname, '..', '..', 'uploads'));
    const resolvedPath = path.resolve(filePath);

    // Path traversal protection
    if (!resolvedPath.startsWith(uploadsDir + path.sep) && resolvedPath !== uploadsDir) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Sanitize original_name for Content-Disposition header
    const sanitizedName = attachment.original_name
      .replace(/["\\\r\n]/g, '')
      .replace(/[^\x20-\x7E]/g, '_');

    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedName}"`);
    res.setHeader('Content-Type', attachment.file_type);

    return res.sendFile(resolvedPath);
  } catch (error) {
    next(error);
  }
};

const deleteAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const attachment = await Attachment.findByPk(id);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Remove file from disk
    if (fs.existsSync(attachment.file_path)) {
      fs.unlinkSync(attachment.file_path);
    }

    const oldValues = {
      file_name: attachment.original_name,
      attachment_type: attachment.attachment_type
    };

    await attachment.destroy();

    await createAuditLog({
      user_id: req.user.id,
      action: 'DELETE',
      entity_type: 'Attachment',
      entity_id: id,
      old_values: oldValues,
      ip_address: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadAttachment,
  listAttachments,
  downloadAttachment,
  deleteAttachment
};
