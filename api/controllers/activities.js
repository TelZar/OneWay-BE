import {
    addCallSummary, getSummaryFromOracle,
} from '../models/activities.js';
import { pagination } from '../utils/helper.js';

function filterByActivityId(data) {
    return data.filter((obj) => obj.hasOwnProperty('eventId')).map((obj) => obj.eventId);
}

function arrangeByHierarchy(mainSummaries, commentsSummaries) {
    const Activitys = mainSummaries;
    commentsSummaries.map((el) => {
        const index = mainSummaries.findIndex((element) => element.eventId === el.parentId);
        if (index >= 0) {
            if (Activitys[index].hasOwnProperty('children')) {
                Activitys[index].children.push(el);
            } else {
                Activitys[index].children = [el];
            }
        }
    });
    return Activitys;
}

const addActivity = async (req) => {
    try {
        // switch (req.body.action) {
        // case 1794: // פתיחת קריאה לבנק ירושלים
        //     data = await JerusalemBankCalling(req.body);
        //     break;
        // }
        const data = await addCallSummary(req);
        if (data.p_res < 0) {
            return { status: 400, code: 2011 };
        }
        return { status: 201, data }; // insert new summary success
    } catch (err) {
        err.message = `addActivity-> ${err.message}`;
        throw err;
    }
};

const getSummary = async (req) => {
    try {
        const { offset, limit } = req;
        const mainSummariesFromDB = await getSummaryFromOracle(req); // extracting the activities from oracle and transferring them to mySQL get partittion and size and cursor
        if (mainSummariesFromDB.length <= 0) {
            return { status: 204, code: 3006 };
        }
        const summaries = pagination(mainSummariesFromDB, offset, limit); // pagination to get main summaries data by offset and limit
        const mainActivities = filterByActivityId(summaries.data);
        const commentsOfMainSummaries = await getSummaryFromOracle(req, mainActivities); // get the comments
        summaries.data = arrangeByHierarchy(summaries.data, commentsOfMainSummaries);
        return { status: 200, data: summaries };
    } catch (err) {
        err.message = `getSummaRy-> ${err.message}`;
        throw err;
    }
};

export {
    addActivity,
    getSummary,
};
