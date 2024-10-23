const { StatusCodes, ReasonPhrases } = require('http-status-codes');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/sendEmail');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, reasonPhrase, res, message = null, data = false) => {
  const token = signToken(user._id);

  const response = {
    status: reasonPhrase,
    token,
  };

  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production)') cookieOptions.secure = true;

  if (message) {
    response.message = message;
  }

  if (data) {
    response.data = user;
  }

  res.cookie('jwt', token, cookieOptions);

  // removing the password form the output

  user.password = undefined;

  res.status(statusCode).json(response);
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);

  createSendToken(newUser, StatusCodes.CREATED, ReasonPhrases.CREATED, res, null, true);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide a valid email or password!', StatusCodes.BAD_REQUEST));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Invalid email or password!', StatusCodes.UNAUTHORIZED));
  }

  createSendToken(
    user,
    StatusCodes.OK,
    ReasonPhrases.OK,
    res,
    'You successfully logged in!',
    false,
  );
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', StatusCodes.UNAUTHORIZED),
    );
  }

  const decodedData = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decodedData.id);

  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token doesn't longer exist!",
        StatusCodes.UNAUTHORIZED,
      ),
    );
  }

  if (currentUser.changedPasswordAfter(decodedData.iat)) {
    return next(
      new AppError(
        'You recently changed your password. Please log in again!',
        StatusCodes.UNAUTHORIZED,
      ),
    );
  }

  req.user = currentUser;

  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action!', StatusCodes.FORBIDDEN),
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(
      new AppError(
        'There is no user with this email address. Please, try again!',
        StatusCodes.NOT_FOUND,
      ),
    );
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Did you forget your password? Submit a PATCH request to reset your password 
  on the ${resetURL}. If you didn't forget your password, please ignore this email.`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 minutes)',
      message,
    });

    res.status(StatusCodes.OK).json({
      status: ReasonPhrases.OK,
      message: 'Reset password email sent! Please check your inbox.',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        `There was an error sending the email. Please, try again later! ${err.message}`,
        StatusCodes.INTERNAL_SERVER_ERROR,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired!', StatusCodes.BAD_REQUEST));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(
    user,
    StatusCodes.OK,
    ReasonPhrases.OK,
    res,
    'Your password has been reset. You can now log in!',
    false,
  );
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(
      new AppError(
        'Your current password is incorrect. Please, try again!',
        StatusCodes.UNAUTHORIZED,
      ),
    );
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  res.status(StatusCodes.OK).json({
    status: ReasonPhrases.OK,
    message: 'Your password has been updated!',
  });
});