import { insertLogger } from './logger.js';

// eslint-disable-next-line default-param-last
const apiResponse = function (req, data = {}, dataForLog = 'success') {
    let type = 'INFO';
    try {
        switch (data.status) {
        case 500:// Error server/DB
            type = 'FATAL';
            break;
        case 404:// Not found
        case 400:// Validation
        case 401:// Authentication
            type = 'ERROR';
            break;
        default:
            type = 'INFO';
        }
        // Insert response into LOG_ACTIVITY table
        insertLogger({
            type, code: data.status, data: data.data, end_point: req.originalUrl, logTitle: dataForLog, req, typeLog: 1,
        });
        return data.data;
    } catch (err) {
        err.message = `apiResponse-> ${err.message}`;
        throw err;
    }
};

export {
    apiResponse,
};
