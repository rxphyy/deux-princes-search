import cron from 'cron';
import https from 'https';
import axios from 'axios';
import 'dotenv/config'

const serverRefreshUrl = process.env.SRV_REFRESH_URL;
const dbRefreshUrl = process.env.DB_UPDATE_URL;

const serverRefreshJob = new cron.CronJob('*/30 * * * *', function () {
    console.log(new Date().toISOString(), 'Refreshing the server');

    https.get(serverRefreshUrl, (res) => {
        if (res.statusCode == 200) {
            console.log(new Date().toISOString(), 'Server refreshed.');
        } else {
            console.error(new Date().toISOString(), 'Failed to refresh server', res.statusCode);
        }
    }).on('error', (err) => {
        console.error(new Date().toISOString(), 'Error during server refresh', err.message);
    })
})


const databaseRefreshJob = new cron.CronJob('*/60 * * * *', async function () {
    console.log(new Date().toISOString(), 'Calling database update');

    try {
        const response = await axios.get(dbRefreshUrl);

        if (response.status === 200) {
            console.log(new Date().toISOString(), 'Database refreshed.');
        } else {
            console.error(new Date().toISOString(), 'Failed to refresh database', response.status);
        }
    } catch (error) {
        console.error(new Date().toISOString(), 'Error during database refresh', error.message);
        // Handle the error as needed
    }
})


export { serverRefreshJob, databaseRefreshJob } 