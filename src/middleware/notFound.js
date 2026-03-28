const { AppError } = require('../utils/AppError');

module.exports = (req, res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server`, 404));
};
