import { body, check } from 'express-validator';

function tokenValidator() {
    const emailRegex = /^([a-z0-9\+_\-]+)(\.[a-z0-9\+_\-]+)*@([a-z0-9\-]+\.)+[a-z]{2,6}$/i;
    const phoneRegex = /^05\d{8}$/;
    return [
        check('grantType')
            .isString().withMessage(1003) // Must be non-numeric
            .exists()
            .withMessage(1000), // Required field
        check('clientId')
            .if((value, { req }) => (req.body.grantType === 'application'))
            .isString().withMessage(1003) // Must be non-numeric
            .exists()
            .withMessage(1000), // Required field
        check('clientSecret')
            .if((value, { req }) => (req.body.grantType === 'application'))
            .isString().withMessage(1003) // Must be non-numeric
            .exists()
            .withMessage(1000), // Required field
        check('userName')
            .if((value, { req }) => (req.body.grantType === 'authorization' || req.body.grantType === 'change_password'))
            .custom((value) => {
                if (!value.match(phoneRegex) && !value.match(emailRegex)) throw new Error('1016');
                return true;
            })
            .exists()
            .withMessage('1000'), // Required field
        check('password', 1008)
            .if((value, { req }) => req.body.grantType === 'authorization')
            // .matches(/[a-z]/) // At least one lowercase letter
            // .matches(/[A-Z]/) // At least one uppercase letter
            // .matches(/\d/) // At least one digit
            // .matches(/[!@#$%^&*(),.?":{}|<>]/) // At least one special character
            // .isString()
            // .withMessage(1003) // Must be non-numeric
            // .isLength({ min: 8 })
            // .withMessage(1001) // Invalid length
            .exists({ checkFalsy: true })
            .withMessage(1000), // Required field
        // check('nationalId')
        //     .if((value, { req }) => (req.body.grantType === 'change_password'))
        //     .matches(/^\d+$/) // only digits
        //     .withMessage(1003)// Must be non-numeric
        //     .isLength({ min: 8, max: 9 })
        //     .withMessage(1001) // Invalid length
        //     .isString()
        //     .withMessage(1008) // Invalid value
        //     .exists()
        //     .withMessage(1000), // Required field
    ];
}

function otpValidator() {
    return [
        check('otpCode')
            .isInt()
            .withMessage(1004) // Must be an integer number
            .isLength({ min: 6, max: 6 })
            .withMessage(1001) // Invalid length
            .optional(),
        check('otpTarget')
            .matches(/^(phone|email)$/)
            // .withMessage('otpTarget must be either "phone" or "email"')
            .isString()
            .withMessage(1008) // Invalid value
            .optional(),
    ];
}

function changePasswordValidator() {
    return [
        body('password', 1008)
            .matches(/[a-z]/) // At least one lowercase letter
            .matches(/[A-Z]/) // At least one uppercase letter
            .matches(/\d/) // At least one digit
            .matches(/[!@#$%^&*(),.?":{}|<>]/) // At least one special character
            .isString()
            .withMessage(1003) // Must be non-numeric
            .isLength({ min: 8 })
            .withMessage(1001) // Invalid length
            .exists()
            .withMessage(1000), // Required field
    ];
}

// function loginValidator() {
//     return [
//         body('userName', 1009)// Invalid phone
//             .if((value, { req }) => (/^\d+$/.test(req.body.userName)))
//             .isMobilePhone(),
//         body('userName', 1011)// Invalid email
//             .if((value, { req }) => (req.body.userName.includes('@')))
//             .isEmail(),
//
//         /* Roi requested to remove 31/05/23
//
//         // This verifies that there is at least one lowercase letter, one uppercase letter, one number character, one special character.
//         // a minimum length and that there are letters in the password
//         body('password', 1008)// Invalid value
//             .exists()
//             .isLength({ min: 8 })
//             .not()
//             .isLowercase()
//             .not()
//             .isUppercase()
//             .not()
//             .isNumeric()
//             .not()
//             .isAlpha()
//             .not()
//             .matches(/^[A-Za-z0-9]+$/),
//             */
//     ];
// }

// function changePasswordValidator() {
//     return [
//         /* Roi requested to remove 31/05/23
//         body('phone', 1009)// Invalid phone
//             .isMobilePhone('he-IL'),
//         */
//         // This verifies that there is at least one lowercase letter, one uppercase letter, one number character, one special character.
//         // a minimum length and that there are letters in the password
//         body('password', 1008)// Invalid value
//             .exists()
//             .isLength({ min: 8 })
//             .not()
//             .isLowercase()
//             .not()
//             .isUppercase()
//             .not()
//             .isNumeric()
//             .not()
//             .isAlpha()
//             .not()
//             .matches(/^[A-Za-z0-9]+$/),
//     ];
// }

export {
    tokenValidator,
    otpValidator,
    changePasswordValidator,
};
