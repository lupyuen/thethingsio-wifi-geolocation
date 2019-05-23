# thethingsio-wifi-geolocation
thethings.io Cloud Code that transforms sensor values and calls an external API (Google WiFi Geolocation API)

Check out the tutorial:

[_Connect STM32 Blue Pill to ESP8266 with Apache Mynewt_](https://medium.com/@ly.lee/connect-stm32-blue-pill-to-esp8266-with-apache-mynewt-7edceb9e3b8d?source=friends_link&sk=df729a82533d817ec6b2d9b626b6f66b)

# thethings.io Cloud Code

The Cloud Code here demonstrates...

1.  How to transform sensor values and store the computed sensor values. 

    The code expects to receive a sensor value `t`, the  raw temperature value (integer).  

    The code computes the actual temperature `tmp` and stores the computed floating-point value into the thing state.  
  
    This is done with a Cloud Code Trigger `forward_geolocate` and Cloud Clode Functions `transform` and `update_state`

1.  How to call an external API (Google WiFi Geolocation API) with sensor values and save the returned values.  

    The code expects to receive a list of WiFi Access Point MAC Addresses and their Signal Strength, scanned by an ESP8266.  
    
    The code passes the WiFi info to the Google WiFi Geolocation API, which returns the estimated location (latitude, longitude) and accuracy (in metres).  The code stores the returned location and accuracy into the thing state.

    This is done with a Cloud Code Trigger `forward_geolocate` and Cloud Clode Functions `geolocate` and `update_state`

# STM32 Blue Pill Client

The above demo is designed to run with this Blue Pill client application, based on Apache Mynewt...

https://github.com/lupyuen/stm32bluepill-mynewt-sensor

The application sends raw temperature and WiFi access point data to thethings.io, to trigger the above functions.

# Publishing Sensor Data

`forward_geolocate` publishes the temperature and computed geolocation via HTTPS to `gcloud-wifi-geolocation`, a Go web application hosted on Google Cloud Standard App Engine that renders realtime geolocation on a map:

https://github.com/lupyuen/gcloud-wifi-geolocation

The publishing of sensor data is disabled by default. Change the settings at the top of `forward_geolocate` to enable the publishing
