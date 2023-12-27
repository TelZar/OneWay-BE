import { body } from 'express-validator';

function notificationsValidator() {
    return [
        body('read_all', 1008)
            .if((value, { req }) => ['DELETE'].includes(req.method))
            .if(body('notification_ids').equals([]))
            .isBoolean()
            .exists(),
        body('notification_ids', 1008)
            .if((value, { req }) => ['DELETE'].includes(req.method))
            .if(body('read_all').equals(false))
            .isArray()
            .exists(),
    ];
}

export {
    notificationsValidator,
};
