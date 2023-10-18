import cron from 'cron';
import https from 'https';

const backendUrl = 'https://testtest-5uol.onrender.com/api/check';

const job = new cron.CronJob('*/14 * * * *', function () {
    console.log('Refreshing the server');

    https.get(backendUrl, (res) => {
        if (res.statusCode == 200) {
            console.log('Server refreshed.');
        } else {
            console.error('Failed to refresh server', res.statusCode);
        }
    }).on('error', (err) => {
        console.error('Error during refresh', err.message);
    })
})

export { job } 