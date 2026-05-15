const { changeStatus, getApprovalHistory } = require('../services/approvalService');

const approve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const result = await changeStatus({
      purchaseId: id,
      newStatus: 'Approved',
      userId: req.user.id,
      remarks,
      ipAddress: req.ip
    });

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'Local purchase approved successfully',
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

const reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const result = await changeStatus({
      purchaseId: id,
      newStatus: 'Rejected',
      userId: req.user.id,
      remarks,
      ipAddress: req.ip
    });

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'Local purchase rejected',
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

const complete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const result = await changeStatus({
      purchaseId: id,
      newStatus: 'Completed',
      userId: req.user.id,
      remarks,
      ipAddress: req.ip
    });

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'Local purchase marked as completed',
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

const advanceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status: targetStatus, remarks } = req.body;

    if (!targetStatus) {
      return res.status(400).json({ success: false, message: 'Target status is required' });
    }

    const result = await changeStatus({
      purchaseId: id,
      newStatus: targetStatus,
      userId: req.user.id,
      remarks,
      ipAddress: req.ip
    });

    if (!result.success) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    res.json({ success: true, message: `Status advanced to ${targetStatus}`, data: result.data });
  } catch (error) {
    next(error);
  }
};

const history = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await getApprovalHistory(id);

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  approve,
  reject,
  complete,
  advanceStatus,
  history
};
