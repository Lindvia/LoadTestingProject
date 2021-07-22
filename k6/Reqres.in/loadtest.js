/*
    Load Testing is primarily concerned with assessing the current performance of your system
    in terms of concurrent users or requests per second.
    When you want to understand if your system is meeting the performance goals, this is the 
    type of test you'll run.

    Run a load test to:
    - Assess the current performance of your system under typical and peak load
    - Make sure you are continuously meeting the performance standards as you make changes to your system

    Can be used to simulate a normal day in your business

*/

    const http = require('k6/http');
    const { check, sleep } = require('k6');
    
    
    export let options = {
        
        stages: [
            { duration: '5m', target: 100 }, // simulate ramp-up of traffic from 1 to 100 users over 5 minutes.
            { duration: '10m', target: 100 }, // stay at 100 users for 10 minutes
            { duration: '5m', target: 0 }, // ramp-down to 0 users
        ],

        thresholds: {
            http_req_duration: ['p(99)<150'], // 99% of requests must complete below 150ms
        },
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