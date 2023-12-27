import 'dotenv/config.js';

export const HOSTS = {
    STORAGE_SERVER: '10.10.190.110',
};

const FILES_PATH_CONFIG = {
    SFTP: '',
    MONOX: '',
    ORACLE: '',
    ENCRYPTION: '',
    SIGNATURE: '',
    UPLOAD: './upload/',
    UPLOAD_INVOICES: './upload/invoices/',
    UPLOAD_CASHBOX_REPORT: './upload/cashbox_report/',
    AGREEMENTS: './upload/agreements/',
    RECEIPTS: './upload/receipts/',
    STORAGE_SERVER: '/mnt/backup2/signed-docs/invoice/BYA/',
    ENCRYPTION_SERVER: 'invoices/',
    ENCRYPTION_SERVER_INVOICES: '/jail/invoices/',
    ENCRYPTION_AGREEMENTS: '/jail/agreements/',
    ENCRYPTION_CASHBOX_REPORT: '/jail/cashbox_report/',
};
console.log('node anvironment: ', process.env.NODE_ENV);

if (process.env.NODE_ENV === 'DEV') {
    FILES_PATH_CONFIG.SFTP = './uploads/';
    FILES_PATH_CONFIG.MONOX = './uploads/monox_customer_files/';
    FILES_PATH_CONFIG.ORACLE = '/db/excel_files/';
    FILES_PATH_CONFIG.ENCRYPTION = './agreements/';
} else {
    FILES_PATH_CONFIG.SFTP = '/var/www/html/buya/uploads/';
    FILES_PATH_CONFIG.MONOX = '/var/www/html/buya/uploads/monox_customer_files/';
    FILES_PATH_CONFIG.ORACLE = '/db/excel_files/';
    FILES_PATH_CONFIG.ENCRYPTION = './agreements/';
    FILES_PATH_CONFIG.SIGNATURE = '/SMTPbya/input/';
    FILES_PATH_CONFIG.UPLOAD = './upload/';
}

export default FILES_PATH_CONFIG;
