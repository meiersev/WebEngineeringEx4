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
        style.display = style.display == "none" || style.display == ""  ? "block" : "none";
    });
    connectToServer();
});

function connectToServer() {
    // TODO connect to the socket.io server

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
                console.log(1);
                button.innerHTML = CONNECT_STR;
            } else {
                console.log(2);
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
    screens.filter(function (element) {
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