//  This Cloud Code Function is called by Cloud Code Trigger "forward_geolocate" to transform
//  raw temperature "t" into computed temperature "tmp".  The computed temperature is saved in 
//  the thing object as resource "tmp".  The value is the temperature in degrees Celsius.

function transformValues(params, callback) {
  //  In values, look for "t" the raw temperature, and "tmp" the computed temperature.
  //  If raw temperature is found but not computed temperature,
  //  transform the raw temperature to computed temperature and update 
  //  the thing state.
  const thingToken = params.thingToken;
  if (!thingToken) { throw new Error('missing thingToken'); }
  const values = params.values;
  if (!values) { throw new Error('missing values'); }  
  
  //  Look for raw temperature t and computed temperature tmp.
  const t = values.reduce((found, x) => (x.key == 't' ? x.value : found), null);
  const tmp = values.reduce((found, x) => (x.key == 'tmp' ? x.value : found), null);
  
  if (t && !tmp) {  //  If raw temperature is found but not computed temperature...
    //  Convert the raw temperature (Blue Pill Internal Temperature Sensor) to 
    //  actual temperature (degrees C). From https://github.com/cnoviello/mastering-stm32/blob/master/nucleo-f446RE/src/ch12/main-ex1.c
    let tmp = (t / 4095.0) * 3300.0;
    tmp = ((tmp - 760.0) / 2.5) + 25.0;
    tmp = tmp / 10.0;
    tmp = parseInt(tmp * 100) / 100.0;  //  Truncate to 2 decimal places. 
    //  Write the computed temperature into values as "tmp".
    values.push({ key: 'tmp', value: tmp });
  }
  
  //  Post the updated values back to thethings.io. 
  thethingsAPI.cloudFunction('update_thing', params, function(err, res) {
    if (err) { 
      console.log('update_thing error', err); 
      //  return callback(err); 
    }
    //  return callback(null, res);
  });
  return callback(null, params);  //  Don't wait for update_thing to complete.
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
  //  Reject if update has expired.
  const now = Date.now().valueOf();
  if (now - timestamp > 1000) {
    console.log('transform expired', values);
    return callback();
  }

  //  If already transformed, quit.
  if (transformed) { return callback(null, 'OK'); }
  values.push({ key: 'transformed', value: true });

  //  Transform the values and save the updated values into thing object.
  return transformValues(params, callback);
}
