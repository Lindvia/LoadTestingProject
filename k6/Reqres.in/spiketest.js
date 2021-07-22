/*

    Spike Testing is a variation of a stress test, but it does not gradually increase the load,
    instead it spikes to extreme load over a very short window of time

    Run a spike test to:
    - Determine how your system will perform under a sudden surge of traffic
    - Determine if your system will recover once the traffic has subsided
 
    Success is based on expectations. System will generally react in 1 or 4 ways
    - Excellent: system performance is not degraded during the surge of traffic.
      Response time is similiar during low traffic and high traffic
    - Good: Response time is slower, but the system does not produce any errors.
      All requests are handled
    - Poor: System produces errors during the surge of traffic, but recovery to normal after the traffic subside.
    = Bad: System crashes, and does not recover after the traffic subside. 

*/

    const http = require('k6/http');
    const { check, sleep } = require('k6');
    
    
    export let options = {
        
        stages: [
            { duration: '30s', target: 100 }, // below normal load
            { duration: '1m', target: 100 },
            { duration: '30s', target: 2000 }, // spike to 2000 users
            { duration: '5m', target: 2000 }, // stay at 2000 users for 5 minute
            { duration: '30s', target: 100 }, // scale down. Recovery stage.
            { duration: '1m', target: 100 },
            { duration: '10s', target: 0 }, 
    
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