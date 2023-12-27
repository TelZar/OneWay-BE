import oracledb from 'oracledb';
import dbQuery from '../db/connect.js';

const addCallSummary = async (body, params = {}) => {
    try {
        const sql = `begin bya.add_call_summary(p_agent_id => :p_agent_id,
            p_entity_type => :p_entity_type,
            p_entity_id => :p_entity_id,
            p_reason => :p_reason,
            p_remark => :p_remark,
            p_parent_remark_event_id => :p_parent_remark_event_id,
            p_owner_id => :p_owner_id,
            p_id => :p_id,
            p_status => :p_status,
            p_message_id => :p_message_id,
            p_res => :p_res); end;`;
        const bind = {
            p_agent_id: body.agentId,
            p_entity_type: body.type, // customers/products
            p_entity_id: Object.keys(params).length === 0 ? body.entityID : params.custPkId, // cust_pk_id of customer in case of customer. product_id in case product
            p_reason: body.action, // reason from telzar_app.reason
            p_remark: body.remark, // reason
            p_parent_remark_event_id: body.parentId, // null if first comments
            p_owner_id: body.ownerId, // reason groupE
            p_id: body.id ? body.id : -1,
            p_status: body.status ? body.status : 0,
            p_message_id: body.message_id ? body.message_id : '',
            p_res: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        };
        return await dbQuery(sql, bind, '', 'proc');
    } catch (err) {
        err.message = `addCallSummary-> ${err.message}`;
        throw err;
    }
};

const getCallSummaryOracle = async (body, params) => {
    try {
        const sql = `begin bya.get_call_summary(p_searched_by => :p_searched_by, p_cust_pk_id => :p_cust_pk_id, p_agent_id => :p_agent_id, p_owner_id => :p_owner_id,
                        p_query_size => :p_query_size, p_seq => :p_seq, p_cursor => :data);end;`;
        const bind = {
            p_searched_by: body.agentId,
            p_cust_pk_id: params.custPkId ? params.custPkId : '',
            p_agent_id: params.userId ? params.userId : '',
            p_owner_id: body.ownerId ? body.ownerId : '',
            p_query_size: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
            p_seq: { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            data: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
        };
        return await dbQuery(sql, bind, '', 'proc');
    } catch (err) {
        err.message = `getCallSummaryOracle-> ${err.message}`;
        throw (err);
    }
};

const getCallSummaryMySql = async (data) => {
    try {
        let res = [];
        let count = 0;
        const sql = 'call get_all_summary(:p_seq, :p_searched_by)';
        const bind = {
            p_seq: data.p_seq,
            p_searched_by: data.searchedBy,
        };
        while (count < data.p_query_size && count < 1000) {
            res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
            count = res.length;
        }
        return res;
    } catch (err) {
        err.message = `getCallSummaryMySql-> ${err.message}`;
        throw (err);
    }
};

const checkDataExistsInMySQL = async (data) => {
    try {
        const sql = 'call check_summary_partition(:p_partition, :p_searchedBy)';
        const bind = {
            p_partition: data.partition,
            p_searchedBy: data.agentId,
        };
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return res[0].countRow;
    } catch (err) {
        err.message = `checkDataExistsInMySQL-> ${err.message}`;
        throw (err);
    }
};

export {
    addCallSummary,
    getCallSummaryOracle,
    getCallSummaryMySql,
    checkDataExistsInMySQL,
};
