import { body, check } from 'express-validator';

function checkCreditValidator() {
    return [
        body('customerId', 1004)// Must be an integer number
            .isInt(),
        body('walletCategory', 1004)// Must be an integer number
            .isInt(),
        body('amount', 1004)// Must be an integer number
            .isInt(),
    ];
}

function transactionValidator() {
    return [
        check('custPkId', 1004)// Must be an integer number
            .optional().isInt(),
        check('serviceId', 1004)// Must be an integer number
            .optional().isInt(),
        // check('transactionId', 1004)// Must be an integer number
        //     .optional().isInt(),
        check('content-disposition', 1008)// Invalid value
            .optional().isIn(['attachment', 'inline']),
    ];
}

function sendInvoiceValidator() {
    return [
        body('emailAddress', 1004)// Must be an integer number
            .if((value, { req }) => ['POST'].includes(req.method) && req.originalUrl.endsWith('sendToEmail'))
            .isArray()
            .withMessage(1012)// Must be an array
            .notEmpty()
            .withMessage(1011), // Invalid email
    ];
}

function refundValidator() {
    return [
        body('stocks.*.stockId')
            .if((value, { req }) => (req.body.stocks))
            .isInt()
            .withMessage(1004)// Must be an integer number
            .isLength({ min: 1 })
            .withMessage(1002), // Required field
        // body('products.*.phone', 1002)// Required field
        //     .if((value, { req }) => (req.body.products))
        //     .isLength({ min: 9, max: 10 }),
    ];
}

export {
    checkCreditValidator,
    transactionValidator,
    sendInvoiceValidator,
    refundValidator,
};
