import 'dotenv/config';
import oracledb from 'oracledb';
import dbQuery from '../db/connect.js';

const getFilePathModel = async (filesHash = null) => {
    try {
        const FilesHashObj = [];

        Object.values(filesHash).forEach((fileHash) => {
            FilesHashObj.push({
                FILE_HASH: fileHash,
            });
        });

        const sql = 'begin :result := BYA.file_pkg.get_file(file_hash => :obj); end;';
        const bind = {
            objectName: 'BYA.ARR_FILE_HASH_OBJ',
            obj: FilesHashObj,
        };
        const result = await dbQuery(sql, bind, oracledb.CURSOR);
        return result;
    } catch (err) {
        err.message = `getFilePathModel-> ${err.message}`;
        throw (err);
    }
};

const setFilePathModel = async (objectFile) => {
    try {
        const sql = 'begin :result := BYA.file_pkg.create_file(v_file => :obj); end;';
        const bind = {
            objectName: 'BYA.SET_FILE_OBJ',
            obj: objectFile,
        };
        const result = await dbQuery(sql, bind);
        return result;
    } catch (err) {
        err.message = `setFilePathModel-> ${err.message}`;
        throw (err);
    }
};

export {
    getFilePathModel,
    setFilePathModel,
};
