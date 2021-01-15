const http = require('k6/http');
const { check, sleep, group } = require('k6');

export const options = {
    discardResponseBodies: true,

    scenarios: {
  
      contacts: {
  
        executor: 'constant-arrival-rate',
  
        rate: 25000, // 200 RPS, since timeUnit is the default 1s
  
        duration: '30m',
  
        preAllocatedVUs: 2500,
  
        maxVUs: 5000,
  
      },
  
    },
  
  };

export default function() {
group('load parallel', () => {
    const res = http.batch( [
        ['GET', 'http://automationpractice.com/index.php',null, { tags: { ctype: 'html' } }],
        ['GET', 'http://automationpractice.com/index.php?controller=authentication&back=my-account',null, { tags: { ctype: 'html' } }],
        ['GET', 'http://automationpractice.com/index.php?controller=contact',null, { tags: { ctype: 'html' } }],
        ['GET', 'http://automationpractice.com/index.php?id_category=3&controller=category',null, { tags: { ctype: 'html' } }],
        ['GET', 'http://automationpractice.com/index.php?controller=prices-drop',null, { tags: { ctype: 'html' } }],
        ['GET', 'http://automationpractice.com/index.php?controller=new-products',null, { tags: { ctype: 'html' } }],
        ['GET', 'http://automationpractice.com/index.php?controller=best-sales',null, { tags: { ctype: 'html' } }],
        ['GET', 'http://automationpractice.com/index.php?controller=stores',null, { tags: { ctype: 'html' } }],
        ['GET', 'http://automationpractice.com/index.php?id_cms=3&controller=cms',null, { tags: { ctype: 'html' } }],
        ['GET', 'http://automationpractice.com/index.php?id_cms=4&controller=cms',null, { tags: { ctype: 'html' } }],
        ['GET', 'http://automationpractice.com/index.php?controller=sitemap',null, { tags: { ctype: 'html' } }],    
    ]);
    check(res[0], {
        'status was 200' : r => r.status === 200,
        'is NOT status 200' : r => r.status !== 200,
        'response time OK' : r => r.timings.duration < 1000
    });
    sleep(1);

});


}