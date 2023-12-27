import { body, check } from 'express-validator';
import { isEmpty } from '../utils/helper.js';

function customerValidator() {
    const postMethodCondition = (value, { req }) => ['POST', 'PATCH'].includes(req.method) && req.params && req.params.custPkId && !req.params.subscriberId && req.body.customerType;
    const emailRegex = /^([a-z0-9\+_\-]+)(\.[a-z0-9\+_\-]+)*@([a-z0-9\-]+\.)+[a-z]{2,6}$/i;
    const isServiceIdExist = (value, { req }) => req.method === 'POST' && ((!req.body.serviceId && !req.params.serviceId) || (req.params.serviceId !== '7' && req.body.serviceId !== 7)) && (req.originalUrl.endsWith('customers') || req.originalUrl.endsWith('services'));
    const simType = ['esim', 'regular'];

    return [
        body('serviceId')
            .isNumeric().withMessage(1008).isLength({ min: 1 })
            .withMessage(1001) // Invalid length
            .isIn([7, 100, 110, 120, 130, 200, 201, 202])
            .withMessage(1008) // Invalid value
            .optional(),
        body(['firstName', 'lastName'])
            .isString().withMessage(1003) // Must be non-numeric
            .isLength({ min: 2, max: 64 })
            .withMessage(1001) // Invalid length
            .matches(/^[A-Za-zא-ת\s]+$/)
            .withMessage(1003) // Must be non-numeric
            .optional(),
        body(['contactPhoneNumber', 'additionalPhone'])
            .isString().withMessage(1003) // Must be non-numeric
            .isLength({ min: 8, max: 10 })
            .withMessage(1001) // Invalid length
            .matches(/^05[0-9]{8}$/)
            .withMessage(1009) // Invalid phone
            .optional(),
        body('mainEmail')
            .isString().withMessage(1003) // Must be non-numeric
            .matches(emailRegex)
            .withMessage(1011) // Invalid email
            .isLength({ min: 1 })
            .withMessage(1001) // Invalid length
            .optional(),
        body(['idType', 'gender'])
            .isIn([1, 2]).withMessage(1008) // Invalid value
            .isLength({ min: 1 })
            .withMessage(1001)// Invalid length
            .optional(),
        body('nationalId')
            .custom((value, { req }) => {
                const { idType } = req.body;
                if (idType && idType === 1 && value) {
                    return /^[0-9\s]+$/.test(value) && value.length >= 8 && value.length <= 9;
                }
                if (idType && idType === 2 && value) {
                    return /^[A-Za-z0-9\s]+$/.test(value) && value.length >= 5 && value.length <= 15;
                }
                return true;
            }).withMessage(1008) // Invalid value
            .if(isServiceIdExist)
            .isString()
            .withMessage(1003) // Must be non-numeric
            .exists()
            .withMessage(1000), // Required
        body(['langCode', 'countryCode', 'cityCode', 'streetCode', 'house', 'zipCode'])
            .isNumeric().withMessage(1008) // Invalid value
            .isLength({ min: 1 })
            .withMessage(1001)// Invalid length
            .optional(),
        body('commercialName')
            .isString().withMessage(1008) // Invalid value
            .isLength({ min: 2, max: 128 })
            .withMessage(1001) // Invalid length
            .matches(/^[A-Za-z\s]+$/)
            .withMessage(1008) // Invalid value
            .optional(),
        body('website')
            .isString().withMessage(1008) // Invalid value
            .isLength({ min: 1 })
            .withMessage(1001)// Invalid length
            .optional(),
        body('roamingToJordanEgypt')
            .isBoolean()
            .withMessage(1005)
            .custom((value, { req }) => value)
            .withMessage(1018) // check if value is true
            .optional(),

        // Agreements
        // body(['defaultWallet', 'customerCommission', 'employerToCompensation', 'employer', 'gender', 'customerIdentificationStatement', 'tin',
        //     'additionalIdentificationDocument', 'immigrationAuthorityDocument', 'moneySource', 'expectedMonthlyDeposit', 'expectedUseMoney', 'previousIssueRefusal',
        //     'agreementLetter', 'saveBankAccountNumber', 'agreementRewireGmt', 'agreementDebitingTransfer', 'nisBalance', 'usdBalance', 'countriesAllowedTransfer',
        //     'moneyTransferRestrictions', 'regularProducts', 'expensiveProducts', 'cellularProducts', 'cashCollectionShekels', 'stockProducts', 'dollarsCollection',
        //     'euroCollection', 'subToRoleId', 'rateId', 'gbpBalance', 'euroBalance', 'privacyAndPolicy', 'termsOfUse'])
        //     .isString().withMessage(1008) // Invalid value
        //     .isLength({ min: 1, max: 200 })
        //     .withMessage(1001)// Invalid length
        //     .optional(),

        // Payments
        body('creditCardToken')
            .isString().withMessage(1008) // Invalid value
            .matches(/^[0-9]{16}$/)
            .withMessage(1008) // Invalid value
            .optional(),
        body('creditCardExpiration')
            .isString().withMessage(1008) // Invalid value
            .isLength({ min: 4, max: 4 })
            .withMessage(1001)// Invalid length
            .matches(/^(0[1-9]|1[0-2])(\d{2})$/)
            .withMessage(1008) // Invalid value
            .optional(),
        body('creditCardCvv')
            .isString().withMessage(1008) // Invalid value
            .matches(/^[0-9]{3}$/)
            .withMessage(1008) // Invalid value
            .optional(),

        // Stock
        body('products')
            .optional()
            .isArray()
            .withMessage(1003) // Must be non-numeric
            .if((value, { req }) => value !== undefined)
            .custom((value) => value.length > 0)
            .withMessage(1003) // At least one product is required
            .if((value, { req }) => value !== undefined)
            .isArray({ min: 1 })
            .withMessage(1003) // At least one product is required
            .if((value, { req }) => value !== undefined)
            .isArray()
            .custom((value) => {
                if (isEmpty(value)) throw new Error('Products must be an array');
                for (const item of value) {
                    if (isEmpty(item)) throw new Error('Products are empty');
                    if (!item.productId || typeof item.productId !== 'number') throw new Error('products.productId required, number');
                    if (item.serialNumber && typeof item.serialNumber !== 'string') throw new Error('products.serialNumber string');
                    if (item.status && (typeof item.status !== 'number' || ![1, 2, 3, 4, 5].includes(item.status))) throw new Error('products.status number, equals: 1,2,3,4,5');
                    if (item.stockId && typeof item.stockId !== 'number') throw new Error('products.stockId number');
                    if (item.soldTo && typeof item.soldTo !== 'number') throw new Error('products.soldTo number');
                    if (item.macAddress && typeof item.macAddress !== 'string') throw new Error('products.macAddress number');
                    if (item.aGroup && typeof item.aGroup !== 'number') throw new Error('products.aGroup number');
                    if (typeof item.amount !== 'undefined' && (typeof item.amount !== 'number' || item.amount < 1)) throw new Error('products.amount number, bigger then 0');
                }
                return true;
            }),

        // order
        body('subscribers.*.simType')
            .optional()
            .isIn(simType)
            .withMessage('invalid operator'),

        // orders
        // body('subscribers.*.simIccid')
        //     .isString().withMessage(1008) // Invalid value
        //     .isLength({ min: 19 })
        //     .withMessage(1001)// Invalid length
        //     .optional(),

        body('subscribers.*.subscriberName')
            .optional()
            .custom((value) => value === null || value === '' || /^[A-Za-zא-ת\s']+$/u.test(value))
            .withMessage(1003), // Must be non-numeric
        body('subscribers.*.keepPhoneNumber.status')
            .optional()
            .isBoolean()
            .withMessage(1005),
        body('subscribers.*.keepPhoneNumber.renewable')
            .optional()
            .isInt()
            .withMessage(1004),

    ];
}

function payValidator() {
    return [
        check('custPkId', 1004)// Must be an integer number
            .optional().isInt(),
        check('serviceId', 1004)// Must be an integer number
            .optional().isInt(),
        // check('transactionId', 1004)// Must be an integer number
        //     .optional().isInt(),
        check('creditCardDetails.*.id', 1004)// Must be an integer number
            .optional().isInt(),
        check('creditCardDetails.*.cardNo', 1004)// Must be an integer number
            .optional().isInt(),
        // check('creditCardDetails.*.expiration', 1008)// // Invalid value
        //     .optional().custom(formatDateMMYY),
        check('paymentContent.*.methodType', 1008)// // Invalid value
            .isIn([1, 2]),
        check('paymentContent.*.amount', 1008)//  Invalid value
            .optional().isNumeric(),
        check('paymentContent.*.currency', 1008)//  Invalid value
            .isIn([1, 2, 3]),
    ];
}

function callForwardingValidator() {
    return [
        check('custPkId')
            .isNumeric().withMessage(1004)
            .exists()
            .withMessage(1000),
        check('serviceId')
            .isNumeric().withMessage(1004)
            .exists()
            .withMessage(1000),
        check('subscriberId')
            .isNumeric().withMessage(1004)
            .exists()
            .withMessage(1000),
        body('always').optional(),
        body('always.status')
            .if(body('always').exists())
            .isBoolean()
            .withMessage(1005)
            .exists()
            .withMessage(1000),
        body('always.phoneNumber')
            .if((value, { req }) => req.body.always && req.body.always.status === true)
            .isString().withMessage(1003)
            .matches(/^05[0-9]{8}$/)
            .withMessage(1009)
            .exists()
            .withMessage(1000),
        body('busy').optional(),
        body('busy.status')
            .if(body('busy').exists())
            .isBoolean()
            .withMessage(1005),
        body('busy.phoneNumber')
            .if((value, { req }) => req.body.busy && req.body.busy.status === true)
            .isString().withMessage(1003)
            .matches(/^05[0-9]{8}$/)
            .withMessage(1009),
        body('unavailable').optional(),
        body('unavailable.status')
            .if(body('unavailable').exists())
            .isBoolean()
            .withMessage(1005)
            .exists()
            .withMessage(1000),
        body('unavailable.phoneNumber')
            .if((value, { req }) => req.body.unavailable && req.body.unavailable.status === true)
            .isString().withMessage(1003)
            .matches(/^05[0-9]{8}$/)
            .withMessage(1009)
            .exists()
            .withMessage(1000),
        body('noReply').optional(),
        body('noReply.status')
            .if(body('noReply').exists())
            .isBoolean()
            .withMessage(1005)
            .exists()
            .withMessage(1000),
        body('noReply.phoneNumber')
            .if((value, { req }) => req.body.noReply && req.body.noReply.status === true)
            .isString().withMessage(1003)
            .matches(/^05[0-9]{8}$/)
            .withMessage(1009)
            .exists()
            .withMessage(1000),
        body('noReply.forwardingAfterTime')
            .if((value, { req }) => req.body.noReply && req.body.noReply.status === true)
            .isNumeric().withMessage(1004)
            .optional(),
    ];
}

function stockValidator() {
    const postMethodCondition = (value, { req }) => req.method === 'POST';
    return [
        check('custPkId')
            .if(postMethodCondition)
            .isNumeric().withMessage(1004)
            .exists(),
        check('serviceId')
            .if(postMethodCondition)
            .isNumeric().withMessage(1004)
            .exists(),
        body('productId')
            .if(postMethodCondition)
            .isNumeric().withMessage(1008) // Invalid value
            .optional()
            .if((value, { req }) => req.body.stockId === null)
            .exists(),
        body('stockId')
            .if(postMethodCondition)
            .isNumeric().withMessage(1008) // Invalid value
            .optional()
            .if((value, { req }) => req.body.productId === null)
            .exists(),
        body(['seralNumber', 'macAddress'])
            .if(postMethodCondition)
            .isString()
            .isLength({ min: 2, max: 456 })
            .withMessage(1001) // Invalid length
            .optional(),
        body(['aGroup', 'randomNumber', 'price', 'internalOrderId', 'soldTo', 'status', 'orderId',
            'distributionId', 'isMobilized', 'bundleId', 'batchId', 'amount', 'warehouseStructureId'])
            .if(postMethodCondition)
            .isNumeric().withMessage(1008) // Invalid value
            .optional(),
    ];
}

function roamingCallFilteringValidator() {
    const postMethodCondition = (value, { req }) => req.method === 'POST';
    return [
        check('custPkId')
            .isNumeric().withMessage(1004)
            .exists()
            .withMessage(1000),
        check('serviceId')
            .isNumeric().withMessage(1004)
            .exists()
            .withMessage(1000),
        check('subscriberId')
            .isNumeric().withMessage(1004)
            .exists()
            .withMessage(1000),
        body('accessCode')
            .if(postMethodCondition)
            .exists()
            .withMessage(1000)
            .if((value, { req }) => value)
            .isString()
            .withMessage(1003)
            .isNumeric()
            .withMessage(1004)
            .isLength({ min: 4, max: 4 })
            .withMessage(1001),

    ];
}

function simReplaceValidator() {
    return [
        check('custPkId')
            .isNumeric().withMessage(1004)
            .exists()
            .withMessage(1000),
        check('serviceId')
            .isNumeric().withMessage(1004)
            .exists()
            .withMessage(1000),
        check('subscriberId')
            .isNumeric().withMessage(1004)
            .exists()
            .withMessage(1000),
        body('simIccid')
            .if(body('simTypeId').isIn([1, 3]))
            .isString()
            .isNumeric()
            .withMessage(1004)
            .exists()
            .withMessage(1000),
        body('simTypeId').isNumeric()
            .withMessage(1004)
            .isIn([1, 2, 3])
            .withMessage(1008)
            .exists()
            .withMessage(1000),
        body('needPayment')
            .isBoolean()
            .withMessage(1005)
            .exists()
            .withMessage(1000),
        body('activation')
            .isBoolean()
            .withMessage(1005)
            .exists()
            .withMessage(1000),
    ];
}

function activationEsimValidator() {
    const emailRegex = /^([a-z0-9\+_\-]+)(\.[a-z0-9\+_\-]+)*@([a-z0-9\-]+\.)+[a-z]{2,6}$/i;
    return [
        check('custPkId')
            .isNumeric().withMessage(1004),
        check('serviceId')
            .isNumeric().withMessage(1004),
        check('subscriberId')
            .isNumeric()
            .withMessage(1004),
        body('sendingDetailsTo.phoneNumber')
            .isString().withMessage(1003)
            .matches(/^05[0-9]{8}$/)
            .withMessage(1009)
            .optional(),
        body('sendingDetailsTo.email')
            .isString().withMessage(1003)
            .matches(emailRegex)
            .withMessage(1011)
            .optional(),
    ];
}

function cashTransferValidator() {
    return [
        check('custPkId')
            .isInt().withMessage(1004).exists(),
        check('serviceId')
            .isInt().withMessage(1004).exists(),
        check('subscriberId')
            .isInt()
            .withMessage(1004),
        check('beneficiarySubscriberId')
            .isInt().withMessage(1004)
            .exists(),
        body('money')
            .custom((value) => {
                if (isEmpty(value)) throw new Error('Money must be an array');
                for (const item of value) {
                    if (isEmpty(item)) throw new Error('Money are empty');
                    if (!item.currencyType || typeof item.currencyType !== 'number') throw new Error('money.currencyType required, number');
                    if (!item.amount || typeof item.amount !== 'number') throw new Error('money.amount required, decimal');
                }
                return true;
            }),
    ];
}

export {
    // sanitizedCustomer,
    // putCustomerValidator,
    customerValidator,
    payValidator,
    stockValidator,
    roamingCallFilteringValidator,
    callForwardingValidator,
    activationEsimValidator,
    simReplaceValidator,
    cashTransferValidator,
};
