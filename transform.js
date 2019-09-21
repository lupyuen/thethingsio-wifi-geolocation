//  This Cloud Code Function is called by Cloud Code Trigger "forward_geolocate" to transform
//  raw temperature "t" into computed temperature "tmp".  The computed temperature is saved in 
//  the thing object as resource "tmp".  The value is the temperature in degrees Celsius.

function computeTemperature(rawValue, deviceType) {
  //  Convert the raw temperature (STM32 Internal Temperature Sensor) to 
  //  actual temperature (degrees C). 
  if (deviceType == "l476") {
    //  STM32 L476
    //  From https://github.com/cnoviello/mastering-stm32/blob/master/nucleo-l476RG/src/ch12/main-ex1.c
    let temp = (rawValue) / 4095.0 * 3300.0;
    temp = ((temp - 760.0) / 2.5) + 30.0;
    return temp;
  } else {
    //  STM32 F103 Blue Pill
    //  From with https://github.com/cnoviello/mastering-stm32/blob/master/nucleo-f103RB/src/ch12/main-ex1.c
    let temp = (rawValue) / 4095.0 * 3300.0;
    temp = ((temp - 1400.0) / 4.3) + 25.0;
    return temp;
  }       
}

function transformValues(params, callback) {
  //  In values, look for "t" the raw temperature, and "tmp" the computed temperature.
  //  If raw temperature is found but not computed temperature,
  //  transform the raw temperature to computed temperature and update the thing state.
  const thingToken = params.thingToken;
  if (!thingToken) { throw new Error('missing thingToken'); }
  const values = params.values;
  if (!values) { throw new Error('missing values'); }  
  
  //  Look for raw temperature t and computed temperature tmp.
  const t = values.reduce((found, x) => (x.key == 't' ? x.value : found), null);
  const tmp = values.reduce((found, x) => (x.key == 'tmp' ? x.value : found), null);
  const device = values.reduce((found, x) => (x.key == 'device' ? x.value : found), null);
  
  //  Device type appears in the front of the device ID e.g. "l476,010203".
  const deviceType = device ? device.split(",")[0] : "";
  
  if (t && !tmp) {  //  If raw temperature is found but not computed temperature...
    //  Convert the raw temperature to actual temperature (degrees C).
    let tmp = computeTemperature(t, deviceType);
    tmp = parseInt(tmp * 100) / 100.0;  //  Truncate to 2 decimal places. 
    //  Write the computed temperature into values as "tmp".
    let val = { key: 'tmp', value: tmp };
    if (t.geo) { val.geo = t.geo; }  //  Copy the geolocation
    values.push(val);
  }
  
  //  Post the updated values back to thethings.io. 
  thethingsAPI.cloudFunction('update_thing', params, function(err, res) {
    if (err) { 
      console.log('update_thing error', err); 
    }
  });
  
  //  Concurrently, push the transformed sensor data to the external server (Google Cloud AppEngine).
  console.log('forward to push_sensor_data', values);
  thethingsAPI.cloudFunction('push_sensor_data', params, function(err, res) {
    if (err) { console.log('push_sensor_data error', err); }
  });

  return callback(null, params);  //  Don't wait for update or push to complete.
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
  console.log('transform', params);
  const thingToken = params.thingToken;
  if (!thingToken) { throw new Error('missing thingToken'); }
  const values = params.values;
  if (!values) { throw new Error('missing values'); }  
  const device = values.reduce((found, x) => (x.key == 'device' ? x.value : found), null);
  const transformed = values.reduce((found, x) => (x.key == 'transformed' ? x.value : found), null);

  //  If timestamp is not found, reject the update.
  const timestamp = values.reduce((found, x) => (x.key == 'timestamp' ? x.value : found), null);
  if (!timestamp) { return callback(); }
  
  //  Reject if update has expired (4 seconds). This discards older updates 
  //  and throttles the throughput.
  const now = Date.now().valueOf();
  if (now - timestamp > 4 * 1000) {
    console.log('transform expired', Math.floor((now - timestamp) / 1000), 
                new Date(timestamp).toISOString(), values);
    return callback();
  }

  //  If already transformed, quit.
  if (transformed) { return callback(null, 'OK'); }
  values.push({ key: 'transformed', value: true });

  //  Transform the values and save the updated values into thing object.
  return transformValues(params, callback);
}
