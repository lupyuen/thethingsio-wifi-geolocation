const API_KEY = 'YOUR_API_KEY';  //  Your Google Geolocation API Key

//  This Cloud Code Function is called by Cloud Code Trigger "forward_geolocate" to perform
//  WiFi Geolocation requests.  We pass the received WiFi SSID MAC addresses and Signal Strength
//  to the Google Geolocation API.  The computed latitude/longitude is saved in the thing object
//  as resource "geolocation_accuracy" under "geo".  The value is the geolocation accuracy in metres.

function geolocate(accessPoints, callback) {
  //  Call Google Geolocation API to geolocate by WiFi access points.
  
  //  Compose body for Google Geolocation API request.
  const body = {
    "considerIp": "false",  //  We should not fall back to IP geolocation if WiFi APs are not available.
    "wifiAccessPoints": accessPoints
  };
  //  Send the request to Google Geolocation API. 
  httpRequest({
    host: 'www.googleapis.com',
    path: '/geolocation/v1/geolocate?key=' + API_KEY,
    method: 'POST',
    secure: true,
    headers:{
      Accept: '*/*',
      Connection: 'close',
      'Content-Type':'application/json'
    }
  }, body, function(err, result) {
    if (err) { console.log('geolocation error'); console.error(err); return callback(err); }
    console.log('geolocation result', result);
    return callback(null, result);
  });
}

function saveLocation(thingToken, device, locationAccuracy, callback) {
  //  Save the location and accuracy into the thing object.  locationAccuracy contains 
  //  { "location": {
  //    "lat": 1.2733663,
  //    "lng": 103.8096363 },
  //  "accuracy": 39.0 }
  const location = locationAccuracy.location;  
  if (!location) { throw new Error('missing location'); }
  const accuracy = locationAccuracy.accuracy;  
  if (!accuracy) { throw new Error('missing accuracy'); }
  //  Save the location under the key geolocation_accuracy.  Must be in this format to render on map.
  const values = [{
    key: 'device',
    value: device ? device : '(unknown)',
    geo: {
      lat: location.lat,
      long: location.lng
    }
  }, {
    key: 'geolocation_accuracy',
    value: accuracy,
    geo: {
      lat: location.lat,
      long: location.lng
    }
  }];
  //  Update the thing.
  return thethingsAPI.thingWrite(thingToken, { values: values }, function(err, result) {
    if (err) { console.log('thingWrite error'); console.error(err); return callback(err); }
    console.log('thingWrite result', result);
    return callback(null, result);
  });
}

function main(params, callback) {
  //  Cloud Code Functions must complete within 20 seconds.
  //  Params contains a list of WiFi SSID MAC addresses and signal strength.  Call the
  //  Google Geolocation API to get the estimated latitude, longitude and update the thing object.
  //  params contains
  //  {
  //	"thingToken":"...",
  //    "values":[
  //      {"key":"device","value":"my_device_id"},
  //	  {"key":"ssid0","value":"88:41:fc:bb:00:00"},{"key":"rssi0","value":-82},
  //	  {"key":"ssid1","value":"88:41:fc:d6:00:00"},{"key":"rssi1","value":-91},
  //  	  {"key":"ssid2","value":"18:d6:c7:3c:00:00"},{"key":"rssi2","value":-92}
  //	],
  //	"action":"write"
  //  }
  console.log('geolocate', params);
  const thingToken = params.thingToken;
  if (!thingToken) { throw new Error('missing thingToken'); }
  const values = params.values;
  if (!values) { throw new Error('missing values'); }
  
  //  Compile the list of access points.
  var accessPoints = [];
  for (var i = 0; i < 9; i++) {
    const ssid = values.reduce((found, x) => (x.key == ('ssid' + i) ? x.value : found), null);
    if (!ssid) { continue; }
  	const rssi = values.reduce((found, x) => (x.key == ('rssi' + i) ? x.value : found), null);
    if (!rssi) { continue; }
    accessPoints.push({
      macAddress: ssid,
      signalStrength: rssi
    });
  }
  console.log('accessPoints', accessPoints);
  if (accessPoints.length == 0) { throw new Error('missing access points'); }
  const device = values.reduce((found, x) => (x.key == 'device' ? x.value : found), null);

  //  Call the geolocation API.
  return geolocate(accessPoints, function(err, result) {
    if (err) { return callback(err); }
    const locationAccuracy = result.result;
    if (!locationAccuracy) { throw new Error('missing location accuracy'); }
    const locationAccuracyObj = JSON.parse(locationAccuracy);
    
    //  Save the location into the thing object.
    return saveLocation(thingToken, device, locationAccuracyObj, callback);
  });
}
