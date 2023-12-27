import { successStatuses } from './error.js';
import { replaceValue } from './helper.js';
import dbQuery from '../db/connect.js';

const forbiddenValues = ['password', 'otp', 'creditCard', 'IDFile', 'documentFront', 'file', 'idNumber', 'number', 'content'];

const insertLogger = async (reqData) => {
    const data = { ...reqData };
    try {
        const sql = `begin bya.write_log(i_severity => :i_severity,
            i_description => :i_description,
            i_object_name => :i_object_name,
            i_log_value_name => :i_log_value_name,
            i_log_value => :i_log_value,
            i_log_group => :i_log_group);end;`;
        const info = {};

        // console.log('data.typeLog: ', data.typeLog);
        // typeLog - 1 => client side request logs, typeLog - 2 => general logs
        // if (data.typeLog === 1) {
        //     // Get request
        //     info.request = data.req.method === 'GET' ? data.req.params : data.req.body;
        //
        //     // Cover forbidden values
        //     replaceValue(info.request, forbiddenValues, '****');
        //
        //     // If the method is 'GET' and the request was successful, we will not save the response due to saving memory
        //     if (!data.req.method === 'GET' && successStatuses.includes(data.status)) info.response = data.data; // Get response
        // }
        // console.log('data.data: ', data.data);
        replaceValue(data.data, forbiddenValues, '****');
        // console.log('data.data after replaceValue: ', data.data);
        let group = data.typeLog === 1 ? 'WEB' : 'SERVER';
        group += global.agentId !== undefined ? `,${global.agentId}` : '';
        const clob = data.typeLog === 1 ? JSON.stringify(info) : typeof data.data === 'object' ? JSON.stringify(data.data) : data.data;
        // Cover forbidden values

        const bind = [data.type ? data.type : 'INFO', // Severity level, default -'INFO'
            clob,
            data.end_point ? data.end_point : '', // Path
            typeof data.logTitle === 'object' ? JSON.stringify(data.logTitle) : data.logTitle, // Error detail
            data.code ? data.code : 1, // Status HTTP or code general logs
            group];// Group
        dbQuery(sql, bind, '', 'proc');
    } catch (err) {
        err.message = `insertLogger-> ${err.message}`;
        throw err;
    }
};

export {
    insertLogger,
};
