import { body } from 'express-validator';

function shortcutValidator() {
    return [
        // Custom validation for avatar
        body('avatar.icon')
            .if((value, { req }) => ['POST', 'PATCH'].includes(req.method) && req.body.avatar)
            .custom((value, { req }) => {
                if (!value && !req.body.avatar.label) {
                    throw new Error('Either avatar icon or label must be provided');
                }
                return true;
            }),
        body('avatar.label')
            .if((value, { req }) => ['POST', 'PATCH'].includes(req.method) && req.body.avatar)
            .custom((value, { req }) => {
                if (!value && !req.body.avatar.icon) {
                    throw new Error('Either avatar icon or label must be provided');
                }
                return true;
            }),
    ];
}

export {
    shortcutValidator,
};
