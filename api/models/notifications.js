import dbQuery from '../db/connect.js';

const getNotificationsModel = async () => {
    try {
        const sql = 'call BYA.getNotifications;';
        const res = await dbQuery(sql, {}, 'rows', '', 'MYSQL');
        return res;
    } catch (err) {
        err.message = `getNotificationsModel-> ${err.message}`;
        throw (err);
    }
};

const markAsReadModel = async (data) => {
    try {
        let notification_ids = String(data.notification_ids);
        notification_ids = `(${notification_ids})`;
        const sql = 'call markAsRead(:p_all, :p_agent_id, :p_notificationId);';
        const bind = { p_all: data.read_all, p_agent_id: data.agentId, p_notificationId: notification_ids };
        console.log('markAsReadModel bind: ', bind);
        const res = await dbQuery(sql, bind, 'rows', '', 'MYSQL');
        console.log('markAsReadModel res: ', res);
        return res;
    } catch (err) {
        console.log('markAsReadModel err: ', err.message);
        err.message = `markAsReadModel-> ${err.message}`;
        throw (err);
    }
};

export {
    getNotificationsModel,
    markAsReadModel,
};
