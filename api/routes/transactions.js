import express from 'express';
import { validationResult } from 'express-validator';
import { moduleRoutes } from '../utils/routesManage.js';
import {
    AppError, setFormatForExpressValidator, setFormatValidErr, successStatuses,
} from '../utils/error.js';
import { apiResponse } from '../utils/apiJson.js';
import * as controller from '../controllers/transactions.js';
import { refundValidator, sendInvoiceValidator } from '../middlewares/transactions.js';
import { payValidator } from '../middlewares/customers.js';

const router = express.Router();

router.all(moduleRoutes.routes.transactions.pay, payValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'POST':
            // Pay
            data = await controller.pay(req);
            break;
        default:
            next(new AppError(404, setFormatValidErr(3005)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code, data.info)));
        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/payment')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.post(moduleRoutes.routes.transactions.refund, refundValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'POST':
            // Cancel transaction
            data = await controller.cancel(req);
            break;
        default:
            next(new AppError(404, setFormatValidErr(3005)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code, data.info)));
        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/refund')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.transactions.transaction, sendInvoiceValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'GET':
            if (req.originalUrl.includes('invoices')) { // Download or view invoice
                data = await controller.getInvoice(req, res);
            } else if (req.originalUrl.match(/(\d+)$/)) {
                data = await controller.getTransaction(req);
            } else next(new AppError(404, setFormatValidErr(3005)));
            break;
        case 'POST':
            // if (req.originalUrl.endsWith('sendToEmail')) {
            //     data = await controller.sendInvoice(req);
            // } else
            if (req.originalUrl.includes('invoices')) { // Create hash for invoice
                data = await controller.createHashForInvoice(req);
            } else next(new AppError(404, setFormatValidErr(3005)));
            break;
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code, { freeText: data.msg })));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/transactions')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.use(express.json());
export default router;
