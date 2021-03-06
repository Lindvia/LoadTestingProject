const http = require('k6/http');
const { check, sleep } = require('k6');



export let options = {

  vus: 10,

  duration: '10s',

};

export default function () {

    let res = http.get('https://gojekmerchant-stg.prospark.co/#/profile');

  // Verify response
  check(res, {
    "status is 200": (r) => r.status === 200,
    "transaction time OK": (r) => r.timings.duration < 1000
});

  sleep(1);

}