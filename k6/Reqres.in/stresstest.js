/*

    Stress Testing is a type of load testing used to determine the limits of the system.
    The purpose of this test is to verify the stablility and reliability of the system under extreme conditions.

    Run a stress to:
    - Determine how your system will behave under extreme conditions.
    - Determine what is the maximum capacity of your system in terms of users or throughput.
    - Determine if your system will recover without manual intervention after the stress test is over.

*/

const http = require('k6/http');
const { check, sleep } = require('k6');


export let options = {
    
    stages: [
        { duration: '3m', target: 50 }, // below normal load
        { duration: '5m', target: 50 },
        { duration: '3m', target: 100 }, // normal load
        { duration: '5m', target: 100 },
        { duration: '3m', target: 200 }, // around the breaking point
        { duration: '5m', target: 200 },
        { duration: '3m', target: 300 }, // beyond the breaking point
        { duration: '5m', target: 300 },
        { duration: '10m', target: 0 }, // scale down, Recovery stage

    ],


    export default function () {

        let res = http.get('https://reqres.in/api/users?page=2');
    
      // Verify response
      check(res, {
        "status is 200": (r) => r.status === 200,
        "transaction time OK": (r) => r.timings.duration < 1000
    });
    
      sleep(1);

},

};