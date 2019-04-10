# thethingsio-wifi-geolocation
thethings.io Cloud Code that performs WiFi Geolocation by calling Google Geolocation API

thethings.io Cloud Code Trigger `forward_geolocate` receives WiFi Access Point MAC Addressed and Signal Strength via CoAP (UDP), scanned by STM32 Blue Pill, running Apache Mynewt connected to ESP8266:

https://github.com/lupyuen/stm32bluepill-mynewt-sensor/tree/esp8266

`forward_geolocate` forwards the WiFi data to Cloud Code Function `geolocate`, which calls the Google Geolocation API to compute the latitude and longitude based on the WiFi data.  The computed latitude and longitude are saved into the thing object.

`forward_geolocate` then pushes the computed geolocation via HTTPS to `gcloud-wifi-geolocation`, a Go web application hosted on Google Cloud Standard App Engine that renders realtime geolocation on a map:

https://github.com/lupyuen/gcloud-wifi-geolocation
