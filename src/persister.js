import _ from 'lodash';
import Q from 'q';
import imdbApi from './imdbApi';
import fs from 'fs';

const dirName = 'results';

imdbApi({yearStart: 2012, yearEnd: 2016, minVoteCount: 30000})
    .then(save)
    .then('done!')
    .catch(err => console.log('failed', err));

function save(result) {
    let promises = [];
    _.each(result, (rows, year) => {
        let txt = _.reduce(rows, (acc, cur) => {
            acc += `${cur.title}\t${cur.imdbScore}\t${cur.votes}\n`;
            return acc;
        }, '');
        promises.push(Q.nfcall(fs.writeFile, `${dirName}/${year}.txt`, txt));
    });
    return Q.all(promises);
}
