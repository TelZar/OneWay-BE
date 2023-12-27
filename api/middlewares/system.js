import { body, check } from 'express-validator';

function shortcutValidator() {
    return [
        body('title')// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        body('routeType')// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        body('routeVal')// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        body('icon')// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        body('order', 1004)// Must be an integer number
            .isInt(),
        body('color')
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        body('shortcutId ', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'DELETE'].includes(req.method))
            .isInt(),
    ];
}
function dashboardValidator() {
    return [
        body('moduleId', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isInt(),
        body('title')// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        body('label')// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        check('dashboardId', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'DELETE'].includes(req.method))
            .isInt(),
    ];
}
function widgetValidator() {
    return [
        check('dashboardId', 1003)// Must be non-numeric
            .not()
            .isNumeric(),
        check('widgetId', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'DELETE'].includes(req.method) && !req.originalUrl.match(/widgetPrimary\/\d+$/))
            .isInt(),
        check('widgetPrimaryId', 1004)// Must be an integer number
            .if((value, { req }) => ['DELETE'].includes(req.method) && req.originalUrl.match(/widgetPrimary\/\d+$/))
            .isInt(),
        body('widgets.*.labelType', 1008)// Invalid value
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isIn(['all', 'department', 'role', 'agent']),
        body('widgets.*.val')// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isInt(), // Must be non-numeric
        body('type')// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isInt(), // Must be non-numeric
        body('widgets.*.size')// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isInt(), // Must be non-numeric
        body('widgets.*.title')// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        body('widgets.*.orderNum', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isInt(),
        body('widgets.*.searchId', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'DELETE'].includes(req.method))
            .optional().isInt(),
        body('widgets.*.typeData', 1008)// Invalid value
            .if((value, { req }) => ['POST'].includes(req.method))
            .optional().isIn(['data', 'count', 'sum', 'avg']),
    ];
}
function geoValidator() {
    return [
        check('query')// Must be non-numeric
            .optional().isLength({ min: 2 })
            .withMessage(1001), // Invalid length
    ];
}

function attachmentsValidator() {
    return [
        check('fileHash')
            .exists()
            .withMessage(1002) // Required field
            .isString()
            .withMessage(1017), // must be string
    ];
}

function sendValidator() {
    return [
        body('filesHash')
            .exists()
            .withMessage(1002) // Required field
            .isArray()
            .withMessage(1012) // Must be an array
            .custom((filesHash) => {
                if (!filesHash || !Array.isArray(filesHash)) {
                    throw new Error(1012); // Must be an array
                }
                if (!filesHash.every((file) => typeof file === 'string')) {
                    throw new Error(1017); // must be string
                }
                return true;
            }),
        body('sendTo.email')
            .exists()
            .withMessage(1002) // Required field
            .isArray()
            .withMessage(1012)// Must be an array
            .custom((value) => {
                for (const item of value) {
                    if (!/^([a-z0-9\+_\-]+)(\.[a-z0-9\+_\-]+)*@([a-z0-9\-]+\.)+[a-z]{2,6}$/.test(item)) {
                        throw new Error(1011); // Invalid email address
                    }
                }
                return true;
            }),
        body('templateId.email')
            .exists()
            .withMessage(1002) // Required field
            .isInt()
            .withMessage(1004), // Must be an integer number
    ];
}

function checkIccidValidator() {
    return [
        body('simIccid')
            .exists()
            .isLength({ min: 19, max: 20 })
            .withMessage(20211) // Required field
            .isString()
            .withMessage(1017), // must be string
    ];
}

export {
    shortcutValidator,
    widgetValidator,
    dashboardValidator,
    geoValidator,
    attachmentsValidator,
    sendValidator,
    checkIccidValidator,
};
