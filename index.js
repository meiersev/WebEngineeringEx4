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
				setImageOnScreens(getRemote(socket.id));
                //screen.socket.emit("display-image", remote.image + remote.numberOfConnections);
            } else {
                screen.socket.emit("remote-disconnected");
				setImageOnScreens(getRemote(socket.id));
            }
        });
        // handle event that the remote picked a new image.
        socket.on("remote-pick-image", function (index) {
            var remote = getRemote(socket.id);
            remote.image = index;
            setImageOnScreens(getRemote(socket.id));
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
			// That unfortunately does not work because socket.id 
			// is not initialized at this point
			// setImageOnScreens(socket.id);
			// Instead I used this hack, updating all remotes:
			setImageOnAllScreens();
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
	// Initialize number of connected screens to zero
	//var remote = getRemote(remoteSocket.id);
	//remote.numberOfConnections = 0;
	
    var screenNames = screens.map(function (s) {
        return s.name;
    });
    remoteSocket.emit("init-remote-with-screens", screenNames);
}

/** Set an image on all screens connected to given remote and index of the selected image.
 */
function setImageOnScreens(remote) {
	var index = remote.image;
	var imageIndexShift = 0;
	remote.screens.forEach(function (screenObj) {
		if (screenObj.connected) {
			var screen = getScreen(screenObj.id, "id");
			// Attention: This could exceed the array index and 
			// 	          must be handled on the client's side
			screen.socket.emit("display-image", index + imageIndexShift);
			imageIndexShift++; 
		}
	});
}

function setImageOnAllScreens(){
	for (var i = 0; i < remotes.length; i++) {
		var remote = remotes[i];
		setImageOnScreens(remote);
	}
}
