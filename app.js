import express from 'express';
import cors from 'cors';
// import cron from 'cron';
import { checkTokenMiddleware } from './api/middlewares/checkAuth.js';
import { AppError, setFormatValidErr } from './api/utils/error.js';
import { errorHandler } from './api/middlewares/errorHandler.js';
import systemRouter from './api/routes/system.js';
import authRouter from './api/routes/auth.js';
import meRouter from './api/routes/me.js';
import permissionsRouter from './api/routes/permissions.js';
import transactionRouter from './api/routes/transactions.js';
import customerRouter from './api/routes/customers.js';
import searchRouter from './api/routes/search.js';
import productsRouter from './api/routes/products.js';

// import { DeleteFiles } from './api/utils/sftp.js';
import { insertLogger } from './api/utils/logger.js';

const app = express();

// Setting the CORS headers on an HTTP response: any domain is allowed to make requests
app.use((req, res, next) => {
    insertLogger({
        end_point: 'bya/api',
        logTitle: 'bya request method&originalUrl',
        data: `${req.method} ${req.originalUrl}`,
        type: 'INFO',
        code: 1,
    });
    // insertLogger({
    //     end_point: 'bya/api',
    //     logTitle: 'bya request host',
    //     data: `${req.get('host')}`,
    //     type: 'INFO',
    //     code: 1,
    // });
    // insertLogger({
    //     end_point: 'bya/api',
    //     logTitle: 'bya req.headers.authorization',
    //     data: req.headers.authorization,
    //     type: 'INFO',
    //     code: 1,
    // });
    // insertLogger({
    //     end_point: 'bya/api',
    //     logTitle: 'bya req.body',
    //     data: req.body,
    //     type: 'INFO',
    //     code: 1,
    // });
    res.header('Access-Control-Allow-Origin', 'backbya.019mobile.co.il');
    // res.header('Access-Control-Expose-Headers', 'Authorization, Set-Cookie');
    // res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        next(new AppError(500, setFormatValidErr(3007)));// Inappropriate method
    }
    next();
});
const allowlist = ['backbya.019mobile.co.il', 'localhost:8080'];
const corsOptionsDelegate = (req, callback) => {
    let corsOptions;
    if (allowlist.indexOf(req.get('host')) !== -1) {
        corsOptions = {
            origin: true,
            optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
            credentials: true,
        }; // reflect (enable) the requested origin in the CORS response
        callback(null, corsOptions);
    } else {
        corsOptions = { origin: false }; // disable CORS for this request
        callback(new AppError(404, setFormatValidErr(3036)), corsOptions); // callback expects two parameters: error and options // Cors error
    }
};

app.use(express.json());
app.use(cors(corsOptionsDelegate));

// Routes
app.use('/system', systemRouter);
app.use('/auth', checkTokenMiddleware, authRouter);
app.use('/me', checkTokenMiddleware, meRouter);
app.use('/permissions', checkTokenMiddleware, permissionsRouter);
app.use('/customers', checkTokenMiddleware, customerRouter);
app.use('/search', checkTokenMiddleware, searchRouter);
app.use('/products', checkTokenMiddleware, productsRouter);
app.use('/transactions', checkTokenMiddleware, transactionRouter);
app.use((req, res, next) => {
    next(new AppError(404, setFormatValidErr(3005)));
});

app.use(errorHandler);
//
// const CronJobDeleteFiles = new cron.CronJob('0 0 * * *', (() => { // Every day at 00:00 o'clock
//     DeleteFiles();
// }));
// // CronJobDeleteFiles.start();
//
// const CronJobGetMails = new cron.CronJob('* * * * *', (() => { // Every minute
//     getMail();
// }));
// CronJobGetMails.start();

export default app;
