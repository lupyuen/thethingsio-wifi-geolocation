//  Server URL that will receive sensor data. 
//  See https://github.com/lupyuen/gcloud-wifi-geolocation.
const PUSH_HOST   = 'YOUR_SERVER.appspot.com';
const PUSH_PATH   = '/push?token=YOUR_TOKEN';
const PUSH_SECURE = true;  //  True for https, false for http.

//  This Cloud Code Trigger is executed whenever a CoAP message is received.
//  If the message contains "ssid0" and "rssi0" values, we forward the message to
//  Cloud Code Function "geolocate" to perform the geolocation.
//  Cloud Code Triggers must complete within 2 seconds. So we forward the processing to 
//  another cloud function, which can execute up to 20 seconds.

function pushSensorData(values, callback) {
  //  Push the sensor data to the Google Cloud AppEngine Server running g
  //  cloud-wifi-geolocation. See https://github.com/lupyuen/gcloud-wifi-geolocation
  
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

/* Cloud Code Trigger convention:
   params: is an object with the keys:
    - action: one of 'write' | 'read'
    - thingToken: the thing that triggered the trigger
    - values: only if action == 'write'. Is an array of values where each value is an object with:
    - key: the key
    - value: the data sent
    - datetime: (can be null)
   callback: is a function to be called when the trigger ends can contain a
       parameter string *error* if the trigger needs to report an error.
*/
function trigger(params, callback) {
  if (params.action !== 'write') { return callback(); }  //  Interested only in update actions, not read.
  const values = params.values;
  if (!values) { return callback(); }
  const thingToken = params.thingToken;
  
  //  values contains geolocation parameters:
  //  [{"key":"device","value":"my_device_id"},
  //   {"key":"ssid0","value":"88:41:fc:bb:00:00"},{"key":"rssi0","value":-82},
  //   {"key":"ssid1","value":"88:41:fc:d6:00:00"},{"key":"rssi1","value":-91},
  //   {"key":"ssid2","value":"18:d6:c7:3c:00:00"},{"key":"rssi2","value":-92}]
  //  or sensor data:
  //  [{"key":"device","value":"my_device_id"},
  //   {"key":"tmp","value":28.1}]
  //  For raw temperature:
  //  [{"key":"device","value":"my_device_id"},
  //   {"key":"t","value":1744}]
  console.log('forward_geolocate', values);
  
  //  Look for ssid0 and rssi0 keys.
  const ssid0 = values.reduce((found, x) => (x.key == 'ssid0' ? x.value : found), null);
  const rssi0 = values.reduce((found, x) => (x.key == 'rssi0' ? x.value : found), null);
  
  //  If this is a valid geolocation request, forward to "geolocate" Cloud Code 
  //  Function without waiting for it to complete.
  if (ssid0 && rssi0) {
    console.log('forward to geolocate');
  	thethingsAPI.cloudFunction('geolocate', params, function(err, res) {});
    return callback();  
  }
  
  //  Look for t, the raw temperature, and tmp, the computed temperature.
  //  If raw temperature is found but not computed temperature,
  //  forward to "transform" Cloud Code Function to transform and update the values.
  //  Don't wait for the Cloud Code Function to complete.
  const t = values.reduce((found, x) => (x.key == 't' ? x.value : found), null);
  const tmp = values.reduce((found, x) => (x.key == 'tmp' ? x.value : found), null);
  if (t && !tmp) { 
    console.log('forward to transform');
  	thethingsAPI.cloudFunction('transform', params, function(err, res) {});
    return callback();  
  }
  
  //  Otherwise push the sensor data to the external server without 
  //  waiting for it to complete.
  pushSensorData(values, null);
  return callback();
}
