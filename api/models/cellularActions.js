import oracledb from 'oracledb';
import axios from 'axios';
import dbQuery from '../db/connect.js';
import { camelCaseKeys } from '../utils/helper.js';

// this function get iccid and return cursor with the main details of the si
const getSimDetailsModel = async (iccidArray, type = 1) => {
    try {
        const sql = 'begin :result := bya.get_sim_details(p_arr => :obj, p_type => :p_type); end;';
        const bind = {
            p_type: type,
            objectName: 'bya.arr_varchar',
            obj: iccidArray,
        };
        return await dbQuery(sql, bind, oracledb.CURSOR);
    } catch (err) {
        err.message = `getSimDetails-> ${err.message}`;
        throw (err);
    }
};

const getEsimNumerModel = async (data = {}) => {
    try {
        const sql = 'begin blng.esim_update(in_type => :in_type, in_msisdn => :in_msisdn, in_iccid => :in_iccid, out_qr_key => :out_qr_key, out_qr_url => :out_qr_url, out_status => :out_status);end;';
        const bind = {
            in_type: data.type ? data.type : 1, // iccid number
            in_msisdn: { type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: data.phone ? Number(data.phone) : 0 },
            in_iccid: { type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: data.iccid ? data.iccid : '0' },
            out_qr_key: { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            out_qr_url: { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            out_status: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        };
        return await dbQuery(sql, bind, '', 'proc');
    } catch (err) {
        err.message = `getEsimNumerModel-> ${err.message}`;
        throw (err);
    }
};

const sendIccidToCardCentric = async (request) => {
    let data = {};
    try {
        const javaData = JSON.stringify(request);
        await axios.post('https://esim.019mobile.co.il:7777', javaData, {
            headers: {
                res_type: 'json',
            },
        })
            .then((response) => {
                data = response.data;
            });
    } catch (err) {
        err.message = `sendIccidToCardCentric-> ${err.message}`;
        throw err;
    }
    return data;
};

const getNewTzNumberModel = async (count) => {
    try {
        const sql = `begin sales_pkg.retrieve_free_numbers(p_count => :p_count,
                                                          p_res => :p_res);end;`;
        const bind = {
            p_count: { type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: count },
            p_res: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
        };
        const result = await dbQuery(sql, bind, '', 'proc');
        return { count: result.p_count, result: camelCaseKeys(result.p_res) };
    } catch (err) {
        err.message = `getNewTzNumberModel-> ${err.message}`;
        throw err;
    }
};

const getsubscriberEsimLink = async (subscriberId) => {
    try {
        const res = {};
        const sql = 'begin :result := get_esim_link(p_subscriber_id => :p_subscriber_id);end;';
        const bind = {
            p_subscriber_id: subscriberId,
        };
        res.activationLink = await dbQuery(sql, bind, oracledb.STRING);
        return res;
    } catch (err) {
        err.message = `getsubscriberEsimLink-> ${err.message}`;
        throw err;
    }
};

const getHlrProductModel = async () => {
    try {
        const sql = 'begin :result := blng.HLR_Actions.get_HLR_product(); end;';
        const bind = {};
        const resultDB = await dbQuery(sql, bind, oracledb.CURSOR);
        return resultDB;
    } catch (err) {
        err.message = `getHlrProductModel-> ${err.message}`;
        throw err;
    }
};

const roamingCallFilteringModel = async (params) => {
    try {
        const {
            subscriberId, accessCode, agentId,
        } = params;
        const sql = `begin :result := blng.HLR_Actions.Add_Roaming_Incoming_PIN( p_subscriber_id => :p_subscriber_id,
          p_action_id => :p_action_id,
          P_PIN  => :P_PIN,
          P_user_id  => :P_user_id ); end;`;
        const bind = {
            p_subscriber_id: subscriberId,
            p_action_id: accessCode ? 1 : 4,
            P_PIN: accessCode,
            P_user_id: agentId,
        };
        const resultDB = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res: resultDB };
    } catch (err) {
        err.message = `roamingCallFilteringModel-> ${err.message}`;
        throw err;
    }
};

const getRoamingPinModel = async (params) => {
    try {
        const {
            subscriberId,
        } = params;
        const sql = 'begin :result := blng.HLR_Actions.Get_Roaming_PIN( p_subscriber_id => :p_subscriber_id ); end;';
        const bind = {
            p_subscriber_id: subscriberId,
        };
        const resultDB = await dbQuery(sql, bind, oracledb.NUMBER);
        return resultDB;
    } catch (err) {
        err.message = `getRoamingPinModel-> ${err.message}`;
        throw err;
    }
};

const setHlrProductModel = async (params) => {
    try {
        const {
            subscriberId, cellularActionId,
        } = params;
        const sql = 'begin :result := blng.HLR_Actions.Set_HLR_product(p_subscriber_id => :p_subscriber_id, p_action_id => :p_action_id); end;';
        const bind = {
            p_subscriber_id: Number(subscriberId),
            p_action_id: Number(cellularActionId),
        };
        const resultDB = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res: resultDB };
    } catch (err) {
        err.message = `setHlrProductModel-> ${err.message}`;
        throw err;
    }
};

