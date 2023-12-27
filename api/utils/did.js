import axios from 'axios';
import { axiosCreate } from './helper.js';
import { insertLogger } from './logger.js';

const sku_id = '63936720-1f53-4f44-883e-305b9858f7c9'; // sku id DEV
// const sku_id = '71cbee9e-f0e4-4641-bc21-7ec9be1742c0'; // sku id for USA - New York
const sandboxKey = 'edep25jbmyrrp74f6bmj8cc58pzznmd6';

const getDIDNumber = async (orderId) => {
    try {
        console.log(orderId);
        axiosCreate();
        let didNumber;
        const url = `https://sandbox-api.didww.com/v3/dids?filter[order.id]=${orderId}`;

        await axios.get(url, {
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json',
                'Api-Key': sandboxKey /* process.env.didKey */,
            },
        })
            .then((response) => {
                console.log(response);
                didNumber = response.data && response.data.data[0] && response.data.data[0].attributes && response.data.data[0].attributes.number
                    ? response.data.data[0].attributes.number // retrieve did number
                    : false;
                console.log('dN =', didNumber);// 19208320094
            });
        return didNumber;
    } catch (err) {
        err.message = `sendToCG-> ${err.message}`;
        throw err;
    }
};

const getDidNumberId = async (didNumber) => {
    try {
        axiosCreate();
        let didNumberId;
        const url = `https://sandbox-api.didww.com/v3/dids?filter[number]=${didNumber}`;

        await axios.get(url, {
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json',
                'Api-Key': sandboxKey /* process.env.didKey */,
            },
        })
            .then((response) => {
                didNumberId = response.data && response.data.data && response.data.data[0] && response.data.data[0].id ? response.data.data[0].id : false; // retrieve did number id
                console.log('DI = ', didNumberId);
            });
        return didNumberId;
    } catch (err) {
        err.message = `getDidNumberId-> ${err.message}`;
        throw err;
    }
};

const getDidNumbersGroup = async () => {
    try {
        axiosCreate();
        let didNumberId;
        // const url = 'https://api.didww.com/v3/dids';
        // const url = 'https://sandbox-api.didww.com/v3/did_groups?include=sku_id';
        const url = 'https://sandbox-api.didww.com/v3/did_groups?include=stock_keeping_units';
        // const url = 'https://sandbox-api.didww.com/v3/did_groups/049780f1-597b-46de-8718-d76cd82e87f1';

        await axios.get(url, {
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json',
                'Api-Key': sandboxKey/* process.env.didKey */,
            },
        })
            .then((response) => {
                // console.log(response.data);
                // console.log(response.data.data[0]);
                didNumberId = response.data;
                // didNumberId = response.data && response.data[0] && response.data[0].id ? response.data[0].id : false; // retrieve did number id
            });
        return didNumberId;
    } catch (err) {
        err.message = `getDidNumberId-> ${err.message}`;
        throw err;
    }
};

const getTrunkId = async (didNumber) => {
    try {
        axiosCreate();
        const name = `URI%20${didNumber}`;
        let trunkId;
        const url = `https://sandbox-api.didww.com/v3/dids?filter[name]=${name}`;

        axios.get(url, {
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json',
                'Api-Key': sandboxKey /* process.env.didKey */,
            },
        })
            .then((response) => {
                trunkId = response.data && response.data[0] && response.data[0].id ? response.data[0].id : false; // retrieve did number id
            });
        return trunkId;
    } catch (err) {
        err.message = `getTrunkId-> ${err.message}`;
        throw err;
    }
};

const deleteDidNumber = async (didId) => {
    try {
        axiosCreate();

        const url = `https://sandbox-api.didww.com/v3/dids/${didId}`;
        const data = {
            data: {
                id: didId,
                type: 'dids',
                attributes: {
                    terminated: true,
                    pending_removal: false,
                    description: 'string',
                    capacity_limit: 1,
                },
            },
        };
        const params = JSON.stringify(data);

        await axios.patch(url, params, {
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json',
                'Api-Key': sandboxKey /* process.env.didKey */,
            },
        })
            .then((response) => {
                console.log(response);
            });
    } catch (err) {
        err.message = `deleteDidNumber-> ${err.message}`;
        throw err;
    }
};

