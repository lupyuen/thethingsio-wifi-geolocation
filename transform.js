function transformValues(thingToken, values, callback) {
  //  In values, look for t, the raw temperature, and tmp, the computed temperature.
  //  If raw temperature is found but not computed temperature,
  //  transform the raw temperature to computed temperature and update 
  //  the thing state.
  let updated = false;
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
    values.push({ "key": "tmp", "value": tmp });
    updated = true;
  }
  //  Update the thing if values have changed.
  if (updated) {
    thethingsAPI.thingWrite(thingToken, { values: values }, function(err, result) {
      if (err) { console.log('thingWrite error', err); return callback(err, null); }
      console.log('thingWrite result', result);
      return callback(null, result);
    });
  }
  //  If values have not changed, return.
  return callback(null, 'OK');
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

  //  Transform the values and save the updated values into thing object.
  return transformValues(thingToken, values, callback);
}
