import 'dotenv/config';
import oracledb from 'oracledb';
import dbQuery from '../db/connect.js';
import { camelCaseKeys } from '../utils/helper.js';

const getCountryModel = async (countryId, query) => {
    try {
        const sql = 'begin :result := geo_pkg.get_country(v_country_id => :v_country_id,v_query => :v_query); end;';
        const bind = { v_country_id: countryId || null, v_query: query };
        const resultDB = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(resultDB);
    } catch (err) {
        err.message = `getCountryModel-> ${err.message}`;
        throw (err);
    }
};

const getCityModel = async (countryId, cityId) => {
    try {
        const sql = `begin :result := geo_pkg.get_city(v_country_id => :v_country_id,
                                                       v_city_id => :v_city_id); end;`;
        const bind = {
            v_country_id: countryId,
            v_city_id: cityId,
        };
        const resultDB = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(resultDB);
    } catch (err) {
        err.message = `getCityModel-> ${err.message}`;
        throw (err);
    }
};

const getStreetModel = async (countryId, cityId, streetId) => {
    try {
        const sql = `begin :result := geo_pkg.get_street(v_country_id => :v_country_id,
                                                       v_city_id => :v_city_id,
                                                       v_street_id => :v_street_id); end;`;
        const bind = {
            v_country_id: countryId,
            v_city_id: cityId,
            v_street_id: streetId,
        };
        const resultDB = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(resultDB);
    } catch (err) {
        err.message = `getStreetModel-> ${err.message}`;
        throw (err);
    }
};

// const getPostalCodeModel = async (req) => {
//     try {
//         // const { country_id, city_id, street_id } = req;
//         // const sql = `begin :result := bya.get_postal_codes(in_country_id => :in_country_id,
//         //                                                 in_city_id => :in_city_id,
//         //                                                 in_street_id => :in_street_id);
//         //              end;`;
//         // const bind = { in_country_id: country_id, in_city_id: city_id, in_street_id: street_id };
//         // const resultDB = await dbQuery(sql, bind, oracledb.CURSOR, 'func');
//         const resultDB = 1;
//         return resultDB;
//     } catch (err) {
//         err.message = `getPostalCodeModel-> ${err.message}`;
//         throw (err);
//     }
// };

const getNetworkInformationModel = async (countryId = null) => {
    try {
        const sql = 'begin :result := geo_pkg.get_network_information(v_country_id => :v_country_id); end;';
        const bind = { v_country_id: countryId };
        const resultDB = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(resultDB);
    } catch (err) {
        err.message = `getNetworkInformationModel-> ${err.message}`;
        throw (err);
    }
};

async function addNetworkInformation(obj) {
    obj.networkInformation = await getNetworkInformationModel(obj.id);
    return obj;
}

const dataWithNetworkInformation = async (data) => {
    try {
        const newData = [];
        for (const obj of data) {
            const newObj = await addNetworkInformation(obj);
            newData.push(newObj);
        }
        return newData;
    } catch (err) {
        err.message = `dataWithNetworkInformation-> ${err.message}`;
        throw (err);
    }
};

const getRatesCountriesOrRegionsModel = async (req) => {
    try {
        const sql = `begin :result := get_packages_abroad(
                                v_country_id => :v_country_id, 
                                v_query => :v_query,
                                v_agent_id => :v_agent_id,
                                v_max_row =>:v_max_row,
                                v_is_region =>:v_is_region,
                                v_has_products => :v_has_products
                            ); end;`;
        const bind = {
            v_country_id: req.params.countryId || req.params.regionId || null,
            v_query: req.query.q || null,
            v_agent_id: req.body.agentId || 0,
            v_max_row: req.query.limit || 0,
            v_is_region: req.body.isRegion || 0,
            v_has_products: req.query.hasProducts || 0,
        };
        const resultDB = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(resultDB);
    } catch (err) {
        err.message = `getRatesCountriesOrRegionsModel-> ${err.message}`;
        throw (err);
    }
};

const formatCurrencyJson = (data) => data.map((i) => ({
    label: i.currencyHash1,
    symbol: i.description,
    isoCode: i.currency,
    id: i.id,
    rate: parseFloat(i.rate.toFixed(4)),
}));

const getCurrenciesModel = async () => {
    try {
        const sql = 'begin :result := geo_pkg.get_currencies; end;';
        const resultDB = await dbQuery(sql, {}, oracledb.CURSOR);
        return formatCurrencyJson(camelCaseKeys(resultDB));
    } catch (err) {
        err.message = `getCurrenciesModel-> ${err.message}`;
        throw (err);
    }
};

export {
    getCountryModel,
    getCityModel,
    getStreetModel,
    getCurrenciesModel,
    dataWithNetworkInformation,
    getRatesCountriesOrRegionsModel,
};
