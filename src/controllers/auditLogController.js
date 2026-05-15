const { Op } = require('sequelize');
const { AuditLog, User } = require('../models');

const list = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      user_id,
      entity_type,
      action,
      date_from,
      date_to
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    if (user_id) {
      where.user_id = user_id;
    }
    if (entity_type) {
      where.entity_type = entity_type;
    }
    if (action) {
      where.action = action;
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

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'full_name'] }
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

const getByEntity = async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.params;

    const logs = await AuditLog.findAll({
      where: {
        entity_type,
        entity_id
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'full_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  list,
  getByEntity
};
