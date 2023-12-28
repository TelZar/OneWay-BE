import { body, check } from 'express-validator';
import { checkIfIsNumericArr } from '../utils/helper.js';

function serviceValidator() {
    return [
        body('serviceName')// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        body('serviceHeName')// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        body('serviceId', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'DELETE'].includes(req.method))
            .isInt(),
    ];
}
function departmentValidator() {
    return [
        body('departmentName')
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        body('departmentHeName')// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        check('departmentId', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'DELETE'].includes(req.method))
            .isInt(),
        check('departmentId', 1004)// Must be an integer number
            .if((value, { req }) => ['POST', 'GET'].includes(req.method))
            .optional().isInt(),
        body('serviceList')
            .if((value, { req }) => ['POST'].includes(req.method))
            .optional().custom(checkIfIsNumericArr),
    ];
}
function roleValidator() {
    return [
        body('roleName')
            .if((value, { req }) => ['POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003) // Must be non-numeric
            .if((value, { req }) => ['PATCH'].includes(req.method))
            .optional()
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        body('roleHeName')
            .if((value, { req }) => ['POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003) // Must be non-numeric
            .if((value, { req }) => ['PATCH'].includes(req.method))
            .optional()
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        check('roleId', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'DELETE'].includes(req.method))
            .optional()
            .isInt(),
        body('report2Id', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .optional()
            .isInt(),
        body('subToOrder')
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .optional().isInt()
            .withMessage(1004) // Must be an integer number
            .isIn([0, 1])
            .withMessage(1005), // Field must be boolean
        check('departmentId', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'POST', 'GET'].includes(req.method))
            .isInt(),
    ];
}
function moduleValidator() {
    return [
        body('description')
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        body('descriptionHe', 1003)// Must be non-numeric
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isLength({ min: 1 })
            .withMessage(1000)// Required field
            .not()
            .isNumeric()
            .withMessage(1003), // Must be non-numeric
        body('moduleID', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'DELETE'].includes(req.method))
            .isInt(),
        check('moduleID', 1004)// Must be an integer number
            .if((value, { req }) => ['GET'].includes(req.method))
            .optional().isInt(),
        check('activityTime')
            .if((value, { req }) => ['PATCH', 'DELETE'].includes(req.method))
            .optional().custom(checkIfIsNumericArr),
    ];
}
function permissionValidator() {
    return [
        check('roleId', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isInt(),
        check('permissions.*.moduleId', 1004)// Must be an integer number
            // .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .isInt(),
        check('permissions.*.basicActions.canView', 1005)// Field must be boolean
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .optional().isIn([0, 1]),
        check('permissions.*.basicActions.canAdd', 1005)// Field must be boolean
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .optional().isIn([0, 1]),
        check('permissions.*.basicActions.canEdit', 1005)// Field must be boolean
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .optional().isIn([0, 1]),
        check('permissions.*.basicActions.canDelete', 1005)// Field must be boolean
            .if((value, { req }) => ['PATCH', 'POST'].includes(req.method))
            .optional().isIn([0, 1]),
        check('permissions.*.agModuleId', 1004)// Must be an integer number
            .if((value, { req }) => ['PATCH', 'DELETE'].includes(req.method))
            .isInt(),
        check('permissions.*.moduleActions')
            .if((value, { req }) => ['PATCH', 'DELETE'].includes(req.method))
            .optional().custom(checkIfIsNumericArr),
    ];
}
function associateValidator() {
    return [
        check('roleId', 1004)// Must be an integer number
            .isInt(),
        check('agentsList')
            .custom(checkIfIsNumericArr),
    ];
}

export {
    serviceValidator,
    departmentValidator,
    roleValidator,
    moduleValidator,
    permissionValidator,
    associateValidator,
};