const updateTrunk = async (didId, trunkId) => {
    try {
        axiosCreate();
        const url = `https://sandbox-api.didww.com/v3/dids/${didId}`;
        const details = {
            data: {
                id: didId,
                type: 'dids',
                relationships: {
                    voice_in_trunk: {
                        data: {
                            type: 'voice_in_trunks',
                            id: trunkId,
                        },
                    },
                },
            },
        };
        const params = JSON.stringify(details);
        await axios.patch(url, params, {
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json',
                'Api-Key': sandboxKey /* process.env.didKey */,
            },
        })
            .then((response) => {
                console.log(response.data);
            })
            .catch((error) => {
                console.log('error =', error.response);
                return false;
            });
        return true;
    } catch (err) {
        err.message = `updateTrunk-> ${err.message}`;
        throw err;
    }
};

const createOrder = async () => {
    try {
        return 'f5f7ffd4-d4cd-438a-8579-5f68243a5d37';
        console.log('55');
        const details = {
            data: {
                type: 'orders',
                attributes: {
                    allow_back_ordering: true,
                    items: [{
                        type: 'did_order_items',
                        attributes: {
                            qty: 1,
                            sku_id,
                        },
                    }],
                },
            },
        };
        const params = JSON.stringify(details);
        axiosCreate();
        const url = 'https://sandbox-api.didww.com/v3/orders';
        let orderId;

        await axios.post(url, params, {
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json',
                'Api-Key': sandboxKey /* process.env.didKey */,
            },
        })
            .then((response) => {
                orderId = response.data && response.data.data && response.data.data.id ? response.data.data.id : false; // retrieve order id
                console.log('order = ', orderId);
            })
            .catch((error) => {
                console.log('error =', error.response.data);
                return false;
            });
        return orderId;
    } catch (err) {
        err.message = `createOrder-> ${err.message}`;
        throw err;
    }
};

// Attach DID number to israeli number
const attachIsraelNumber = async (trunkId, phone) => {
    try {
        const details = {
            data: {
                id: trunkId,
                type: 'trunks',
                attributes: {
                    configuration: {
                        type: 'sip_configurations',
                        attributes: {
                            username: phone,
                        },
                    },
                },
            },
        };
        const params = JSON.stringify(details);
        axiosCreate();
        const url = 'https://sandbox-api.didww.com/v3/orders';
        let orderId;

        await axios.post(url, params, {
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json',
                'Api-Key': sandboxKey /* process.env.didKey */,
            },
        })
            .then((response) => {
                //    console.log(response);
                orderId = response.data && response.data.id ? response.data.id : false; // retrieve order id
            })
            .catch((error) => {
                console.log('error =', error.response.data);
                return false;
            });
        return orderId;
    } catch (err) {
        err.message = `attachIsraelNumber-> ${err.message}`;
        throw err;
    }
};

