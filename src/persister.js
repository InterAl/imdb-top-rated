import _ from 'lodash';
import Q from 'q';
import imdbApi from './imdbApi';
import fs from 'fs';

const dirName = 'results';

const minVoteCount = 30000;
const yearStart = 1922;
const yearEnd = 2016;

saveYears(yearStart, yearEnd);

function saveYears(yearStart, yearEnd) {
    if (yearStart < yearEnd) {
        let year = yearStart;
        imdbApi({yearStart: year, yearEnd: year, minVoteCount})
            .then(save)
            .then(() => console.log(`saved ${year}`))
            .catch(err => console.log(`failed saving ${year}`, err))
            .finally(() => saveYears(yearStart + 1, yearEnd));
    }
}

function save(result) {
    let year = _.first(_.keys(result));
    let rows = result[year];

    let txt = _.reduce(rows, (acc, cur) => {
        acc += `${cur.title}\t${cur.imdbScore}\t${cur.votes}\n`;
        return acc;
    }, '');

    return Q.nfcall(fs.writeFile, `${dirName}/${year}.txt`, txt);
}
