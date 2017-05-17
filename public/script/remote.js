var currentImage = 0; // the currently selected image
var imageCount = 7; // the maximum number of images available
var socket = io();

var screens = [];

const CONNECT_STR = "Connect";
const DISCONNECT_STR = "Disconnect";

function showImage (index) {
    // Update selection on remote
    currentImage = index;
    var images = document.querySelectorAll("img");
    document.querySelector("img.selected").classList.toggle("selected");
    images[index].classList.toggle("selected");

    // Send the command to the screen
    socket.emit("remote-pick-image", index);
}

function initialiseGallery() {
    // var container = document.querySelector('#gallery');
    var i, img;
    for (i = 0; i < imageCount; i++) {
        img = document.createElement("img");
        img.src = "images/" +i +".jpg";
		img.id = "image_" + i;
        document.body.appendChild(img);
        var handler = (function(index) {
            return function() {
                showImage(index);
            }
        })(i);
        img.addEventListener("click",handler);
    }

    document.querySelector("img").classList.toggle('selected');
}

document.addEventListener("DOMContentLoaded", function() {
    initialiseGallery();

    document.querySelector('#toggleMenu').addEventListener("click", function(){
        var style = document.querySelector('#menu').style;
        style.display = style.display == "none" || style.display == "" ? "block" : "none";
    });
	initialiseDeviceMotion();
    initialiseDeviceOrientation();
    connectToServer();
});

function connectToServer() {
    socket.emit("connect-remote");
    socket.on("init-remote-with-screens", function (screenNames) {
        screenNames.forEach(function (s) {
            addScreenToList(s);
        })
    });
    socket.on("new-screen-connected", function (name) {
        addScreenToList(name);
    });
    socket.on("screen-disconnected", function (name) {
        removeScreenFromList(name);
    })
}

function getScreen(name) {
    for (var i = 0; i < screens.length; ++i) {
        if (screens[i].name == name) {
            return screens[i];
        }
    }
}

// Add a list element showing the available screens and a button.
function addScreenToList(name) {
    screens.push({name: name, connected: false});

    var li = document.createElement("li");
    li.textContent = name;
    var button = document.createElement("button");
    button.innerHTML = CONNECT_STR;
    button.classList.add("pure-button");
    var handler = (function(screenName) {
        return function() {
            var screen = getScreen(screenName);
            console.log(screen);
            screen.connected = !screen.connected;
            if (!screen.connected) {
                button.innerHTML = CONNECT_STR;
            } else {
                button.innerHTML = DISCONNECT_STR;
            }
            socket.emit("toggle-screen-connection", screenName);
        }
    })(name);
    button.addEventListener("click", handler);
    li.appendChild(button);
    document.querySelector("#menu ul").appendChild(li)
}

function removeScreenFromList(name) {
    screens = screens.filter(function (element) {
        return element.name != name;
    });

    var listItems = document.querySelectorAll("#menu ul li");
    for (var i = 0; i < listItems.length; ++i) {
        var item = listItems[i];
        if (item.innerHTML.indexOf(name) == 0) {
            item.parentNode.removeChild(item);
        }
    }
}

/*
 * Exercise 4.2
 */
var lastJerkEvent;
var lastOrientationEvent;
var lastOrientaionLevel;

function initialiseDeviceMotion() {
	if (window.DeviceMotionEvent) {
		lastJerkEvent = new Date().getTime();
		document.getElementById("dmEvent").innerHTML = "Device motions are supported."
		window.addEventListener('devicemotion', deviceMotionHandler, false);
	} else {
		document.getElementById("dmEvent").innerHTML = "Device motions are not supported."
	}
}

function initialiseDeviceOrientation() {
	if (window.DeviceOrientationEvent) {
		lastOrientationEvent = new Date().getTime();
        lastOrientaionLevel  = 0;
		document.getElementById("doEvent").innerHTML = "Device orientations are supported."
		window.addEventListener('deviceorientation', deviceOrientationHandler, false);
	} else {
		document.getElementById("doEvent").innerHTML = "Device orientations are not supported."
	}
}

function deviceOrientationHandler(eventData){
	var interval = 300;
	var d = new Date();
    var range =  (eventData.beta / 15) | 0;
        if (range>= 3){
            range = 3;
        }
        if (range <= 0){
            range = 0;
        }

	if (lastOrientationEvent + interval < d.getTime() && 
            lastOrientaionLevel != range ) {
        lastOrientationEvent = d.getTime();
        lastOrientaionLevel = range;

        socket.emit("zoomLevel", range);
    }
}


/* Available data:
 *	  eventData.acceleration.{x,y,z}
 *	  eventData.accelerationIncludingGravity.{x,y,z}
 *	  eventData.rotationRate.{alpha,beta,gamma}
 */
function deviceMotionHandler(eventData) {
    var jerkThreshold = 15.0;
	var interval = 300;
	var d = new Date();
	if (lastJerkEvent + interval < d.getTime() ) {
		if(eventData.acceleration.x > jerkThreshold){
			lastJerkEvent = d.getTime();
			id = "image_" + ((currentImage + 1)%imageCount);
			eventFire(document.getElementById(id), 'click');
			//alert("Clicked " + id);
		}
		else if(eventData.acceleration.x < -jerkThreshold){
			lastJerkEvent = d.getTime();
			id = "image_" + ((currentImage + imageCount - 1)%imageCount);
			eventFire(document.getElementById(id), 'click');
			//alert("Clicked " + id);
		}
	}
}

/*
 * Simulates a click
 * copy-pasted from: http://stackoverflow.com/questions/2705583/how-to-simulate-a-click-with-javascript
 */
function eventFire(el, etype){
  if (el.fireEvent) {
    el.fireEvent('on' + etype);
  } else {
    var evObj = document.createEvent('Events');
    evObj.initEvent(etype, true, false);
    el.dispatchEvent(evObj);
  }
}
 
