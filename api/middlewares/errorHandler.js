import { AppError, setFormatValidErr } from '../utils/error.js';
import { apiResponse } from '../utils/apiJson.js';

const titleError = (code, msg) => {
    let res;
    switch (code) {
    case 500:
        if (msg.includes('ORA') || msg.includes('Mysql')) code = 3002;// DB error
        else code = 3003;// Server error
        res = setFormatValidErr(code);
        break;
    default:
        res = msg;
    }
    return res;
};

const errorHandler = (error, req, res, next) => {
    try {
        let response;
        if (error instanceof AppError) {
            response = apiResponse(
                req,
                { status: error.errorCode, data: titleError(error.errorCode, error.message) },
                error.message,
            );
        }
        next(res.status(error.errorCode).send(response));
    } catch (err) {
        // console.log('******', err);
        err.message = `errorHandler-> ${err.message}`;
        next(res.status(415).send(setFormatValidErr(3004)));// The media format of the requested data is not supported by the server
    }
};
export {
    errorHandler,
};
