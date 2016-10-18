import _ from 'lodash';
import Q from 'q';
import request from 'request';
import cheerio from 'cheerio';
import PromiseThrottle from 'promise-throttle';

const Url = 'http://www.imdb.com/search/title?year={year}&title_type=feature&sort=moviemeter,asc&page={pageIdx}&ref_=adv_nxt';
const PageCount = 200;

function imdbApi(options) {
    let {yearStart, yearEnd, minVoteCount} = options;
    minVoteCount = minVoteCount || 0;
    return fetchAllTitles(yearStart, yearEnd)
            .then(result => filter(result, r => {
                let votes = r.votes && parseInt(r.votes.replace(',', ''));
                return votes > minVoteCount;
            }))
            .then(sort)
            .catch(err => console.log('failed', err));
}

function filter(result, pred) {
    let years = {};

    _.each(result, year => {
        _.each(year, y => {
            if (y.rows) {
                let rows = _.filter(y.rows, pred);
                years[y.year] = years[y.year] || [];
                years[y.year] = years[y.year].concat(rows);
            }
        });
    });

    return years;
}

function sort(years) {
    _.each(years, year => year.sort((a, b) => parseFloat(b.imdbScore) - parseFloat(a.imdbScore)));
    return years;
}

function fetchAllTitles(yearStart, yearEnd) {
    let years = {};
    let promises = [];

    let promiseThrottle = new PromiseThrottle({
        requestsPerSecond: 50,
    });


    for (var year = yearStart; year <= yearEnd; year++) {
        let _year = year;

        for (var i = 1; i < PageCount; i++) {
            let _i = i;

            promises.push(promiseThrottle.add(() =>
                fetchPageTitles(_year, _i)
                    .then(html => extractRows(html))
                    .then(rows => {
                        years[_year] = years[_year] || [];

                        years[_year] = years[_year].concat({
                            year: _year,
                            page: _i,
                            rows
                        });
                    })
            ));
        }
    }

    return Q.all(promises).then(() => years);
}

function extractRows(html) {
    let $ = cheerio.load(html);
    let rows = $('.lister-item.mode-advanced');
    return _.map(rows, r => extractRow($, r));
}

function extractRow($, row) {
    let title = $('.lister-item-content > .lister-item-header > a', row).html();
    let metaScore = $('.lister-item-content > .ratings-bar .metascore', row).html();
    let imdbScore = $('.lister-item-content > .ratings-bar > .ratings-imdb-rating > strong', row).html();
    let votes = $('.lister-item-content > .sort-num_votes-visible > span:nth-child(2)', row).html();

    return {
        title,
        metaScore,
        imdbScore,
        votes
    }
}

function fetchPageTitles(year, pageIdx) {
    console.log('fetching', year, pageIdx)
    return new Promise((resolve, reject) => {
        let url = Url.replace('{year}', year)
                     .replace('{pageIdx}', pageIdx);

        request(url, (err, response, body) => {
            if (!err && response.statusCode == 200) {
                resolve(body);
            }

            reject(err || 'unexpected error :(');
        });
    });
}

export default imdbApi;