const createTrunk = async (didNumber, phone) => {
    try {
        return 'aefaada3-7607-4dca-882f-68f0b5aee340';
        const url = 'https://sandbox-api.didww.com/v3/voice_in_trunks';
        const name = `URI%20${didNumber}`;

        const details = {
            data: {
                type: 'voice_in_trunks',
                attributes: {
                    priority: '1',
                    weight: '65535',
                    capacity_limit: 1,
                    ringing_timeout: 30,
                    name,
                    cli_format: 'raw',
                    cli_prefix: null,
                    description: 'custom description',
                    configuration: {
                        type: 'sip_configurations',
                        attributes: {
                            username: phone,
                            host: '46.31.96.52',
                            codec_ids: [
                                9, 10, 8, 6,
                            ],
                            rx_dtmf_format_id: 1,
                            tx_dtmf_format_id: 1,
                            resolve_ruri: false,
                            auth_enabled: false,
                            auth_user: null,
                            auth_password: null,
                            auth_from_user: null,
                            auth_from_domain: null,
                            sst_enabled: 'false',
                            sst_min_timer: 600,
                            sst_max_timer: 900,
                            sst_refresh_method_id: 1,
                            sst_accept_501: 'true',
                            sip_timer_b: 8000,
                            dns_srv_failover_timer: 2000,
                            rtp_ping: 'false',
                            rtp_timeout: 30,
                            force_symmetric_rtp: 'false',
                            symmetric_rtp_ignore_rtcp: 'false',
                            rerouting_disconnect_code_ids: null,
                            port: 5060,
                            transport_protocol_id: 2,
                            max_transfers: 0,
                            max_30x_redirects: 0,
                            media_encryption_mode: 'disabled',
                            stir_shaken_mode: 'disabled',
                            allowed_rtp_ips: null,
                        },
                    },
                },
            },
        };

        const params = JSON.stringify(details);
        axiosCreate();
        let trunkId;
        await axios.post(url, params, {
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json',
                'Api-Key': sandboxKey /* process.env.didKey */,
            },
        })
            .then((response) => {
                console.log(response.data);
                trunkId = response.data.data.id ? response.data.data.id : false; // retrieve trunk id
                console.log('tI =', trunkId);
            }).catch((error) => {
                console.log('ddt =', error.response);
                console.log('error =', error.response.data);
            });
        // 'aefaada3-7607-4dca-882f-68f0b5aee340'
        return trunkId;
    } catch (err) {
        err.message = `createTrunk-> ${err.message}`;
        throw err;
    }
};
// Create DID
const createNewDIDNumber = async (countryCode = -3) => {
    try {
        const data = {};
        // 1 - Create order
        data.orderId = await createOrder();
        // 2 - Get did number
        if (data.orderId) data.didNumber = await getDIDNumber(data.orderId);
        if (data.didNumber) return data.didNumber;
        return false;
    } catch (err) {
        err.message = `createNewDIDNumber-> ${err.message}`;
        throw err;
    }
};
// Create trunk
const createTrunkForDID = async (didNumber, phone = '') => {
    try {
        const data = {};
        // 1 - create trunk
        data.trunkId = await createTrunk(didNumber, phone);
        // 2 - get did number id
        if (data.trunkId)data.didId = await getDidNumberId(didNumber);
        else {
            insertLogger({
                end_point: 'createTrunkForDID - createTrunk - 1',
                logTitle: `Bug in get create trunk. didNumber = ${didNumber}`,
                type: 'ERROR',
                code: -1,
            });
            return false;
        }
        // 3 - update trunk on did
        if (data.didId) data.updateTrunk = await updateTrunk(data.didId, data.trunkId);
        else {
            insertLogger({
                end_point: 'createTrunkForDID - getDidNumberId - 2',
                logTitle: `Bug in get DIDNumberId. trunkId = ${data.trunkId},  didNumber = ${didNumber}`,
                type: 'ERROR',
                code: -1,
            });
            return false;
        }
        console.log('DU =', data.updateTrunk);
        if (!data.updateTrunk) {
            insertLogger({
                end_point: 'createTrunkForDID - updateTrunk - 3',
                logTitle: `Bug in update trunk didId = ${data.didId},  trunkId = ${data.trunkId}`,
                type: 'ERROR',
                code: -1,
            });
            return false;
        }
        return data.updateTrunk;
    } catch (err) {
        err.message = `createTrunkForDID-> ${err.message}`;
        throw err;
    }
};

const createOrderWithDIDAndTrunk = async () => {
    try {
        const data = {};
        // 1 - Create new DID
        data.didNumber = await createNewDIDNumber();
        // 2 - Create new trunk and attach it
        if (data.didNumber) data.trunkCreated = await createTrunkForDID(data.didNumber);// In fact, you only create a trunk without attaching a number
        else return false;
        if (!data.trunkCreated) return false;
        return true;
    } catch (err) {
        err.message = `createOrderWithDIDAndTrunk-> ${err.message}`;
        throw err;
    }
};
// Attach DID number to israeli number, if phone is not null - attach, else - disconnect
const attachDID = async (didNumber, phone) => {
    try {
        const data = {};
        // 1 - Get trunk Id
        data.trunkId = await getTrunkId(didNumber);
        // 2 - attach
        if (data.trunkId) data.attach = await attachIsraelNumber(data.trunkId, phone);
        else {
            insertLogger({
                end_point: 'attachDID - getTrunk - 1',
                logTitle: `Bug in get trunk Id. didNumber = ${didNumber}, phone = ${phone}`,
                type: 'ERROR',
                code: -1,
            });
            return false;
        }
    } catch (err) {
        err.message = `attachDID-> ${err.message}`;
        throw err;
    }
};
// Attach DID number to israeli number, if phone is not null - attach, else - disconnect
const deleteDid = async (didNumber) => {
    try {
        const data = {};
        // 1 - Get DID Id
        data.didId = await getDidNumberId(didNumber);
        console.log('datad =', data.didId);
        // 2 - return DID to DIDWW company
        if (data.didId) data.dataDeleted = await deleteDidNumber(data.didId);
        else {
            insertLogger({
                end_point: 'deleteDid - Get DID Id - 1',
                logTitle: `Bug in get DID Id. didNumber = ${didNumber}`,
                type: 'ERROR',
                code: -1,
            });
            return false;
        }
        return true;
    } catch (err) {
        err.message = `attachDID-> ${err.message}`;
        throw err;
    }
};

export {
    createOrderWithDIDAndTrunk,
    attachDID,
    getDidNumbersGroup,
    deleteDid,
};
