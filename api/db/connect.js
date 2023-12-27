import oracledb from 'oracledb';
import mysql from 'mysql2/promise';
import 'dotenv/config.js';
import { getRandomId } from '../utils/helper.js';
import { insertLogger } from '../utils/logger.js';

const pools = {};

export const initDb = async (dbName = 'BYA') => {
    try {
        if (dbName === 'BYA') {
            pools[dbName] = await oracledb.createPool({
                user: process.env.BYAName,
                password: process.env.BYAPassword,
                connectString: process.env.BYAAddress,
                poolAlias: getRandomId(),
                // poolMax: 20, // TODO: increase workers thread
                connectionLimit: 50,
                poolTimeout: 60, // Maximum time (in seconds) a connection can be idle in the pool
            });
        } else if (dbName === 'MYSQL') {
            pools[dbName] = await mysql.createPool({
                host: process.env.BYAMysqlAddress,
                user: process.env.BYAMysqlName,
                password: process.env.BYAMysqlPassword,
                database: 'BYA',
                waitForConnections: true,
                connectionLimit: 50,
                queueLimit: 0,
                namedPlaceholders: true,

            });
        }
    } catch (err) {
        err.message = `initDb->  ${err.message}`;
        throw err;
    }
};

const runOracle = async (dbName, sql, bind = [], returnType = oracledb.NUMBER, functionType = 'func') => {
    let connection;
    // let timeoutId; // Variable to store the timeout ID

    try {
        oracledb.fetchAsString = [oracledb.CLOB]; // Permission to get clob field from oracle

        connection = await pools[dbName].getConnection();
        // timeoutId = setTimeout(() => {
        //     // If the timeout is reached, release the connection and reject the promise
        //     if (connection) {
        //         connection.release().catch(console.error);
        //     }
        //     throw new AppError(400, setFormatValidErr(3022));
        // }, 60000); // Timeout of 30 seconds (30,000 milliseconds)

        if (bind.objectName) {
            const ObjType = await connection.getDbObjectClass(bind.objectName);
            delete bind.objectName;
            bind.obj = {
                type: ObjType,
                dir: oracledb.BIND_IN,
                val: new ObjType(bind.obj),
            };
        }
        let res;
        let resultSet = false;
        switch (functionType) {
        case 'func':
            resultSet = true;
            bind.result = { dir: oracledb.BIND_OUT, type: returnType, maxSize: 10000 };
            res = await connection.execute(
                sql,
                bind,
                { autoCommit: true, resultSet, outFormat: oracledb.OUT_FORMAT_OBJECT },
            );
            res = res.outBinds.result;
            // oracledb.CURSOR = 2021
            if (returnType === 2021) res = await res.getRows();
            break;
        case 'proc':
            res = await connection.execute(
                sql,
                bind,
                { autoCommit: true, resultSet, outFormat: oracledb.OUT_FORMAT_OBJECT },
            );
            res = res.outBinds;
            for (const key in bind) {
                if (bind.hasOwnProperty(key) && bind[key] !== undefined && bind[key].type === 2021) {
                    res[key] = await res[key].getRows();
                }
            }
            break;
        case 'pkg':
            res = await connection.execute(
                sql,
                bind,
            );
            res = res.outBinds.result;
            break;
        default:
            res = await connection.execute(
                sql,
                bind,
            );
        }
        if (res === -20004) res = 20004; // If no changes - for us it is not error
        return res;
    } catch (err) {
        console.log(err.message);
        insertLogger({
            end_point: 'connect',
            logTitle: 'connect oracle error sql',
            data: sql,
            type: 'INFO',
            code: 1,
        });
        insertLogger({
            end_point: 'connect',
            logTitle: 'connect oracle error bind',
            data: bind,
            type: 'INFO',
            code: 1,
        });
        insertLogger({
            end_point: 'connect',
            logTitle: 'connect oracle error',
            data: err.message,
            type: 'INFO',
            code: 1,
        });
        err.message = `runOracle->  ${err.message}`;
        throw err;
    } finally {
        // clearTimeout(timeoutId);

        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.log(err);
            }
        }
    }
};

export const runMysql = async (dbName = 'BYA', sql = '', bind = {}, results = 'rows') => {
    let connection;
    let res;

    try {
        connection = await pools[dbName].getConnection();
        // console.log('Successfully connected to Mysql Database 1');

        res = await connection.execute(
            sql,
            bind,
            (err) => {
                if (err) {
                    console.error(err);
                }
            },

        );

        if (results !== 'out') {
            const first_word = sql.split(/\s+/, 1).join().toLocaleLowerCase();
            switch (first_word) {
            case 'insert':
            case 'update':
            case 'delete':
                results = 'affected';
                break;
            }
        }

        switch (results) {
        case 'rows':
            res = res[0];
            break;
        case 'row':
            res = res[0][0] || false;
            break;

        case 'affected':
            res = res[0].affectedRows;
            break;

        case 'num_rows':
            res = res[0].length;
            break;
        default:
            break;
        }

        return res;
    } catch (err) {
        err.message = `runMysql->  ${err.message}`;
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.release();
            } catch (err) {
                console.error(err);
            }
        }
    }
};
export const dbQuery = async (sql = '', bind = [], returnType = oracledb.NUMBER, functionType = 'func', dbName = 'BYA') => {
    dbName = dbName.toUpperCase();

    // If a pool does not exist, create it
    if (!pools[dbName]) await initDb(dbName);

    switch (dbName) {
    case 'BYA':
        return await runOracle(dbName, sql, bind, returnType, functionType);
    case 'MYSQL':
        return await runMysql(dbName, sql, bind, returnType);
    }
};

export default dbQuery;