const setImsiInHLRModel = async (phoneNumber, iccidNumber) => {
    const sql = `begin :result := BLNG.inno_hlr_set_imsi(p_phone => :p_phone,
                                                         p_new_iccid => :p_new_iccid);end;`;
    const bind = {
        p_phone: phoneNumber,
        p_new_iccid: `${iccidNumber}`,
    };
    const res = await dbQuery(sql, bind, oracledb.STRING);// const updatrAzI
    return res;
};

const callForwardingModel = async (params) => {
    try {
        const {
            subscriberId, agentId, noReply, cfu_obj,
        } = params;
        const sql = `begin :result := blng.HLR_Actions.SetMultiCFU(p_subscriber_id => :p_subscriber_id,
          p_wait_sec => :p_wait_sec,
          p_user_id  => :p_user_id,
          p_obj => :obj ); end;`;
        const bind = {
            p_subscriber_id: subscriberId,
            p_wait_sec: noReply.forwardingAfterTime || null,
            p_user_id: agentId,
            objectName: 'blng.cfu_arr_obj',
            obj: cfu_obj,
        };
        const resultDB = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res: resultDB };
    } catch (err) {
        err.message = `callForwardingModel-> ${err.message}`;
        throw err;
    }
};

const simReplaceModel = async (params) => {
    try {
        const {
            subscriberId, simIccid, needPayment, agentId, activation, simTypeId,
        } = params;
        const sql = `begin blng.hlr_actions.changesim(p_type => :p_type,
                        p_subscriber_id => :p_subscriber_id,
                        p_user_id => :p_user_id,
                        p_iccid => :p_iccid,
                        p_immediately => :p_immediately,
                        p_2charge => :p_2charge,
                        p_res => :p_res,
                        p_res_cur => :p_res_cur); end;`;
        const bind = {
            p_type: simTypeId, //  1 - Regular SIM, 2 - get eSIM, 3 - Attach eSIM
            p_subscriber_id: subscriberId,
            p_user_id: agentId,
            p_iccid: simIccid || null,
            p_immediately: activation ? 1 : 0,
            p_2charge: needPayment ? 1 : 0,
            p_res: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
            p_res_cur: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
        };
        const resultDB = await dbQuery(sql, bind, '', 'proc');
        return resultDB;
    } catch (err) {
        err.message = `simReplaceModel-> ${err.message}`;
        throw err;
    }
};

const updateSimInDBModel = async (phoneNumber, imsiNubmer, subscriberId, hlrMSISDN) => {
    const sql = `begin :result := BLNG.UPDATE_AZI_SIM(p_phone => :p_phone,
                                                     p_IMSI => :p_IMSI,
                                                     p_subscriberId => :p_subscriberId,
                                                     p_action_type => :p_action_type);end;`;
    const bind = {
        p_phone: phoneNumber,
        p_IMSI: imsiNubmer,
        p_subscriberId: subscriberId,
        p_action_type: hlrMSISDN,
    };
    const res = await dbQuery(sql, bind, oracledb.STRING);// const updatrAzI
    return res;
};

const getCallForwardingUserInfoModel = async (params) => {
    try {
        const {
            subscriberId,
        } = params;
        const sql = 'begin :result := blng.HLR_Actions.GetCFU_info(p_subscriber_id => :p_subscriber_id); end;';
        const bind = {
            p_subscriber_id: subscriberId,
        };
        const resultDB = await dbQuery(sql, bind, oracledb.CURSOR);
        return resultDB;
    } catch (err) {
        err.message = `getCallForwardingUserInfoModel-> ${err.message}`;
        throw err;
    }
};

const roamingToJordanEgyptModel = async (params) => {
    // call this function only if want's to add Egypt Jordan! not for closing
    try {
        const {
            subscriberId, agentId,
        } = params;
        const sql = `begin :result := blng.HLR_Actions.Add_Egypt_Jordan(p_subscriber_id => :p_subscriber_id,
         p_action_id => :p_action_id,
         p_user_id => :p_user_id); end;`;
        const bind = {
            p_subscriber_id: subscriberId,
            p_action_id: 1, // 1 is for Add Egypt Jordan. 2 is for close but it's not available action
            p_user_id: agentId,
        };
        const resultDB = await dbQuery(sql, bind, oracledb.NUMBER);
        return resultDB;
    } catch (err) {
        err.message = `roamingToJordanEgyptModel-> ${err.message}`;
        throw err;
    }
};

export {
    getSimDetailsModel,
    getEsimNumerModel,
    sendIccidToCardCentric,
    getNewTzNumberModel,
    getsubscriberEsimLink,
    getHlrProductModel,
    roamingCallFilteringModel,
    setHlrProductModel,
    setImsiInHLRModel,
    callForwardingModel,
    simReplaceModel,
    updateSimInDBModel,
    getCallForwardingUserInfoModel,
    getRoamingPinModel,
    roamingToJordanEgyptModel,
};
