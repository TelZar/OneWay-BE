import oracledb from 'oracledb';
import dbQuery from '../db/connect.js';
import { camelCaseKeys, convertKeysToUpperCaseWithUnderscore } from '../utils/helper.js';

const addCallSummary = async (data) => {
    try {
        const sql = `begin bya.add_call_summary(p_agent_id => :p_agent_id,
            p_entity_type => :p_entity_type,
            p_entity_id => :p_entity_id,
            p_reason => :p_reason,
            p_remark => :p_remark,
            p_parent_remark_event_id => :p_parent_remark_event_id,
            p_owner_id => :p_owner_id,
            p_event_id => :p_id,
            p_status => :p_status,
            p_message_id => :p_message_id,
            p_subscriber_id => :p_subscriber_id,
            p_res => :p_res); end;`;
        const bind = {
            p_agent_id: data.agentId,
            p_entity_type: data.entityId, // Entity type identifier : 1 for customers / 2 - products...
            p_entity_id: data.custPkId, // cust_pk_id of customer in case of customer. product_id in case product
            p_reason: data.eventTypeId, // Event type ID from telzar_app.reason
            p_remark: data.content, // Free text - the content of the documentation
            p_parent_remark_event_id: data.activityId ? data.activityId : '', // null if first comments
            p_owner_id: data.serviceId, // Service Id
            p_id: data.id ? data.id : '', //  if want to 'delete' - to change this event_id status in remark table
            p_status: data.status ? data.status : 0, // when we want to cahnge status of this documentation we add here the status
            p_message_id: data.message_id ? data.message_id : '', // mail (JB)
            p_subscriber_id: data.subscriberId,
            p_res: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        };
        return await dbQuery(sql, bind, '', 'proc');
    } catch (err) {
        err.message = `addCallSummary-> ${err.message}`;
        throw err;
    }
};

const getSummaryFromOracle = async (data, activitiesId = []) => {
    try {
        data.custPkId = Number(data.custPkId);
        // Default data to be sent to db
        const request_details = {
            CUST_PK_ID: null, // number
            FROM_DATE: null, // number
            TO_DATE: null, // varchar2(128)
            TEXT: null, // varchar2(128)
            EVENT_TYPE: null, // varchar2(128)
            AGENT_ID: null, // varchar2(128)
            SERVICES: null, // varchar2(128)
            LIMIT: null, // varchar2(128)
            CRM_EVENTS: activitiesId.length > 0 ? activitiesId : data.activityId ? [data.activityId] : [],
            SUBSCRIBER_ID: null,
        };
        const dataUpperCaseWithUnderscore = await convertKeysToUpperCaseWithUnderscore(data);
        // Updating the default data with the set retrieval data
        for (const key in dataUpperCaseWithUnderscore) {
            if (request_details.hasOwnProperty(key)) {
                request_details[key] = dataUpperCaseWithUnderscore[key];
                if (key === 'EVENT_TYPE' || key === 'SERVICES') {
                    request_details[key] = [];
                    request_details[key] = dataUpperCaseWithUnderscore[key].split(',');
                }
                request_details.LIMIT = null;
            }
        }

        const sql = 'begin :result := bya.customers_pkg.get_crm_events(p_obj => :obj, p_type => :p_type); end;'; // itay change here
        const bind = {
            p_type: activitiesId.length > 0 ? 2 : 1,
            objectName: 'bya.crm_events_obj',
            obj: request_details,
        };
        return camelCaseKeys(await dbQuery(sql, bind, oracledb.CURSOR));
    } catch (err) {
        err.message = `getSummaryFromOracle-> ${err.message}`;
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
    getSummaryFromOracle,
    getCallSummaryMySql,
    checkDataExistsInMySQL,
};
