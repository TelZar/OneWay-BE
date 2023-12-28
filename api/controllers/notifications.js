import { getNotificationsModel, markAsReadModel } from '../models/notifications.js';

const getNotifications = async () => {
    try {
        const data = await getNotificationsModel();
        // if (isEmpty(data)) return { status: 404, code: 3006 };// There are no records
        return { status: 200, data: data[0] };
    } catch (err) {
        err.message = `getNotifications-> ${err.message}`;
        throw err;
    }
};

const markAsRead = async (req) => {
    try {
        // if (!req.body.read_all && isEmpty(req.body.notification_ids)) return { status: 400, data: { affected: 0 } };
        const data = await markAsReadModel(req.body);
        return { status: 200, data: { affected: data } };
    } catch (err) {
        err.message = `markAsRead-> ${err.message}`;
        throw err;
    }
};

export {
    getNotifications,
    markAsRead,
};
