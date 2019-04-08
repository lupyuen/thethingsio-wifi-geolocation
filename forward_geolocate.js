//  This Cloud Code Trigger is executed whenever a CoAP message is received.
//  If the message contains "ssid0" and "rssi0" values, we forward the message to
//  Cloud Code Function "geolocate" to perform the geolocation.
//  Cloud Code Triggers must complete within 2 seconds. So we forward the processing to 
//  another cloud function, which can execute up to 20 seconds.

/*
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
  
  //  values contains
  //  [{"key":"ssid0","value":"88:41:fc:bb:00:00"},{"key":"rssi0","value":-82},
  //	{"key":"ssid1","value":"88:41:fc:d6:00:00"},{"key":"rssi1","value":-91},
  //  	{"key":"ssid2","value":"18:d6:c7:3c:00:00"},{"key":"rssi2","value":-92}]
  console.log('forward_geolocate', values);
  
  //  Look for ssid0 and rssi0 keys.
  const findSSID0 = values.reduce((found, x) => (x.key == 'ssid0' ? x.value : found), null);
  const findRSSI0 = values.reduce((found, x) => (x.key == 'rssi0' ? x.value : found), null);
  if (findSSID0 || findRSSI0) {
    //  Forward to cloud function without waiting for it to complete.
  	thethingsAPI.cloudFunction('geolocate', params, function(err, res) {});
  }  
  callback();  
}
