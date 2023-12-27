import { body, check } from 'express-validator';

function summaryValidator() {
    return [
        body('agentId', 1004)
            .if((value, { req }) => ['POST'].includes(req.method))
            .isInt(),
        body('eventTypeId', 1004)// Must be non-numeric
            .if((value, { req }) => ['POST'].includes(req.method))
            .isInt(),
        body('content')// Must be integer number
            .if((value, { req }) => ['POST'].includes(req.method))
            .exists()
            .withMessage(1002), // Required field
        body('parentId', 1004)// Must be integer number
            .if((value, { req }) => ['POST'].includes(req.method))
            .optional(),
        body('serviceId', 1004)
            .if((value, { req }) => ['POST'].includes(req.method))
            .isInt(),
        body('id', 1004)
            .if((value, { req }) => ['PUT'].includes(req.method))
            .isInt(),
        check('custPkId', 1004)// Must be an integer number
            .if((value, { req }) => ['GET'].includes(req.method))
            .isInt(),
        body('customerId', 1004)
            .if((value, { req }) => ['POST'].includes(req.method))
            .if((value, { req }) => (req.body.action === 1794))
            .isInt(),
        body('templateId', 1004)
            .if((value, { req }) => ['POST'].includes(req.method))
            .if((value, { req }) => (req.body.action === 1794))
            .isInt(),
    ];
}

export {
    summaryValidator,
};
