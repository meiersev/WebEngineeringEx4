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

    socket.on("connect-remote", function() {
        console.log("connected remote");
        addRemote(socket);
        initRemoteWithScreens(socket);

        socket.on("toggle-screen-connection", function (screenName) {
            var screen = getScreen(screenName, "name");
            var remote = getRemote(socket.id);
            var connected = toggleRemoteScreenConnection(remote, screen);
            if (connected) {
                screen.socket.emit("display-image", remote.image);
            } else {
                screen.socket.emit("remote-disconnected");
            }
        });

        socket.on("remote-pick-image", function (index) {
            var remote = getRemote(socket.id);
            remote.image = index;
            setImageOnScreens(socket.id, index);
        });

        socket.on("disconnect", function() {
            console.log("disconnected remote");
            removeRemote(socket.id);
        });
    });
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

function addRemote(socket) {
    remotes.push({
        socket: socket,
        id: socket.id,
        screens: initializeRemoteScreenArray(),
        image: 0
    });
}

function getRemote(socketId) {
    for (var i = 0; i < remotes.length; ++i) {
        if (remotes[i].id == socketId) return remotes[i];
    }
}

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

function addScreen(socket, name) {
    screens.push({
        socket: socket,
        id: socket.id,
        name: name
    });
    addScreenToRemotes(socket, name);
}

function getScreen(key, property) {
    for (var i = 0; i < screens.length; ++i) {
        if (screens[i][property] == key) return screens[i];
    }
}

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

function toggleRemoteScreenConnection(remote, screen) {
    for (var i = 0; i < remote.screens.length; ++i) {
        var s = remote.screens[i];
        if (s.id == screen.id) {
            s.connected = !s.connected;
            return s.connected;
        }
    }
}

function initRemoteWithScreens(remoteSocket) {
    var screenNames = screens.map(function (s) {
        return s.name;
    });
    remoteSocket.emit("init-remote-with-screens", screenNames);
}

function setImageOnScreens(remoteSocketId, index) {
    var remote = getRemote(remoteSocketId);
    remote.screens.forEach(function (screenObj) {
        if (screenObj.connected) {
            var screen = getScreen(screenObj.id, "id");
            screen.socket.emit("display-image", index);
        }
    })
}
