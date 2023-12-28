import oracledb from 'oracledb';
import { isEmpty } from '../utils/helper.js';
import FILES_PATH_CONFIG from '../config/url.js';
import dbQuery from '../db/connect.js';

const uploadFilesModel = async (req) => {
    try {
        // save hashes, originalName, path & agreement_type in db-mySql that return array of rowId
        // const sql = 'select insert_file(:FILE_PATH,:FILE_ORIGINAL_NAME,:FILE_HASH,:AGREEMENT_TYPE,:CREATED_BY) as id';
        // const bind = {
        //     FILE_PATH: FILES_PATH_CONFIG.ENCRYPTION,
        //     FILE_ORIGINAL_NAME: req.file.originalname,
        //     FILE_HASH: req.hash,
        //     AGREEMENT_TYPE: req.headers.type,
        //     CREATED_BY: req.body.agentId || 407,
        // };
        // const data = await dbQuery(sql, bind, 'rows', '', 'MYSQL');

        const sql = `begin :result := insert_array_file(in_agreement_type => :in_agreement_type,
                               in_file_path => :in_file_path,
                               in_file_name => :in_file_name,
                               in_file_hash => :in_file_hash,
                               in_status => :in_status,
                               in_parts => :in_parts); end;`;
        const bind = {
            in_agreement_type: req.headers.type ? req.headers.type : 1,
            in_file_path: FILES_PATH_CONFIG.SFTP,
            in_file_name: req.file.originalname ? req.file.originalname : '',
            in_file_hash: req.hash ? req.hash : '',
            in_status: req.headers.status ? req.headers.status : 1,
            in_parts: req.headers.parts ? req.headers.parts : 1,
        };
        const data = await dbQuery(sql, bind, oracledb.STRING);

        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `uploadFiles-> ${err.message}`;
        throw err;
    }
};

const testObj = async (req) => {
    try {
        // Define the input object type
        const sql = 'begin :result := test_arr_obj(in_arr_obj => :obj);end;';

        const bind = {
            objectName: 'BYA.NISIM_TEST_ARR_OBJ',
            obj: [{ AAA: ' המלך', BBB: 'בשדה' }, { AAA: 'ברוה ', BBB: 'פורים ' }],
        };
        const data = await dbQuery(sql, bind, oracledb.NUMBER);

        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `testObj-> ${err.message}`;
        throw err;
    }
};

export {
    uploadFilesModel,
    testObj,
};
