/*
    Soak testing is used to validate reliability of the system over a long time

    Run a soak test to:
    - Verify that your system doesn't suffer from bugs or memory leaks, which result in a crash or restart after
    - Verify that expected application restarts don't lose requests
    - Find bugs related to race-conditions that appear sporadically
    = Make sure your database doesn't exhaust the allotted storage space and stops
    = Make sure your logs don't exhaust the allotted disk storage
    - Make sure the external services you depend on don't stop working after a certain amount of requests are existed

    How to run a soak test:
    - Determe the maximum amount of users your system can handle
    - Get the 75-80% of that value
    - Set VUs to that value
    - Run the test in 3 stages. Rump up to the Vus, stay there for 4-12 hours, rump down to 0

*/

const http = require('k6/http');
const { check, sleep } = require('k6');


export let options = {
    
    stages: [
        { duration: '1m', target: 500 }, // ramp up to 500 users
        { duration: '2h', target: 500 }, // stay at 500 users for 2 hours
        { duration: '1m', target: 0 }, // scale down
    ],
};


    export default function () {

        let res = http.get('https://reqres.in/api/users?page=2');
    
      // Verify response
      check(res, {
        "status is 200": (r) => r.status === 200,
        "transaction time OK": (r) => r.timings.duration < 1000
    });
    
      sleep(1);

};