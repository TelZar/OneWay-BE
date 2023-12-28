import axios from 'axios';
import 'dotenv/config.js';
import { getMonoxMailsModel } from '../models/monox.js';

const config = {
    tenant_id: process.env.tenant_id,
    client_id: process.env.client_id,
    client_secret: process.env.client_secret,
    email_user_id: process.env.email_user_id,
    email_user: process.env.email_user,
};

/**
 * this function return the token for oauth2 connection to outlook
 * source: https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow
 */
async function getToken() {
    try {
        const result = await axios.post(
            `https://login.microsoftonline.com/${config.tenant_id}/oauth2/v2.0/token`,
            {
                client_id: config.client_id,
                client_secret: config.client_secret,
                scope: 'https://graph.microsoft.com/.default',
                grant_type: 'client_credentials',
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        ).catch((e) => {
            console.log('micGraphLog error', e.message);
            return false;
        });

        const accessToken = result.data.access_token;
        if (accessToken) return accessToken;
        return false;
    } catch (error) {
        console.log('getToken error', error.message);
        return false;
    }
}

// const markAsReadMail = async (messageId) => {
// // Generate token
//     const token = await getToken();
//     if (!token) {
//         console.log('markAsReadMail : login.microsoftonline An error occurred generating the token ');
//         return;
//     }
//     try {
//         await axios.patch(
//             `https://graph.microsoft.com/v1.0/users/${config.email_user_id}/messages/${messageId}`,
//             {
//                 isRead: true,
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     'Content-Type': 'application/json',
//                 },
//             },
//         ).then((response) => {
//             console.log('markAsReadMail result', response.status);
//         }).catch((e) => {
//             console.log('markAsReadMail micGraphLog error catch', e.message);
//             return { status: 100, code: 200 };
//         });
//     } catch (err) {
//         console.log('markAsReadMail error: ', err.message);
//     }
// };

const mailFolders = async (folderName) => {
// Generate token
    const token = await getToken();
    if (!token) {
        console.log('mailFolders : login.microsoftonline An error occurred generating the token ');
        return;
    }

    await axios.post(`https://graph.microsoft.com/v1.0/users/${config.email_user_id}/mailFolders`, JSON.stringify({
        displayName: folderName,
        isHidden: false,
    }), {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    }).then((response) => {
        console.log('mailFolders result', response.status);
        return true;
    }).catch((error) => {
        console.log('micGraphLog mailFolders error catch', error.message);
        return { status: 100, code: 200 };
    });
};

const getFolderId = async (folderName) => {
    // Generate token
    const token = await getToken();
    if (!token) {
        return;
    }
    try {
        // Get a list of all mail folders in the user's mailbox
        // const response = await axios.get(`https://graph.microsoft.com/v1.0/users/${config.email_user_id}/mailFolders?$select=id,displayName`, {
        //     headers: {
        //         Authorization: `Bearer ${token}`,
        //         'Content-Type': 'application/json',
        //     },
        // });
        // // Find the folder with the desired name
        // const folder = response.data.value.find((f) => f.displayName === folderName);
        // if (!folder) {
        //     console.log(`Folder ${folderName} not found`);
        //     return null;
        // }
        // console.log(`Folder ${folderName} ID is ${folder.id}`);
        // return folder.id;

        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/users/${config.email_user_id}/mailFolders`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        const jerusalemBankFolder = response.data.value.find((folder) => folder.displayName === 'JerusalemBank');
        if (!jerusalemBankFolder) {
            throw new Error('Folder not found');
        }

        const destinationId = jerusalemBankFolder.id;
        return destinationId;
    } catch (error) {
        console.log('micGraphLog getFolderId error catch', error.message);
        throw error;
    }
};

const moveEmailToFolder = async (messageId, folderId) => {
    // Generate token
    const token = await getToken();
    if (!token) {
        return;
    }
    let newMessageId;
    try {
        await axios.post(
            `https://graph.microsoft.com/v1.0/users/${config.email_user_id}/messages/${messageId}/move`,
            {
                destinationId: 'AAMkADc1OTU2OTlmLWVlMzctNGY5YS04YjFiLTk2MWIzZmFhOTlkYgAuAAAAAACd_FtMUhZqQLXZkFL1P2VAAQBANLMU9BSuTIdV3hYHv_N4AAAQvrlrAAA=',
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        ).then((response) => {
            newMessageId = response.data.id;
            return newMessageId;
        }).catch((e) => {
            console.log('moveEmailToFolder micGraphLog error catch', e.message);
            return { status: 100, code: 200 };
        });
        console.log(`Email with ID ${messageId} moved to folder with ID ${folderId}`);
        return newMessageId;
    } catch (error) {
        console.log('micGraphLog moveEmailToFolder error catch', error.message);
        throw error;
    }
};

const deleteMails = async (messages, token) => {
    if (messages.length > 0) {
        for (const message of messages) {
            // Delete mail from inbox
            await axios.delete(`https://graph.microsoft.com/v1.0/users/${config.email_user_id}/mailFolders/inbox/messages/${message.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }).catch((error) => {
                console.log('deleteMails error', error.message);
            });
        }
    }
};

const getFolderMessages = async (folderId) => {
    // Generate token
    const token = await getToken();
    if (!token) {
        return;
    }
    try {
        // Get all the messages in the specified folder
        const response = await axios.get(`https://graph.microsoft.com/v1.0/users/${config.email_user_id}/mailFolders/${folderId}/messages`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        console.log(`Found ${response.data.value.length} messages in folder ${folderId}`);
        return response.data.value;
    } catch (error) {
        console.log('micGraphLog getFolderMessages error catch', error.message);
        throw error;
    }
};

const getMail = async () => {
    // Generate token
    const token = await getToken();
    if (!token) {
        console.log('getMail : login.microsoftonline An error occurred generating the token ');
        return;
    }

    // Get messages from mail inbox
    // Api to get unread mails: https://graph.microsoft.com/v1.0/users/${config.email_user_id}/mailFolders/inbox/messages?$filter=isRead ne true&$count=true
    const fetchMessages = await axios.get(`https://graph.microsoft.com/v1.0/users/${config.email_user_id}/mailFolders/inbox/messages?$top=1000`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })
        .catch((error) => {
            console.log('getMail error ', error.message);
        });

    // If there messages in inbox
    const finalArr = [];
    if (fetchMessages.data.value.length > 0) {
        for (const message of fetchMessages.data.value) {
            let source_destinations = [];
            const errors = [];
            let isSuccess = true;
            const messageId = message.id;
            const from = message.from.emailAddress.address;
            const to = message.toRecipients;
            let msg = message.body.content;
            const { subject } = message;

            // Validate destinations
            // Set destinations by email type (etc. subject: 0528123456 vs. to: 0528123456@019mobile.co.il)
            if (to[0].emailAddress.address === config.email_user) {
                source_destinations = message.subject.replace(/\s/g, '').split(',');
            } else {
                to.forEach((element) => {
                    source_destinations.push(element.emailAddress.address.split('@')[0]);
                });
                msg = message.subject;
            }

            // Validate msg length
            if (msg.length === 0 || msg.length > 1005) {
                if (msg.length === 0) errors.push('Body should not be empty');
                else errors.push('The message is too long');
                isSuccess = false;
            }

            // Push to array
            finalArr.push({
                messageId,
                from,
                subject,
                msg,
                isSuccess,
                errors,
            });
            // await markAsReadMail(messageId);
        }

        // Delete mails on finish
        // await deleteMails(fetchMessages.data.value, token);
    }

    const data = await getMonoxMailsModel(finalArr);

    // Return response
    return { status: 200, data };
};

const sendFirstMail = async (email, contentTypeBody = 'HTML') => {
    console.log('sendMail msg', email.body);
    try {
    // Generate token
        const token = await getToken();
        if (!token) {
            console.log('sendMail : login.microsoftonline An error occurred generating the token ');
            return;
        }

        await axios.post(
            `https://graph.microsoft.com/v1.0/users/${config.email_user_id}/sendMail`,
            {
                message: {
                    subject: email.subject,
                    body: {
                        contentType: contentTypeBody,
                        content: email.body,
                    },
                    toRecipients: email.to.map((emailAddress) => ({
                        emailAddress: {
                            address: emailAddress,
                        },
                    })),
                    ccRecipients: email.cc ? email.cc.map((emailAddress) => ({
                        emailAddress: {
                            address: emailAddress,
                        },
                    })) : undefined,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        )
            .then((response) => {
                console.log('sendMail result', response.status);
            }).catch((e) => {
                console.log('micGraphLog error catch', e.message);
                return { status: 100, code: 200 };
            });
    } catch (error) {
        console.log('catch sendMail error: ', error.message);
        return { status: 400, code: 200 };
    } finally {
        console.log('sendMail finally');
        return { status: 200, code: 200 };
    }
};

const sendReplyMail = async (email, messageId, folderId, contentTypeBody = 'HTML') => {
    try {
        // Generate token
        const token = await getToken();
        if (!token) {
            console.log('sendReplyMail : login.microsoftonline An error occurred generating the token ');
            return;
        }

        await axios.post(
            `https://graph.microsoft.com/v1.0/users/${config.email_user_id}/mailFolders/${folderId}/messages/${messageId}/reply`,
            {
                message: {
                    toRecipients: email.to.map((emailAddress) => ({
                        emailAddress: {
                            address: emailAddress,
                        },
                    })),
                },
                comment: email.body,
                contentType: contentTypeBody,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        )
            .then((response) => {
                console.log('sendReplyMail result', response.status);
            }).catch((e) => {
                console.log('sendReplyMail micGraphLog error catch', e.message);
                return { status: 100, code: 404 };
            });
    } catch (error) {
        console.log('catch sendReplyMail error: ', error.message);
        return { status: 400, code: 200 };
    } finally {
        console.log('sendReplyMail finally');
        return { status: 200, code: 200 };
    }
};

const sendMail = async (email, messageId = null, folderId = null, contentTypeBody = 'HTML') => {
    let data;
    console.log('sendMail messageId: ', messageId);
    console.log('sendMail folderId: ', folderId);
    if (messageId && folderId) data = await sendReplyMail(email, messageId, folderId, contentTypeBody);
    else data = await sendFirstMail(email, contentTypeBody);
    return data;
};

export {
    mailFolders,
    sendMail,
    getMail,
    getFolderId,
    moveEmailToFolder,
    getFolderMessages,
};
