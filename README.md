# thethingsio-wifi-geolocation
thethings.io Cloud Code that performs WiFi Geolocation by calling Google Geolocation API

Check out the article:

https://medium.com/@ly.lee/connect-stm32-blue-pill-to-esp8266-with-apache-mynewt-7edceb9e3b8d

thethings.io Cloud Code Trigger `forward_geolocate` receives WiFi Access Point MAC Addressed and Signal Strength via CoAP (UDP), scanned by STM32 Blue Pill, running Apache Mynewt connected to ESP8266:

https://github.com/lupyuen/stm32bluepill-mynewt-sensor

`forward_geolocate` forwards the WiFi data to Cloud Code Function `geolocate`, which calls the Google Geolocation API to compute the latitude and longitude based on the WiFi data.  The computed latitude and longitude are saved into the thing object.

`forward_geolocate` then pushes the computed geolocation via HTTPS to `gcloud-wifi-geolocation`, a Go web application hosted on Google Cloud Standard App Engine that renders realtime geolocation on a map:

https://github.com/lupyuen/gcloud-wifi-geolocation

If the sensor data contains raw temperature `t`, `forward_geolocate` forwards the request to Cloud Code Function `transform`.

Cloud Code Function `transform` converts the raw temperature `t` into computed temperature `tmp` and updates the thing object.

This demo shows how raw sensor values may be transmitted to thethings.io as integers and transformed into actual sensor values as floating-point numbers.
