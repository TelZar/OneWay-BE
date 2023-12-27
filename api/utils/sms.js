// Sends SMS to 019sms and returns true/false if succeeded
import axios from 'axios';
import { axiosCreate } from './helper.js';
import { insertLogger } from './logger.js';

export const sendSMS = async function (agent_phone, message) {
    const url = 'https://019sms.co.il/api';// Prod, Be careful when using !!!
    const request = `
<?xml version="1.0" encoding="utf-8"?>
<sms>
    <user>
        <username>${process.env.prodUser}</username>
    </user>
    <source>019BYA</source>
    <destinations>
        <phone>${agent_phone}</phone> 
    </destinations>
    <message>${message}</message>
</sms>`;
    axiosCreate();
    try {
        const status = await axios.post(url, request, {
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                Authorization: `Bearer ${process.env.prodSmsToken}`,
            },
        })
            .then((response) => response.data.status);
        return status === 0;
    } catch (err) {
        insertLogger({
            end_point: 'sendSMS - err',
            logTitle: 'sendSMS err',
            data: err.message(),
            type: 'INFO',
            code: 1,
        });
        return false;
    }
};
