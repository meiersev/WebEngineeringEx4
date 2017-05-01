var imageCount = 7; // the maximum number of images available

var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

var remotes = [];
var screens = [];

app.use(express.static("public"));

http.listen(8080, function(){
    console.log("listening on *:8080");
});

io.on("connection", function(socket) {

    // add a newly connected remote to the system and initialize the callbacks.
    socket.on("connect-remote", function() {
        console.log("connected remote");
        addRemote(socket);
        initRemoteWithScreens(socket);
        // handle event when the remote connects/disconnects to a screen.
        socket.on("toggle-screen-connection", function (screenName) {
            var screen = getScreen(screenName, "name");
            var remote = getRemote(socket.id);
            var connected = toggleRemoteScreenConnection(remote, screen);
            if (connected) {
                screen.socket.emit("display-image",
                    calcImageIndex(remote.image, getNumberOfConnectedScreens(remote) - 1));
            } else {
                screen.socket.emit("remote-disconnected");
                setImageOnScreens(socket.id, remote.image);
            }
        });
        // handle event that the remote picked a new image.
        socket.on("remote-pick-image", function (index) {
            var remote = getRemote(socket.id);
            remote.image = index;
            setImageOnScreens(socket.id, index);
        });
        // handle disconnection of the remote.
        socket.on("disconnect", function() {
            console.log("disconnected remote");
            removeRemote(socket.id);
        });
    });
    // add a newly connected screen to the system and initialize callbacks.
    socket.on("connect-screen", function(screenName) {
        console.log("connected screen: " + screenName);
        socket.broadcast.emit("new-screen-connected", screenName);
        addScreen(socket, screenName);

        socket.on("disconnect", function() {
            console.log("disconnected screen " + screenName);
            removeScreen(socket.id);
        });
    });
});

/** Add a new remote to the system.
 */
function addRemote(socket) {
    remotes.push({
        socket: socket,
        id: socket.id,
        screens: initializeRemoteScreenArray(),
        image: 0
    });
}

/** Get a remote object given a socket id.
 */
function getRemote(socketId) {
    for (var i = 0; i < remotes.length; ++i) {
        if (remotes[i].id == socketId) return remotes[i];
    }
}

/** Remove a remote from the system. Tell all screens it was connected to.
 */
function removeRemote(id) {
    for (var i = 0; i < remotes.length; ++i) {
        if (remotes[i].id == id) {
            remotes[i].screens.forEach(function (screenObj) {
                if (screenObj.connected) {
                    screenObj.socket.emit("remote-disconnected");
                }
            });
            remotes.splice(i, 1);
            return true;
        }
    }
    return false;
}

/** Add a new screen to the system. Update all remotes also.
 */
function addScreen(socket, name) {
    screens.push({
        socket: socket,
        id: socket.id,
        name: name
    });
    addScreenToRemotes(socket, name);
}

/** Get a screen from the local list, where 'key' is the value of a given property of the screen object.
 */
function getScreen(key, property) {
    for (var i = 0; i < screens.length; ++i) {
        if (screens[i][property] == key) return screens[i];
    }
}

/** Remove a screen from the system and tell all remotes it is gone.
 */
function removeScreen(id) {
    for (var i = 0; i < screens.length; ++i) {
        if (screens[i].id == id) {
            io.emit("screen-disconnected", screens[i].name);
            screens.splice(i, 1);
            removeScreenFromRemotesList(id);
            return true;
        }
    }
    return false;
}

/** Initialize an array of screens to be kept by a remote.
 */
function initializeRemoteScreenArray() {
    return screens.map(function(el) {
        return {
            socket: el.socket,
            id: el.id,
            name: el.name,
            connected: false
        };
    });
}

/** Add a new screen to all remote objects.
 */
function addScreenToRemotes(socket, screenName) {
    remotes.forEach(function (element) {
        element.screens.push({
            socket: socket,
            id: socket.id,
            name: screenName,
            connected: false
        });
    });
}

/** Remove a screen from all screen lists kept by the remotes.
 */
function removeScreenFromRemotesList(id) {
    remotes.forEach(function (remote) {
        for (var i = 0; i < remote.screens.length; ++i) {
            if (remote.screens[i].id == id) {
                remote.screens.splice(i, 1);
                break;
            }
        }
    })
}

/** Change the connected status between a remote and a screen.
 */
function toggleRemoteScreenConnection(remote, screen) {
    for (var i = 0; i < remote.screens.length; ++i) {
        var s = remote.screens[i];
        if (s.id == screen.id) {
            s.connected = !s.connected;
            return s.connected;
        }
    }
}

/** Send the names of all the screens in the system to a remote.
 */
function initRemoteWithScreens(remoteSocket) {
    var screenNames = screens.map(function (s) {
        return s.name;
    });
    remoteSocket.emit("init-remote-with-screens", screenNames);
}

/** Set an image on all screens connected to given remote and index of the selected image.
 */
function setImageOnScreens(remoteSocketId, index) {
    var remote = getRemote(remoteSocketId);
    var offset = 0;
    remote.screens.forEach(function (screenObj) {
        if (screenObj.connected) {
            var screen = getScreen(screenObj.id, "id");
            screen.socket.emit("display-image", calcImageIndex(index, offset));
            ++offset;
        }
    });
}

/** Calculate an index from a starting index plus an offset. Returns a number between 0 and imageCount.
 */
function calcImageIndex(index, offset) {
    return (index + offset) % imageCount;
}

/** Given a remote object, count the number of connected screens.
 */
function getNumberOfConnectedScreens(remote) {
    return remote.screens.filter(function (screenObj) {
        return screenObj.connected;
    }).length;
}
