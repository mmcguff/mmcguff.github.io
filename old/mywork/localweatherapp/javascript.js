
var x = '';
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        x.innerHTML = "Geolocation is not supported by this browser.";
    }
}

function showPosition(position) {
    var lat = position.coords.latitude;
    var lon = position.coords.longitude;

    var url = 'https://fcc-weather-api.glitch.me/api/current?lat=' + lat + '&lon=' + lon;
    console.log(url);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var obj = JSON.parse(this.responseText);
            var temp = obj.main.temp;

            document.getElementById("fcc_location_label").innerHTML = "<b>Location: </b>";
            document.getElementById("fcc_location").innerHTML = obj.name;
            document.getElementById("fcc_time_label").innerHTML = "<b>Time: </b>";
            document.getElementById("time").innerHTML = getTime();
            document.getElementById("fcc_description_label").innerHTML = "<b>Description: </b>";
            document.getElementById("fcc_description").innerHTML = obj.weather[0].description;
            document.getElementById("fcc_weather_icon").innerHTML = "<img id='icon' src=" + obj.weather[0].icon + ">";
            document.getElementById("fcc_temp_label").innerHTML = "<b>Temperature: </b>";
            document.getElementById("fcc_temp").innerHTML = "<span id='temp'>" + temp + "</span> °C";
            convertToF();
            document.getElementById("fcc_humidity_label").innerHTML = "<b>Humidity: </b>";
            document.getElementById("fcc_humidity").innerHTML = obj.main.humidity + "%";
            document.getElementById("fcc_wind_speed_label").innerHTML = "<b>Wind Speed: </b>";
            document.getElementById("fcc_wind_speed").innerHTML = obj.wind.speed + " mph  " + getWindDirection(obj.wind.deg);
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
    //url = JSON.stringify(url);
    //var obj = JSON.parse();

    //  document.getElementById("weather").innerHTML = url;//obj.name;
}

function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            x.innerHTML = "User denied the request for Geolocation."
            break;
        case error.POSITION_UNAVAILABLE:
            x.innerHTML = "Location information is unavailable."
            break;
        case error.TIMEOUT:
            x.innerHTML = "The request to get user location timed out."
            break;
        case error.UNKNOWN_ERROR:
            x.innerHTML = "An unknown error occurred."
            break;
    }
}

function getTime() {
    var date = new Date();
    var weekday = new Array(7);
    weekday[0] = "Sunday";
    weekday[1] = "Monday";
    weekday[2] = "Tuesday";
    weekday[3] = "Wednesday";
    weekday[4] = "Thursday";
    weekday[5] = "Friday";
    weekday[6] = "Saturday";

    var dayOfWeek = weekday[date.getDay()];
    var localTime = date.toLocaleTimeString();

    return localTime;

}

function getWindDirection(deg) {

    var wBearing = deg;

    var wDir = "";
    if (wBearing >= 348.75 || wBearing < 11.25) { return wDir = "N"; } else
        if (wBearing >= 11.25 && wBearing < 33.75) { return wDir = "NNE"; } else
            if (wBearing >= 33.75 && wBearing < 56.25) { return wDir = "NE"; } else
                if (wBearing >= 56.25 && wBearing < 78.75) { return wDir = "ENE"; } else
                    if (wBearing >= 78.75 && wBearing < 101.25) { return wDir = "E"; } else
                        if (wBearing >= 101.25 && wBearing < 123.75) { return wDir = "ESE"; } else
                            if (wBearing >= 123.75 && wBearing < 146.25) { return wDir = "SE"; } else
                                if (wBearing >= 146.25 && wBearing < 168.75) { return wDir = "SSE"; } else
                                    if (wBearing >= 186.75 && wBearing < 191.25) { return wDir = "S"; } else
                                        if (wBearing >= 191.25 && wBearing < 213.75) { return wDir = "SSW"; } else
                                            if (wBearing >= 213.75 && wBearing < 236.25) { return wDir = "SW"; } else
                                                if (wBearing >= 236.25 && wBearing < 258.75) { return wDir = "WSW"; } else
                                                    if (wBearing >= 258.75 && wBearing < 281.25) { return wDir = "W"; } else
                                                        if (wBearing >= 281.25 && wBearing < 303.75) { return wDir = "WNW"; } else
                                                            if (wBearing >= 303.75 && wBearing < 326.25) { return wDir = "NW"; } else
                                                            { return wDir = "NNW"; };
}


//lets create a convert to Farenthiet function as well. 
function convertToF() {
    var loc = document.getElementById("fcc_location").innerHTML;
    var c = document.getElementById('temp').innerHTML;
    var f = Math.round((c * 1.8 + 32) * 100) / 100;
    document.getElementById("fcc_temp").innerHTML = "<span id='temp' onClick='convertToC()'>" + f + "</span><a onClick='convertToC()'> °F</a>";
    document.getElementsByTagName("TITLE")[0].text = f + " °F | " + loc;
}

function convertToC() {
    var loc = document.getElementById("fcc_location").innerHTML;
    var f = document.getElementById('temp').innerHTML;
    var c = Math.round(((f - 32) / 1.8) * 100) / 100;
    document.getElementById("fcc_temp").innerHTML = "<span id='temp' onClick='convertToF()'>" + c + "</span><a onClick='convertToF()'> °C</a>";
    document.getElementsByTagName("TITLE")[0].text = c + " °C | " + loc;
}
