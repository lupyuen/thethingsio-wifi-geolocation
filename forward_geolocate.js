//  This Cloud Code Trigger is executed whenever a CoAP message is received.
//  If the message contains "ssid0" and "rssi0" values, we forward the message to
//  Cloud Code Function "geolocate" to perform the geolocation.

//  If the message has not been transformed, we forward to Cloud Code Function "transform" 
//  to transform the values, like converting raw temperature to actual temperature.

//  Cloud Code Triggers must complete within 2 seconds. So we forward the processing to 
//  another cloud function, which can execute up to 20 seconds.

/* Cloud Code Trigger convention:
   params: is an object with the keys:
    - action: one of 'write' | 'read'
    - thingToken: the thing that triggered the trigger
    - values: only if action == 'write'. Is an array of values where each value is an object with:
    - key: the key
    - value: the data sent
    - datetime: (can be null)
   callback: is a function to be called when the trigger ends can contain a
       parameter string *error* if the trigger needs to report an error. */
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
  const device = values.reduce((found, x) => (x.key == 'device' ? x.value : found), null);
  
  //  Look for ssid0 and rssi0 keys.
  const ssid0 = values.reduce((found, x) => (x.key == 'ssid0' ? x.value : found), null);
  const rssi0 = values.reduce((found, x) => (x.key == 'rssi0' ? x.value : found), null);
  
  //  If this is a valid geolocation request with ssid0 and rssi0 keys, forward to 
  //  "geolocate" Cloud Code Function without waiting for it to complete.
  if (ssid0 && rssi0) {
    console.log('forward to geolocate');
  	thethingsAPI.cloudFunction('geolocate', params, function(err, res) {
      if (err) { console.log('geolocate error', err); }
    });
    return callback();  //  Exit without waiting for Cloud Code Function to complete.
  }
  
  //  Look for the "transformed" key. If not found, then this message has not been
  //  transformed yet.  Forward to "transform" Cloud Code Function to transform and 
  //  update the values.  Don't wait for the Cloud Code Function to complete.
  const transformed = values.reduce((found, x) => (x.key == 'transformed' ? x.value : found), null);
  if (!transformed) { 
    console.log('forward to transform');
  	thethingsAPI.cloudFunction('transform', params, function(err, res) {
      if (err) { console.log('transform error', err); }
    });
    return callback();  //  Exit without waiting for Cloud Code Function to complete.
  }
  
  //  If geolocation and transformation are not required, push the finalised
  //  sensor data to the external server without waiting for it to complete.
  console.log("before push_sensor_data");
  thethingsAPI.cloudFunction('push_sensor_data', params, function(err, res) {
    if (err) { console.log('push_sensor_data error', err); }
  });
  return callback();  //  Exit without waiting for external server push to complete.
}
