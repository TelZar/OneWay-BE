import express from 'express';
import { validationResult } from 'express-validator';
import * as validator from '../middlewares/auth.js';
import { apiResponse } from '../utils/apiJson.js';
import * as auth from '../controllers/auth.js';
import {
    AppError, setFormatForExpressValidator, setFormatValidErr, successStatuses,
} from '../utils/error.js';
import { moduleRoutes } from '../utils/routesManage.js';

const router = express.Router();

router.post(moduleRoutes.routes.auth.token, validator.tokenValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(401, errs));

        const data = await auth.createToken(req, res, next);
        if (data.code && data.code.code) data.code = data.code.code;
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `post('/token')-> ${err.message}`;
        next(new AppError(500, setFormatValidErr(1020, { freeText: err.message, title: 'token' })));// General auth error
    }
});

router.post(moduleRoutes.routes.auth.otp, validator.otpValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        const data = await auth.checkOtp(req, res, next);
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code, { freeText: data.message })));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `post('/checkOtp')-> ${err.message}`;
        next(new AppError(500, setFormatValidErr(1020, { freeText: err.message, title: 'checkOtp' })));// General auth error
    }
});

router.post(moduleRoutes.routes.auth.logout, async (req, res, next) => {
    try {
        const data = await auth.logout(req);
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `post('/logout')-> ${err.message}`;
        next(new AppError(500, setFormatValidErr(1020, { freeText: err.message, title: 'logout' })));// General auth error
    }
});

// after verify otp, you can change the password
router.post(moduleRoutes.routes.auth.changePassword, validator.changePasswordValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        // Change password
        const data = await auth.changePassword(req, res);
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `post('/changePassword')-> ${err.message}`;
        next(new AppError(500, setFormatValidErr(1020, { freeText: err.message, title: 'changePassword' })));// General auth error
    }
});

router.use(express.json());
export default router;
