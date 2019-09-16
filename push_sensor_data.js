//  Server URL that will receive sensor data. 
//  See https://github.com/lupyuen/gcloud-wifi-geolocation.
const PUSH_HOST   = null;  //  Set to your server hostname: 'YOUR_SERVER.appspot.com';
const PUSH_PATH   = null;  //  Set to your server path: '/push?token=YOUR_TOKEN';
const PUSH_SECURE = false; //  True for https, false for http (which may be faster)

function pushSensorData(values, callback) {
  //  Push the sensor data to the Google Cloud AppEngine Server running
  //  gcloud-wifi-geolocation. See https://github.com/lupyuen/gcloud-wifi-geolocation
  
  //  Compose body for push request. Body looks like
  //  {device:"my_device", tmp:28.1, latitude:1.23, longitude:1.23, accuracy:1.23}
  const body = {};
  values.forEach(keyValue => {
    //  Rename geolocation_accuracy to accuracy.
    const key = (keyValue.key === 'geolocation_accuracy') ? 'accuracy' : keyValue.key;
    const value = keyValue.value;
    const geo = keyValue.geo;
    if (!key) { return; }
    body[key] = value;
    
    //  Save the geolocation.
    if (!geo) { return; }
    body.latitude = geo.lat;
    body.longitude = geo.long;
    //  Assign an accuracy so that the website will render the location.
    if (!body.accuracy) { body.accuracy = 99; }
  });
  console.log('push', body);
  
  //  Push the sensor data. 
  httpRequest({
    host:   PUSH_HOST,  //  e.g. YOUR_SERVER.appspot.com
    path:   PUSH_PATH,  //  e.g.  /push?token=YOUR_TOKEN
    secure: PUSH_SECURE,
    method: 'POST',
    headers: {
      Accept:     '*/*',
      Connection: 'close',
      'Content-Type':'application/json'
    }
  }, body, function(err, result) {
    if (err) { 
      console.log('push error', err); 
      if (callback) { return callback(err); }
      return;
    }
    console.log('push result', result);
    if (callback) { return callback(null, result); }
  });
}

function main(params, callback) {
  //  Cloud Code Functions must complete within 20 seconds.
  //  params contains
  //  {
  //	"thingToken":"...",
  //    "values":[
  //      {"key":"device","value":"my_device_id"},
  //      {"key":"t","value":1744}
  //	],
  //	"action":"write"
  //  }
  console.log('push_sensor_data', params);
  const thingToken = params.thingToken;
  if (!thingToken) { throw new Error('missing thingToken'); }
  const values = params.values;
  if (!values) { throw new Error('missing values'); }  

  //  If timestamp is not found, reject the update.
  const timestamp = values.reduce((found, x) => (x.key == 'timestamp' ? x.value : found), null);
  if (!timestamp) { return callback(); }
  
  //  Reject if update has expired (4 seconds). This discards older updates 
  //  and throttles the throughput.
  const now = Date.now().valueOf();
  if (now - timestamp > 4 * 1000) {
    console.log('push_sensor_data expired', Math.floor((now - timestamp) / 1000), 
                new Date(timestamp).toISOString(), values);
    return callback();
  }

  //  Push the sensor data to the external server without waiting for it to complete.
  if (PUSH_HOST) { return pushSensorData(values, callback); }
  return callback();
}
