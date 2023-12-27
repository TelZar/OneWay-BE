import { check } from 'express-validator';

function filesValidator() {
    return [
        check('type').not().isEmpty().isNumeric()
            .withMessage('type is required'),
    ];
}

export {
    filesValidator,
};
