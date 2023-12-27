import express from 'express';
// import multer from 'multer';
import { validationResult } from 'express-validator';
import { apiResponse } from '../utils/apiJson.js';
import {
    payValidator, stockValidator, activationEsimValidator, roamingCallFilteringValidator, customerValidator, callForwardingValidator, simReplaceValidator, cashTransferValidator,
} from '../middlewares/customers.js';
import {
    AppError, setFormatForExpressValidator, setFormatValidErr, successStatuses,
} from '../utils/error.js';
// import FILES_PATH_CONFIG from '../config/url.js';
import { summaryValidator } from '../middlewares/activities.js';
import { addActivity, getSummary } from '../controllers/activities.js';
import { moduleRoutes } from '../utils/routesManage.js';
import * as monox from '../controllers/monox.js';
import * as customerController from '../controllers/customers.js';
import * as ordersController from '../controllers/orders.js';
import * as transactionsController from '../controllers/transactions.js';
import { transactionValidator } from '../middlewares/transactions.js';
import { getInvoice, getTransaction } from '../controllers/transactions.js';
import {
    simReplace,
    roamingCallFiltering,
    getEsimNumber,
    getLinkToInstallEsim,
    setHlrProduct,
    callForwarding,
    getCallForwardingUserInfo,
    getRoamingPin,
} from '../controllers/cellularActions.js';
import { insertLogger } from '../utils/logger.js';

const router = express.Router();

// Handle files
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, FILES_PATH_CONFIG.MONOX);
//     },
//     filename: (req, file, cb) => {
//         cb(null, file.originalname);
//     },
// });
// const upload = multer({ storage });

// router.put('/', upload.single('file'), putCustomerValidator(), async (req, res, next) => {
//     try {
//         // Error validation
//         const errs = setFormatForExpressValidator(validationResult(req).errors);
//         if (errs) return next(new AppError(400, errs));
//
//         let data;
//         switch (req.method) {
//         case 'GET':
//             data = await customerController.getCustomer(1);
//             break;
//         case 'POST':
//             data = await customerController.addNewCustomer(req);
//             break;
//         case 'PUT':
//             data = await customerController.putCustomer(req);
//             break;
//         default:
//             next(new AppError(400, setFormatValidErr(1020)));
//         }
//         if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));
//         // Success
//         const response = await apiResponse(req, data);
//         res.status(data.status).send(response);
//     } catch (err) {
//         err.message = `${req.method}('/Customers')-> ${err.message}`;
//         next(new AppError(500, err.message));
//     }
// });

