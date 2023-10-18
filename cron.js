import cron from 'cron';
import https from 'https';

const serverRefreshUrl = process.env.SRV_REFRESH_URL;
const dbRefreshUrl = process.env.DB_UPDATE_URL;

const serverRefreshJob = new cron.CronJob('*/14 * * * *', function () {
    const timestamp = new Date().toISOString();
    console.log(timestamp, 'Refreshing the server');

    https.get(serverRefreshUrl, (res) => {
        if (res.statusCode == 200) {
            console.log(timestamp, 'Server refreshed.');
        } else {
            console.error(timestamp, 'Failed to refresh server', res.statusCode);
        }
    }).on('error', (err) => {
        console.error(timestamp, 'Error during server refresh', err.message);
    })
})


const databaseRefreshJob = new cron.CronJob('*/30 * * * *', function () {
    const timestamp = new Date().toISOString();
    console.log(timestamp, 'Calling database update');

    https.get(dbRefreshUrl, (res) => {
        if (res.statusCode == 200) {
            console.log(timestamp, 'Database refreshed.');
        } else {
            console.error(timestamp, 'Failed to refresh database', res.statusCode);
        }
    }).on('error', (err) => {
        console.error(timestamp, 'Error during database refresh', err.message);
    })
})


export { serverRefreshJob, databaseRefreshJob } 