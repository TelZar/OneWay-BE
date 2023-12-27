import dbQuery from '../db/connect.js';

const getTemplatesModel = async (moduleId) => { // Include subscribers & files
    try {
        const sql = 'call getTemplatesByModule(:p_module)';
        const bind = { p_module: moduleId };
        const res = await dbQuery(sql, bind, 'rows', '', 'MYSQL');
        return res;
    } catch (err) {
        err.message = `getTemplates-> ${err.message}`;
        throw (err);
    }
};

export {
    getTemplatesModel,
};