router.all(moduleRoutes.routes.customers.pay, payValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'POST':
            // Pay
            data = await transactionsController.pay(req);
            break;
        default:
            next(new AppError(400, setFormatValidErr(1020)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code, data.info)));
        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/pay')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.post(moduleRoutes.routes.customers.cancel, /* cancelValidator(), */ async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'POST':
            // Cancel transaction
            data = await transactionsController.cancel(req);
            break;
        default:
            next(new AppError(400, setFormatValidErr(1020)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code, data.info)));
        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/cancel')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.customers.customers, customerValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));
        insertLogger({
            end_point: 'customers - req',
            logTitle: 'customers req.body',
            data: req.body,
            type: 'INFO',
            code: 1,
        });

        let data;
        let subscriber;
        if (req.originalUrl.endsWith('customers')) { // '/customers'
            switch (req.method) {
            case 'POST':
                data = await customerController.setCustomer(req.body); // Create Lead
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.match(/customers\/\d+$/)) { // '/customers/:custPkId'
            switch (req.method) {
            case 'GET':
                data = await customerController.getCustomer(req.params);
                break;
            case 'PATCH':
                data = await customerController.updateCustPk(req.params, req.body);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.endsWith('services')) { // '/customers/:custPkId/services'
            switch (req.method) {
            case 'POST':
                data = await customerController.setCustomer(req.body, req.params);
                break;
            case 'GET':
                data = await customerController.getCustomer(req.params, -99);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.match(/services\/\d+$/)) { // '/customers/:custPkId/services/:serviceId'
            switch (req.method) {
            case 'GET':
                data = await customerController.getCustomer(req.params);
                break;
            case 'PATCH':
                data = await customerController.updateCustomer(req.body, req.params);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.endsWith('subscribers')) { // '/customers/:custPkId/services/:serviceId/subscribers'
            switch (req.method) {
            case 'POST':
                // Step - 1, set subscriber
                subscriber = await customerController.setSubscriber(req.body, req.params);
                if (!subscriber.code && subscriber.data.subscriberId > 0) {
                    // Step - 2, set order
                    data = await ordersController.setOrder(req.body, req.params);
                } else data = subscriber;
                break;
            case 'GET':
                data = await customerController.getSubscriber(req.params);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.match(/subscribers\/\d+$/)) { // '/customers/:custPkId/services/:serviceId/subscribers/:subscriberId'
            switch (req.method) {
            case 'GET':
                data = await customerController.getSubscriber(req.params);
                break;
            case 'PATCH':
                data = await customerController.setSubscriber(req.body, req.params);
                break;
            case 'POST':
                const { custPkId, serviceId, subscriberId } = req.params;
                subscriber = await customerController.checkSubscriberHierarchy(custPkId, serviceId, subscriberId); // wait for DB
                if (subscriber.status === 200) {
                // Step - 2, set order
                    data = await ordersController.setOrder(req.body, req.params, 0);
                } else data = subscriber;
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.endsWith('agreements')) { // '/customers/:custPkId/services/:serviceId/agreements'
            switch (req.method) {
            case 'POST':
                data = await customerController.setAgreement(req.body, req.params);
                break;
            case 'GET':
                data = await customerController.getAgreement(req.params);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.match(/agreements\/\d+$/)) { // '/customers/:custPkId/services/:serviceId/agreements/:agreementId'
            // agreementId is equal to agreementType
            switch (req.method) {
            case 'GET':
                data = await customerController.getAgreement(req.params);
                break;
            case 'PATCH':
                data = await customerController.setAgreement(req.body, req.params, 1);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.endsWith('payments')) { // '/customers/:custPkId/services/:serviceId/payments'
            switch (req.method) {
            case 'POST':
                data = await customerController.setPayment(req.body, req.params);
                break;
            case 'GET':
                data = await customerController.getPayment(req.params);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.match(/payments\/\d+$/)) { // '/customers/:custPkId/services/:serviceId/payments/:paymentId'
            switch (req.method) {
            case 'PATCH':
                data = await customerController.setPayment(req.body, req.params, 1);
                break;
            case 'DELETE':
                data = await customerController.setPayment(req.body, req.params, 2);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.endsWith('credit-cards')) { // '/customers/:custPkId/services/:serviceId/payments/credit-cards'
            switch (req.method) {
            case 'GET':
                data = await customerController.getPayment(req.params, 1);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        }
        if (!successStatuses.includes(data.status)) {
            insertLogger({
                end_point: 'customers',
                logTitle: `customers error data.status: ${data.status} & data.info`,
                data: data.info,
                type: 'INFO',
                code: 1,
            });
            return next(new AppError(data.status, setFormatValidErr(data.code, data.info)));
        }

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        console.log(err.message);
        err.message = `${req.method}('/customers')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

// Selling to an already established customer
router.all(moduleRoutes.routes.customers.orders, /* transactionValidator(), */async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'POST':
            data = await ordersController.setOrder(req.body, req.params, req.params.subscriberId);
            break;
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
            break;
        }

        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));
        // Success
        const response = await apiResponse(req, data);//* union data
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}${req.originalUrl}-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.customers.transactions, transactionValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'GET':
            if (req.originalUrl.endsWith('transactions')) { // /:custPkId/services/:serviceId/transactions
                // data = await getTransactions(req);
            } else if (req.originalUrl.match(/(\d+)$/)) {
                data = await getTransaction(req);
            } else { // Download or view invoice
                data = await getInvoice(req, res);
            }
            break;
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
            break;
        }

        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));
        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}${req.originalUrl}-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.customers.activity, summaryValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));
        const insertParameterOfThisRoute = { entityId: 1 }; // 1- customer
        const tempReq = {
            ...req.body, ...req.params, ...req.query, ...insertParameterOfThisRoute,
        };
        let data;
        switch (req.method) {
        case 'GET':
            data = await getSummary(tempReq);
            break;
        case 'POST':
            data = await addActivity(tempReq);
            break;
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
            break;
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));
        // Success
        let response = data.data;
        if (req.method !== 'GET') {
            response = await apiResponse(req, data);//* union data
        }
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/customers/:custPkID/activity')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Monox */
router.all(moduleRoutes.routes.customers.createTokenMonox, /* validator.serviceValidator(), */ async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'POST':
            data = await monox.createToken(req, res);
            break;
            // case 'DELETE':
            // case 'PUT':
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
            break;
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/createTokenMonox')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.customers.usage, /* validator.serviceValidator(), */ async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'GET':
            data = await monox.getUsageByPhone(req);// await monox.cardAssociate(req);
            break;
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
            break;
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);//* union data
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/usage')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.customers.message, /* validator.serviceValidator(), */ async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'GET':
            data = await monox.getUsageByPhone(req);
            break;
        case 'POST':
            data = await monox.getUsageByPhone(req);
            break;
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
            break;
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);//* union data
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/message')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.customers.verifyC2CTransfer, /* validator.serviceValidator(), */ async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'POST':
            data = await monox.verifyC2CTransfer(req);
            break;
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
            break;
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/verifyC2CTransfer')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.customers.esimActivation, activationEsimValidator(), async (req, res, next) => {
    try {
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));
        let data;
        switch (req.method) {
        case 'POST':
            data = await getLinkToInstallEsim({ ...req.params, ...req.body });
            break;
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
            break;
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/verifyC2CTransfer')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.customers.getEsimNumber, async (req, res, next) => {
    try {
        req.body.system = 3;
        let data;
        switch (req.method) {
        case 'POST':
            data = await getEsimNumber(req.body);
            break;
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
            break;
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/getEsimNumber')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Stock */
router.all(moduleRoutes.routes.customers.stock, stockValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        if (req.originalUrl.endsWith('products')) { // '/:custPkId/services/:serviceId/stock/products'
            switch (req.method) {
            case 'POST':
                data = await ordersController.stockModify(req.body, req.params);
                break;
            case 'GET':
                data = await customerController.getStock(req.params);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.match(/products\/\d+$/)) { // '/:custPkId/services/:serviceId/stock/products/:productId'
            switch (req.method) {
            case 'GET':
                data = await customerController.getStockProduct(req.params);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));
        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/stock')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.customers.roamingCallFiltering, roamingCallFilteringValidator(), async (req, res, next) => {
    let data;
    try {
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        switch (req.method) {
        case 'POST':
            data = await roamingCallFiltering({ ...req.params, ...req.body });
            break;
        case 'GET':
            data = await getRoamingPin(req.params);
            break;
        default:// Not found path
            next(new AppError(400, setFormatValidErr(1020)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/roamingCallFiltering')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.customers.cellularActions, async (req, res, next) => {
    let data;
    try {
        switch (req.method) {
        case 'POST':
            data = await setHlrProduct(req.params);
            break;
        default:// Not found path
            next(new AppError(400, setFormatValidErr(1020)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/cellularActions')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.customers.callForwarding, callForwardingValidator(), async (req, res, next) => {
    let data;
    try {
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        switch (req.method) {
        case 'POST':
            data = await callForwarding({ ...req.params, ...req.body });
            break;
        case 'GET':
            data = await getCallForwardingUserInfo(req.params);
            break;
        default:// Not found path
            next(new AppError(400, setFormatValidErr(1020)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/callForwarding')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.customers.simReplace, simReplaceValidator(), async (req, res, next) => {
    let data;
    try {
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        switch (req.method) {
        case 'POST':
            data = await simReplace({ ...req.params, ...req.body });
            break;
        default:// Not found path
            next(new AppError(400, setFormatValidErr(1020)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/simReplace')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.customers.cashTransfer, cashTransferValidator(), async (req, res, next) => {
    try {
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        if (req.originalUrl.endsWith('cashTransfer')) { // '/customers/:custPkId/services/:serviceId/subscribers/:subscriberId/cashTransfer'
            switch (req.method) {
            case 'POST':
                data = await customerController.setCashTransfer(req.body, req.params);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));
        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/cashTransfer')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.use(express.json());

export default router;
