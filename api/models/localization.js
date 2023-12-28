import oracledb from 'oracledb';
import dbQuery from '../db/connect.js';
import { isEmpty } from '../utils/helper.js';

const customerFinanceLanguagesModel = async () => { // Include subscribers & files
    try {
        const sql = 'begin :result := get_languages; end;';
        const bind = {};
        const data = await dbQuery(sql, bind, oracledb.CURSOR);
        if (isEmpty(data)) return { status: 404, code: 3006 };// There are no records
        return data;
    } catch (err) {
        err.message = `customerFinanceLanguagesModel-> ${err.message}`;
        throw (err);
    }
};

const systemLanguagesModel = async () => { // Include subscribers & files
    try {
        const sql = 'begin :result := getSystemLanguages; end;';
        const bind = {};
        const data = await dbQuery(sql, bind, oracledb.CURSOR);
        if (isEmpty(data)) return { status: 404, code: 3006 };// There are no records
        return data;
    } catch (err) {
        err.message = `systemLanguagesModel-> ${err.message}`;
        throw (err);
    }
};

export {
    customerFinanceLanguagesModel,
    systemLanguagesModel,
};
