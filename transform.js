//  This Cloud Code Function is called by Cloud Code Trigger "forward_geolocate" to transform
//  raw temperature "t" into computed temperature "tmp".  The computed temperature is saved in 
//  the thing object as resource "tmp".  The value is the temperature in degrees Celsius.

function transformValues(thingToken, device, values, callback) {
  //  In values, look for "t" the raw temperature, and "tmp" the computed temperature.
  //  If raw temperature is found but not computed temperature,
  //  transform the raw temperature to computed temperature and update 
  //  the thing state.
  let updated = false;
  const node = values.reduce((found, x) => (x.key == 'node' ? x.value : found), null);
  let newValues = [
    { key: 'device', value: device || 'unknown' },
    { key: 'node', value: node || 'unknown' }
  ];
  //  TODO: Given node ID, map to a thingToken in order to update the thing that represents the node.
  
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
    newValues.push({ key: 'tmp', value: tmp });
    updated = true;
  }
  
  //  If values have not changed, return.
  if (!updated) { return callback(null, 'OK'); }

  //  Post the updated values back to thethings.io. 
  const body = { values: newValues };
  const headers = {
    Accept:        'application/json',
    Connection:    'close',
    'Content-Type':'application/json'
  };
  return httpRequest({
    host:   'api.thethings.io',
    path:   '/v2/things/' + thingToken + '?broadcast=true',  //  Must set broadcast so that dashboard will be updated.
    secure: true,
    method: 'POST',
    headers: headers
  }, body, function(err, result) {
    if (err) { 
      console.log('update error', err); 
      if (callback) { return callback(err); }
      return;
    }
    console.log('update result', result);
    if (callback) { return callback(null, result); }
  });

  /* Note: Calling thingWrite() does not update the dashboard.
  return thethingsAPI.thingWrite(thingToken, { values: newValues }, function(err, result) {
    if (err) { console.log('thingWrite error', err); return callback(err, null); }
    console.log('thingWrite result', result);
    return callback(null, result);
  }); */
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

  //  Transform the values and save the updated values into thing object.
  return transformValues(thingToken, device, values, callback);
}
