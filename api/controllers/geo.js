import {
    getCountryModel, getCityModel, getStreetModel, getCurrenciesModel,
    dataWithNetworkInformation, getRatesCountriesOrRegionsModel,
} from '../models/geo.js';
import { isEmpty } from '../utils/helper.js';

const getCountry = async (countryId, query) => {
    try {
        const data = await getCountryModel(countryId, query);
        if (isEmpty(data)) return { status: 404, code: 3006 };// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `getCountry-> ${err.message}`;
        throw err;
    }
};

const getCity = async (countryId, cityId) => {
    try {
        const data = await getCityModel(countryId, cityId);
        if (isEmpty(data)) return { status: 404, code: 3006 };// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `getCity-> ${err.message}`;
        throw err;
    }
};

const getStreet = async (countryId, cityId, streetId) => {
    try {
        const data = await getStreetModel(countryId, cityId, streetId);
        if (isEmpty(data)) return { status: 404, code: 3006 };// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `getStreet-> ${err.message}`;
        throw err;
    }
};

// const getPostalCode = async (req) => {
//     try {
//         const postalCodes = await getPostalCodeModel(req.query);
//         return postalCodes;
//     } catch (err) {
//         err.message = `getPostalCode-> ${err.message}`;
//         throw err;
//     }
// };

const getRatesCountriesOrRegions = async (req) => {
    try {
        // Integrity checks
        if ((req.query.hasProducts && !(/^[01]$/.test(req.query.hasProducts)))
            || (req.query.limit && !(/^[1-9]\d*$/.test(req.query.limit)))
            || (req.query.q && (!(/^[\sא-ת]+$/.test(req.query.q)) || (req.query.q).length < 3))
            || (req.params.countryId && !(/^[1-9]\d*$/.test(req.params.countryId)))
            || (req.params.regionId && !(/^-[1-9]\d*$/.test(req.params.regionId)))
        ) return { status: 204, code: 3006 };// There are no records

        console.log(req.query.limit);
        let data = await getRatesCountriesOrRegionsModel(req);
        if (isEmpty(data)) {
            if (req.params.countryId || req.params.regionId) return { status: 404, code: 3006 };// There are no records
            return { status: 204, code: 3006 };// There are no records
        }
        data = await dataWithNetworkInformation(data);
        return { status: 200, data };
    } catch (err) {
        err.message = `getRatesCountriesOrRegions-> ${err.message}`;
        throw err;
    }
};

const getCurrencies = async (countryId = null, query = null) => {
    try {
        const data = await getCurrenciesModel(countryId, query);
        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `getCurrencies-> ${err.message}`;
        throw err;
    }
};

export {
    getCountry,
    getCity,
    getStreet,
    getCurrencies,
    getRatesCountriesOrRegions,
};
