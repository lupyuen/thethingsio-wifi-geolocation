//  This Cloud Code Function is called by Cloud Code Functions "geolocate" and "transform"
//  to update the sensor data in a thing, after computing the geolocation or transforming
//  the values.

function updateThing(params, callback) {
  //  In values, look for "t" the raw temperature, and "tmp" the computed temperature.
  //  If raw temperature is found but not computed temperature,
  //  transform the raw temperature to computed temperature and update 
  //  the thing state.
  const thingToken = params.thingToken;
  if (!thingToken) { throw new Error('missing thingToken'); }
  const values = params.values;
  if (!values) { throw new Error('missing values'); }  

  const node = values.reduce((found, x) => (x.key == 'node' ? x.value : found), null);

  //  TODO: Map node to a thingToken to that we can update the actual thing that represents the sensor node.
  
  //  Post the updated values back to thethings.io. 
  const body = { values: values };
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

  //  Save the values into thing object.
  return updateThing(params, callback);
}
