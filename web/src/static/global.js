(function wrapper() {
    "use strict";
(function prefSetup() {
    window.localPrefDefault = {
        "table": {
            "cols": {
                "name": {
                    "width": 500000,
                    "index": 0,
                    "visible": true
                },
                "time": {
                    "width": "auto",
                    "index": 1,
                    "visible": true
                },
                "artist": {
                    "width": 250000,
                    "index": 2,
                    "visible": true
                },
                "album": {
                    "width": 250000,
                    "index": 3,
                    "visible": true
                },
                "dateAdded": {
                    "width": "auto",
                    "index": 4,
                    "visible": true
                },
                "plays": {
                    "width": "auto",
                    "index": 5,
                    "visible": true
                }
            },
            "colOrder": ["name", "time", "artist", "album", "dateAdded", "plays"]
        },
        "sidebar": {
            "width": 200,
            "visible": false
        }
    };
    if (!localStorage.getItem("localPref")) {
        localStorage.setItem("localPref", JSON.stringify(localPrefDefault));
    }
    window.localPref = JSON.parse(localStorage.getItem("localPref"));
    window.updateLocalPref = function() {
        localStorage.setItem("localPref", JSON.stringify(localPref));
    };
    window.colMinWidths = {
        "name": 100,
        "time": 50,
        "artist": 100,
        "album": 100,
        "dateAdded": 95,
        "plays": 60
    };
})();

function xhr(reqContent, url, callback, options) {
    if (typeof options == "undefined") options = {};
    var xhr = new XMLHttpRequest();
    if (options.type == undefined)        options.type = "POST";
    if (options.contentType == undefined) options.contentType = "values";
    xhr.open(options.type, url, true);
    if (options.contentType == "values") {
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    } else if (options.contentType == "multipart") {
        // xhr.setRequestHeader("Content-type", "multipart/form-data");
    }
    xhr.send(reqContent);
    xhr.onreadystatechange = function() {
        if (this.readyState == 4) {
            if      (this.status == 200) callback(this.responseText, false);
            else if (this.status == 404) callback(this.responseText, 404);
        }
    };
}
function changePage(path, pushState) {
    if (typeof pushState == "undefined") pushState = true;
    if (!loggedIn && path == "/") initPage(path);
    else {
        xhr("", path, function(res, err) {
            if (!pushState) history.replaceState({path: path}, "exampletitle");
            else history.pushState({path: path}, "sampletitle", path);

            if (err == 404) initPage("/404", res);
            else if (!err) {
                res = JSON.parse(res);
                initPage(path, res);
            }
        });
    }
}
function initPage(path, res) {
    // reset stuff from last page
    playlistHeader.style.display = "none";
    window.pagePlaylistId = null;
    window.pagePlaylistName = null;

    window.trackCount = 0;
    window.page = path;
    if (loggedIn) {
        if (path == "/") {
            insertPlaylists(res.playlists, true);
            insertTracks(res.tracks, true);
        } else if (path.startsWith("/playlist/")) {
            insertPlaylists(res.playlists, true);
            insertTracks(res.tracks, true);
            setPlaylistHeader(res.playlist);
            pagePlaylistId = res.playlist.playlistId;
            pagePlaylistName = res.playlist.name;
            page = "/";
        }
    }
    // turn off active pages
    var activePages = document.querySelectorAll(".page-container.active");
    for (var i = 0; i < activePages.length; i++) {
        activePages[i].classList.remove("active");
    }
    // turn on new page
    var selector;
    if (loggedIn) {
        selector = ".page-container.logged-in[data-page='"+page+"']";
    } else {
        selector = ".page-container.logged-out[data-page='"+page+"']";
    }
    var container = document.querySelector(selector);
    container.classList.add("active");
}

window.addEventListener("popstate", function(e) {
    changePage(e.state.path, true);
});
document.addEventListener("click", function(e) {
    var cl = e.target.classList;
    if (e.button == 0) {
        if (e.target.attributes.href) {
            e.preventDefault();
            changePage(e.target.attributes.href.value);
        } else if (cl.contains("logout-button")) {
            logout();
        } else if (e.target.tagName == "BUTTON") {
            if      (cl.contains("login"))    clickLogin();
            else if (cl.contains("register")) clickRegister();
        }
    }
});
document.addEventListener("keydown", function(e) {
    if (e.which == 13 && e.target.classList.contains("for-register")) { // enter
        var cl = e.target.parentElement.parentElement.classList;
        if (cl.contains("login")) clickLogin();
        else if (cl.contains("register")) clickRegister();
    } else if (e.keyCode == 27) { // escape
        closeDialog();
        closeContextMenu();
    }
});
document.addEventListener("mouseover", function(e) {
    if (e.target.classList.contains("cell") && e.target.dataset.track) {
        var id = e.target.dataset.track;
        var hoveredTrack = document.querySelectorAll('.music-table .cell[data-track="'+id+'"]');
        for (var i = 0; i < hoveredTrack.length; i++) {
            hoveredTrack[i].classList.add("hover");
        }
    }
});
document.addEventListener("mouseout", function(e) {
    if (e.target.classList.contains("cell") && e.target.dataset.track) {
        var id = e.target.dataset.track;
        var hoveredTrack = document.querySelectorAll('.music-table .cell[data-track="'+id+'"]');
        for (var i = 0; i < hoveredTrack.length; i++) {
            hoveredTrack[i].classList.remove("hover");
        }
    }
});
(function commonFunctions() {
    window.logout = function() {
        xhr("", "/logout", function(res) {
            res = JSON.parse(res);
            if (res.errors) console.log(errors);
            else {
                loggedIn = false;
                changePage("/");
            }
        });
    };
    window.hasClass = function(el, cls, startsWith) {
        if (typeof startsWith == "undefined") startsWith = false;
        var classes = cls.split(","); // or
        for (var ci = 0; ci < classes.length; ci++) { // classIndex
            if (!startsWith && el.classList.contains(classes[ci])) return true;
            for (var eci = 0; eci < el.classList.length; eci++) { // elementClassIndex
                if (startsWith && el.classList[eci].startsWith(classes[ci])) {
                    return el.classList[eci];
                }
            }
        }
        return false;
    };
    window.insideClass = function(el, cls) {
        if (hasClass(el, cls)) return el;
        while (el.parentElement) {
            el = el.parentElement;
            if (hasClass(el, cls)) return el;
        }
        return false;
    };
    window.insideDataset = function(e, dataset) {
        var el = e.target;
        if (el.dataset && el.dataset.hasOwnProperty(dataset)) {
            return el.dataset[dataset];
        } else {
            while (el.parentElement) {
                el = el.parentElement;
                if (el.dataset && el.dataset.hasOwnProperty(dataset)) {
                    return el.dataset[dataset];
                }
            }
        }
        return false;
    };
    window.updateColWitdthPref = function(grab) {
        if (typeof grab == "undefined") grab = false;
        // grab or set preference?
        var flexibleCols = document.querySelectorAll(".music-table > .col.flexible-width");
        for (var i = 0; i < flexibleCols.length; i++) {
            var colName = flexibleCols[i].dataset.colName;
            if (grab) flexibleCols[i].style.flexGrow = localPref.table.cols[colName].width;
            else             localPref.table.cols[colName].width = flexibleCols[i].style.flexGrow;
        }
        if (!grab) updateLocalPref();
    };
    window.addEvents = function(el, events, handler) {
        for (var i = 0; i < events.length; i++) {
            el.addEventListener(events[i], handler);
        }
    };

    var notifications = document.querySelector(".notifications");
    window.notify = function(message, two, buttonMsg, buttonCallback) {
        // two is optional, can be error boolean or lifespan number
        var lifespan = 10000;
        var error = two;
        if (typeof error != "boolean" && typeof error != "number") {
            buttonCallback = buttonMsg;
            buttonMsg = error;
        } else if (typeof error == "number") {
            lifespan = error;
            error = false;
        }
        // create element
        var notification = document.createElement("div");
        notification.classList.add("notification");
        if (error) notification.classList.add("err");
        var innerHTML = '<p class="msg">'+message+"</p>";
        if (buttonMsg) innerHTML += "<button>"+buttonMsg+"</button>";
        innerHTML = '<div class="container">'+innerHTML+"</div>";
        notification.innerHTML = innerHTML;
        notifications.append(notification);

        // button
        function buttonClick() {
            hideNotification();
            buttonCallback();
        }
        if (buttonMsg) {
            var button = notification.querySelector("button");
            button.addEventListener("click", buttonClick);
        }

        // fade in
        setTimeout(function() {
            notification.classList.add("fade-in");
        }, 10);

        // fade out
        var hidden = false;
        function hideNotification() {
            if (!hidden) {
                hidden = true;
                if (buttonMsg) button.removeEventListener("click", buttonClick);
                notification.classList.add("faded-in");
                notification.classList.add("fade-out");
                setTimeout(function() {
                    notifications.removeChild(notification);
                }, 1000);
            }
        }
        setTimeout(hideNotification, lifespan);
    };
})();
(function POSTs() {
    // tracks
    window.uploadTracks = function(files) {
        var data = new FormData();
        for (var i = 0; i < files.length; i++) {
            data.append("tracks", files[i], files[i].name);
        }
        xhr(data, "/upload-tracks", function(res) {
            res = JSON.parse(res);
            if (res.errors) {
                console.log(res.errors);
            } else {
                notify("Successfully uploaded tracks");
            }
        }, {contentType: "multipart"});
    };
    window.deleteTrack = function(trackId) {
        var req = "trackId="+trackId;
        var description = "Are you sure you want to delete this track?";
        openDialog("confirm", "Delete track", description, "Delete track", function() {
            perform();
        });
        function perform() {
            xhr(req, "/delete-track", function(res) {
                res = JSON.parse(res);
                if (res.errors) {
                    notify("An unknown error occured while deleting the track", true);
                } else {
                    var selector = '.music-table .cell[data-track-id="'+trackId+'"]';
                    var trackCells = document.querySelectorAll(selector);
                    for (var i = 0; i < trackCells.length; i++) {
                        trackCells[i].parentElement.removeChild(trackCells[i]);
                    }
                    notify("Deleted track", "UNDO", function() {
                        reviveTrack(trackId, true);
                    });
                }
            });
        }
    };
    window.reviveTrack = function(trackId, undo) {
        var req = "trackId="+trackId;
        xhr(req, "/revive-track", function(res) {
            res = JSON.parse(res);
            if (undo) {
                if (res.errors) {
                    notify("An unknown error occured while undoing", true);
                } else {
                    insertTracks(res.tracks, false);
                    notify("Undo successful");
                }
            }
        });
    };
    // playlists
    window.createPlaylist = function(name, description) {
        var req =
        "name="+name+
        "&description="+description;
        xhr(req, "/create-playlist", function(res) {
            res = JSON.parse(res);
            if (res.errors) {
                console.log(res.errors);
                notify("An unknown error occured while creating playlist", true);
            } else {
                insertPlaylists([{
                    playlistId: res.playlistId,
                    name: name
                }]);
                notify("Created playlist", "UNDO", function() {
                    deletePlaylist(res.playlistId, null, true);
                });
            }
        });
    };
    window.addTrackToPlaylist = function(trackId, playlistId, undo) {
        var req =
        "trackId="+trackId+
        "&playlistId="+playlistId;
        var url = "/add-track-to-playlist";
        xhr(req, url, function(res) {
            res = JSON.parse(res);
            if (undo) {
                if (res.errors) {
                    console.log(res.errors);
                    notify("An unknown error occured while undoing", true);
                } else {
                    notify("Undo successful", "UNDO");
                }
            } else {
                if (res.errors) {
                    if (res.errors.duplicate) {
                        notify("The track is already in that playlist", true);
                    } else {
                        console.log(res.errors);
                        notify("An unknown error occured while undoing", true);
                    }
                } else {
                    notify("Added track to playlist", "UNDO", function() {
                        removeTrackFromPlaylist(trackId, playlistId, true);
                    });
                }
            }
        });
    };
    window.removeTrackFromPlaylist = function(trackId, playlistId, undo) {
        var req =
        "trackId="+trackId+
        "&playlistId="+playlistId;
        var url = "/remove-track-from-playlist";
        xhr(req, url, function(res) {
            res = JSON.parse(res);
            if (undo) {
                if (res.errors) {
                    notify("An unknown error occured while undoing", true);
                } else {
                    notify("Undo successful", 3000);
                }
            } else {
                if (res.errors) {
                    notify("An unknown error occured while removing the track from the that playlist", true);
                } else {
                    notify("Track removed from playlist", 3000);
                }
            }
        });
    };
    window.deletePlaylist = function(playlistId, name, undo) {
        var req = "playlistId="+playlistId;
        if (undo) {
            perform();
        } else {
            var description = "Are you sure you want to delete this playlist?";
            openDialog("confirm", "Delete playlist", description, "Delete Playlist", function() {
                perform();
            });
        }
        function perform() {
            xhr(req, "/delete-playlist", function(res) {
                res = JSON.parse(res);
                function performDelete() {
                    var selector = 'aside.sidebar .playlist[data-playlist-id="'+playlistId+'"]';
                    var sidebarItem = document.querySelector(selector);
                    sidebarItem.parentElement.removeChild(sidebarItem);
                    changePage("/");
                }
                if (undo) {
                    if (res.errors) {
                        notify("An unknown error occured while undoing", true);
                    } else {
                        performDelete();
                        notify("Undo successful");
                    }
                } else {
                    if (res.errors) {
                        notify("An unknown error occured while deleting the playlist", true);
                    } else {
                        performDelete();
                        notify("Deleted playlist", "UNDO", function() {
                            revivePlaylist(playlistId, name, true);
                        });
                    }
                }
            });
        }
    };
    window.revivePlaylist = function(playlistId, name, undo) {
        var req = "playlistId="+playlistId;
        xhr(req, "/revive-playlist", function(res) {
            res = JSON.parse(res);
            if (undo) {
                if (res.errors) {
                    notify("An unknown error occured while undoing", true);
                } else {
                    insertPlaylists([{
                        playlistId: playlistId,
                        name: name
                    }]);
                    notify("Undo successful");
                }
            }
        });
    };
})();
(function dialogs() {
    var fg = document.querySelector(".fg");
    var dialogContainer = document.querySelector(".dialogs");
    var dialog = null;
    var confirmTitle = dialogContainer.querySelector(".dialog.confirm .title");
    var confirmDescription = dialogContainer.querySelector(".dialog.confirm .description");
    var confirmButton = dialogContainer.querySelector(".dialog.confirm .primary.confirm");
    var confirmCallback;
    window.openDialog = function(type, title, description, confirmText, callback) {
        fg.classList.add("visible");
        fg.classList.remove("short");
        dialogContainer.classList.add("visible");
        dialog = document.querySelector(".dialogs > .dialog."+type);
        if (type == "confirm") {
            confirmTitle.innerHTML = title;
            confirmDescription.innerHTML = description;
            confirmButton.innerHTML = confirmText;
            confirmCallback = callback;
        }
        dialog.classList.add("visible");
        var focusThis = dialog.querySelector(".focus-this");
        focusThis.focus();
    };
    window.closeDialog = function() {
        fg.classList.remove("visible");
        dialogContainer.classList.remove("visible");
        dialog.classList.remove("visible");
    };
    document.addEventListener("click", function(e) {
        if (e.button == 0) {
            var cl = e.target.classList;
            if (insideClass(e.target, "dialogs")) {
                if (cl.contains("cancel")) {
                    closeDialog();
                } else if (cl.contains("create-playlist")) {
                    closeDialog();
                    var name = dialog.querySelector(".name").value;
                    var description = dialog.querySelector(".description").value;
                    createPlaylist(name, description);
                } else if (cl.contains("confirm") && cl.contains("primary")) {
                    closeDialog();
                    confirmCallback();
                }
            } else if (cl.contains("fg")) {
                closeDialog();
            }
        }
    });
    // add enter to create playlist
})();

// Context menus
function contextItemClick(context, ctxElement, element) {
    var data = ctxElement.dataset;
    if (context == "table-header") {
        if (data.col) {
            if (localPref.table.cols[data.col].visible) {
                localPref.table.cols[data.col].visible = false;
            } else {
                localPref.table.cols[data.col].visible = true;
            }
            updateColVisibility();
            updateLocalPref();
        } else if (data.type == "reset") {
            for (var i = 0; i < localPref.table.colOrder.length; i++) {
                var col = localPref.table.colOrder[i];
                localPref.table.cols[col].width = localPrefDefault.table.cols[col].width;
            }
            updateColWitdthPref(true);
            updateColWitdthPref();
        }
    } else if (context == "track") {
        if (data.type == "play") {
            playTrack(element.dataset.trackId);
        } else if (data.playlistId) {
            addTrackToPlaylist(element.dataset.trackId, data.playlistId, false);
        } else if (data.type == "delete") {
            deleteTrack(element.dataset.trackId);
        }
    } else if (context == "playlist") {
        if (data.type == "delete") {
            deletePlaylist(pagePlaylistId, pagePlaylistName);
        }
    }
}
(function contextMenu() {
    // event to open context menu
    document.addEventListener("contextmenu", function(e) {
        var contextMenu = insideDataset(e, "contextMenu");
        if (contextMenu && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            openContextMenu(contextMenu, e.clientX, e.clientY, e.target);
        } else {
            closeContextMenu();
        }
    });
    var currentContextMenu;
    var clickedContextElement;
    document.addEventListener("click", function(e) {
        if (e.target.classList.contains("context-item") && !e.target.classList.contains("arrow")) {
            contextItemClick(currentContextMenu, e.target, clickedContextElement);
            closeContextMenu();
        }
    });
    (function() { // triggers to close context menu
        document.addEventListener("mousedown", function(e) {
            if (!insideClass(e.target, "context-menu")) closeContextMenu();
        });
        window.addEventListener("blur", function(e) {
            closeContextMenu();
        });
        document.addEventListener("scroll", function(e) {
            closeContextMenu();
        });
    })();
    function closeSubmenus() {
        var submenus = document.querySelectorAll(".context-menu .arrow");
        for (var i = 0; i < submenus.length; i++) {
            submenus[i].classList.remove("hover");
        }
    }
    function openContextMenu(type, x, y, element) {
        currentContextMenu = type;
        clickedContextElement = element;
        var ctx = document.querySelector(".context-menu."+type);
        x += 1;
        y -= 4;
        ctx.style.display = "block";
        if (ctx.clientHeight + y + 10 > window.innerHeight) y = window.innerHeight - 10 - ctx.clientHeight;
        if (ctx.clientWidth + x + 10 > window.innerWidth) x = window.innerWidth - 10 - ctx.clientWidth;
        ctx.style.left = x+"px";
        ctx.style.top = y+"px";
        var ctxItemPos = 0;
        document.addEventListener("mouseover", function(e) {
            if (e.target.parentElement && e.target.parentElement.classList && e.target.parentElement.classList.contains("context-submenu")) {
                e.target.parentElement.parentElement.classList.add("hover");
            } else if (!insideClass(e.target, "context-submenu") && insideClass(e.target, "context-menu")) {
                closeSubmenus();
            }
        });
        for (var i = 0; i < ctx.children.length; i++) {
            var itemHeight = ctx.children[i].clientHeight;
            ctxItemPos += itemHeight;
            if (ctx.children[i].classList.contains("arrow")) {
                var padding = window.getComputedStyle(ctx).paddingTop;
                padding = Number(padding.substr(0, padding.length-2));
                var submenu = ctx.children[i].children[0];

                // make height not bigger than window
                var eo = 0; // extra offset
                submenu.style.height = "";
                if (submenu.clientHeight > window.innerHeight - 20) {
                    submenu.style.height = window.innerHeight - padding*2 - 20+"px";
                    eo = 12;
                }
                // make submenu not exceed bottom of window
                if (eo + y + ctxItemPos - itemHeight + submenu.clientHeight > window.innerHeight) {
                    var submenuEndPos = eo + y + ctxItemPos - itemHeight + submenu.clientHeight;
                    submenu.style.top = window.innerHeight - submenuEndPos - padding - 10+"px";
                }
                // show on right/left side
                if (ctx.clientWidth + ctx.children[i].clientWidth + x + 10 > window.innerWidth) {
                    ctx.children[i].children[0].style.left = "";
                    ctx.children[i].children[0].style.right = "100%";
                } else {
                    ctx.children[i].children[0].style.left = "100%";
                    ctx.children[i].children[0].style.right = "";
                }
            }
        }
    }
    window.closeContextMenu = function() {
        var ctxs = document.querySelectorAll(".context-menu");
        for (var i = 0; i < ctxs.length; i++) {
            ctxs[i].style.display = "none";
        }
        closeSubmenus();
    };
})();

// MUSIC PAGES
function insertPlaylists(playlists, deleteOld) {
    if (deleteOld) {
        var items = document.querySelectorAll('aside.sidebar .item.playlist');
        for (var i = 0; i < items.length; i++) {
            items[i].parentElement.removeChild(items[i]);
        }
        var selector = '[data-type="add-to-playlist"]';
        var contextItems = document.querySelectorAll(selector);
        for (var i = 0; i < contextItems.length; i++) {
            contextItems[i].innerHTML = "";
        }

    }
    var sidebar = document.querySelector("aside.sidebar");
    var ctxMenus = document.querySelectorAll('.context-menu [data-type="add-to-playlist"]');
    for (var i = 0; i < playlists.length; i++) {
        var item = document.createElement("a");
        item.classList.add("item", "playlist");
        item.setAttribute("data-playlist-id", playlists[i].playlistId);
        item.setAttribute("href", "/playlist/"+playlists[i].playlistId);
        item.innerHTML = playlists[i].name;
        sidebar.append(item);

        for (var mi = 0; mi < ctxMenus.length; mi++) {
            var ctxItem = document.createElement("div");
            ctxItem.classList.add("context-item");
            ctxItem.setAttribute("data-playlist-id", playlists[i].playlistId);
            ctxItem.innerHTML = playlists[i].name;
            ctxMenus[mi].append(ctxItem);
        }
    }
}
function insertTracks(tracks, deleteOld) {
    if (deleteOld) {
        var cells = document.querySelectorAll(".music-table .cell[data-track]");
        for (var i = 0; i < cells.length; i++) {
            cells[i].parentElement.removeChild(cells[i]);
        }
    }
    for (var i = 0; i < tracks.length; i++) {
        trackCount++;
        var cols = document.querySelectorAll(".music-table > .col");
        for (var ci = 0; ci < cols.length; ci++) {
            var cell = document.createElement("div");
            cell.classList.add("cell");
            cell.setAttribute("data-col-name", cols[ci].dataset.colName);
            cell.setAttribute("data-track", trackCount);
            cell.setAttribute("data-track-id", tracks[i].trackId);
            cell.innerHTML = tracks[i][cols[ci].dataset.colName];
            cols[ci].append(cell);
        }
    }
}
var playlistHeader = document.querySelector(".music-page > .playlist-header");
function setPlaylistHeader(playlist) {
    playlistHeader.style.display = "flex";
    var name = playlistHeader.querySelector("p.playlist-name");
    name.innerHTML = playlist.name;
    var description = playlistHeader.querySelector("p.playlist-description");
    description.innerHTML = playlist.description;
}
// table
updateColVisibility();
function updateColVisibility() {
    for (var i = 0; i < localPref.table.colOrder.length; i++) {
        var col = localPref.table.colOrder[i];
        var colEl = document.querySelector('.music-table > .col[data-col-name="'+col+'"]');
        var ctxItem = document.querySelector('.context-menu .context-item[data-col="'+col+'"]');
        if (localPref.table.cols[col].visible) {
            colEl.style.display = "";
            ctxItem.classList.add("checked");
        } else {
            colEl.style.display = "none";
            ctxItem.classList.remove("checked");
        }
    }
}
(function colResize() {
    updateColWitdthPref(true);
    function findNextCol(col, reverse) {
        if (reverse) col = col.previousElementSibling;
        else         col = col.nextElementSibling;
        if (col == null) return null;
        if (hasClass(col, "auto-width")) col = findNextCol(col, reverse);
        return col;
    }
    var mouseDown, mousePosX, oldWidth, oldWidthNext, flexibleCols, availWidth, nextColClass;
    document.addEventListener("mousedown", function(e) {
        if (e.button == 0 && e.target.classList.contains("col-resizer")) {
            e.preventDefault();
            mouseDown = true;
            mousePosX = e.clientX;
            mousePosStartX = mousePosX;
            currentColClass = e.target.classList[1];
            currentCol = document.querySelector('.music-table .col[data-col-name="'+currentColClass+'"]');
            nextCol = currentCol.nextElementSibling;
            nextCol = findNextCol(currentCol);
            if (nextCol == null) nextCol = findNextCol(currentCol, true);
            nextColClass = nextCol.classList[1];
            oldWidth = currentCol.clientWidth;
            oldWidthNext = nextCol.clientWidth;
            document.querySelector(".fg").style.pointerEvents = "auto";
            document.querySelector(".fg").style.cursor = "col-resize";

            flexibleCols = document.querySelectorAll(".music-table .col.flexible-width");
            availWidth = 0;
            for (var i = 0; i < flexibleCols.length; i++) {
                availWidth += flexibleCols[i].clientWidth;
                flexibleCols[i].style.width = flexibleCols[i].clientWidth+"px";
                flexibleCols[i].style.flexGrow = "";
            }
        }
    });
    document.addEventListener("mousemove", function(e) {
        if (mouseDown) {
            mousePosX = e.clientX;
            var widthDifference = mousePosX - mousePosStartX;
            var newWidth = oldWidth + widthDifference;
            var newWidthNext = oldWidthNext - widthDifference;

            // min widths
            var differenceFix;
            if (newWidth < colMinWidths[currentColClass]) {
                differenceFix = colMinWidths[currentColClass] - newWidth;
                newWidth += differenceFix;
                newWidthNext -= differenceFix;
            }
            if (newWidthNext < colMinWidths[nextColClass]) {
                differenceFix = colMinWidths[nextColClass] - newWidthNext;
                newWidth -= differenceFix;
                newWidthNext += differenceFix;
            }

            currentCol.style.width = newWidth+"px";
            nextCol.style.width = newWidthNext+"px";
        }
    });
    document.addEventListener("mouseup", function(e) {
        if (mouseDown) {
            mouseDown = false;
            document.querySelector(".fg").style.pointerEvents = "";

            for (var i = 0; i < flexibleCols.length; i++) {
                var newFlexWidth = flexibleCols[i].clientWidth*1000000;
                flexibleCols[i].style.flexGrow = newFlexWidth / availWidth;
            }
            for (var i = 0; i < flexibleCols.length; i++) {
                flexibleCols[i].style.width = "";
            }
            updateColWitdthPref();
        }
    });
})();
(function colRearrange() {
    // init column positions
    var colOrder = localPref.table.colOrder;
    var html = "";
    for (var i = 0; i < colOrder.length; i++) {
        var selector = '.music-table .col[data-col-name="'+colOrder[i]+'"]';
        html += document.querySelector(selector).outerHTML;
    }
    document.querySelector(".music-table").innerHTML = html;

    updateLastNonAuto();
    function updateLastNonAuto() {
        var existingLastNonAuto = document.querySelector(".last-non-auto");
        if (existingLastNonAuto) existingLastNonAuto.classList.remove("last-non-auto");
        var flexibleCols = document.querySelectorAll(".col.flexible-width");
        flexibleCols[flexibleCols.length-1].classList.add("last-non-auto");
    }

    var musicTable = document.querySelector(".music-table");
    var mouseDown, mousePosX, currentCol, nextCol, moveCount;
    musicTable.addEventListener("mousedown", function(e) {
        if (e.button == 0 && hasClass(e.target, "cell") && e.target.previousElementSibling == null) {
            e.preventDefault();
            moveCount = 0;
            mouseDown = true;
            mousePosX = e.clientX;
            mousePosStartX = mousePosX;
            currentCol = e.target.parentElement;
            nextCol = currentCol.nextElementSibling;
            prevCol = currentCol.previousElementSibling;
            currentCol.classList.add("rearranging");
            musicTable.classList.add("rearranging");
        }
    });
    document.addEventListener("mousemove", function(e) {
        if (mouseDown) {
            document.querySelector(".fg").style.pointerEvents = "auto";
            document.querySelector(".fg").style.cursor = "move";

            mousePosX = e.clientX;
            var difference = mousePosX - mousePosStartX;

            var remainding = difference, end = false, moveEnd = false;
            var reverse = remainding < 0 ? true : false;
            moveCount = 0;
            function moveOtherCols(col) {
                var next = col.nextElementSibling;
                if (reverse) next = col.previousElementSibling;
                if (next == null) end = true;
                if (!end) {
                    if (moveEnd) next.style.left = "0px";
                    else {
                        if (!reverse && remainding > next.clientWidth/2) {
                            remainding -= next.clientWidth;
                            next.style.left = -currentCol.clientWidth+"px";
                            moveCount++;
                        } else if (reverse && remainding < -next.clientWidth/2) {
                            remainding += next.clientWidth;
                            next.style.left = currentCol.clientWidth+"px";
                            moveCount--;
                        } else {
                            moveEnd = true;
                            next.style.left = "0px";
                        }
                    }
                    moveOtherCols(next);
                }
            }
            moveOtherCols(currentCol);
            currentCol.style.left = difference - remainding+"px";
        }
    });
    document.addEventListener("mouseup", function() {
        if (mouseDown) {
            mouseDown = false;
            currentCol.classList.remove("rearranging");
            musicTable.classList.remove("rearranging");
            document.querySelector(".fg").style.pointerEvents = "";
            var cols = document.querySelectorAll(".music-table .col");
            var newPos;
            for (var i = 0; i < cols.length; i++) {
                cols[i].classList.add("no-transition");
                cols[i].style.left = "";
                if (cols[i] == currentCol) newPos = i + moveCount;
            }
            var table = document.querySelector(".music-table");
            if      (moveCount > 0) table.insertBefore(currentCol, table.children[newPos+1]);
            else if (moveCount < 0) table.insertBefore(currentCol, table.children[newPos]);
            setTimeout(function() {
                for (var i = 0; i < cols.length; i++) {
                    cols[i].classList.remove("no-transition");
                }
            }, 10);
            if (moveCount != 0) {
                updateLastNonAuto();
                updateColPosPref();
            }
        }
    });
    function updateColPosPref() {
        var cols = document.querySelectorAll(".music-table > .col");
        for (var i = 0; i < cols.length; i++) {
            var colName = cols[i].dataset.colName;
            localPref.table.colOrder[i] = colName;
            localPref.table.cols[colName].index = i;
        }
        updateLocalPref();
    }
})();

(function sidebar() {
    var sidebar = document.querySelector("aside.sidebar");
    var resizer = document.querySelector("aside.sidebar .sidebar-resizer");
    var mainContent = document.querySelector("main.content");
    sidebar.style.width = localPref.sidebar.width+"px";
    mainContent.style.width = "calc(100% - "+localPref.sidebar.width+"px)";
    if (!localPref.sidebar.visible) {
        sidebar.classList.add("hidden");
        mainContent.style.width = "100%";
    }
    var mouseDown, mousePosX, mousePosStartX, oldWidth;
    resizer.addEventListener("mousedown", function(e) {
        if (e.button == 0) {
            e.preventDefault();
            mouseDown = true;
            mousePosX = e.clientX;
            mousePosStartX = mousePosX;
            oldWidth = sidebar.clientWidth;
        }
    });
    document.addEventListener("mousemove", function(e) {
        if (mouseDown) {
            mousePosX = e.clientX;
            var widthDifference = mousePosStartX - mousePosX;
            var newWidth = oldWidth + widthDifference;
            if (newWidth < 150) newWidth = 150;
            if (newWidth > window.innerWidth/2) newWidth = Math.floor(window.innerWidth/2);
            mainContent.style.width = "calc(100% - "+newWidth+"px)";
            sidebar.style.width = newWidth+"px";
        }
    });
    document.addEventListener("mouseup", function() {
        if (mouseDown) {
            mouseDown = false;
            localPref.sidebar.width = sidebar.clientWidth;
            updateLocalPref();
        }
    });
    var button = document.querySelector("header.app-bar .playlists");
    button.addEventListener("click", function() {
        mainContent.classList.add("transitioning");
        if (sidebar.classList.contains("hidden")) {
            mainContent.style.width = "calc(100% - "+localPref.sidebar.width+"px)";
            localPref.sidebar.visible = true;
        } else {
            mainContent.style.width = "100%";
            localPref.sidebar.visible = false;
        }
        updateLocalPref();
        sidebar.classList.toggle("hidden");
        setTimeout(function() {
            mainContent.classList.remove("transitioning");
        }, 150);
    });
    // createPlaylistButton
    var cpb = document.querySelector(".sidebar button.create-playlist");
    cpb.addEventListener("click", function() {
        openDialog("createPlaylist");
    });
})();
(function dropFiles() {
    var uploadBox = document.querySelector(".upload-box");
    var fg = document.querySelector(".fg");

    function containsFiles(e) {
        if (e.dataTransfer.types) {
            for (var i = 0; i < e.dataTransfer.types.length; i++) {
                if (e.dataTransfer.types[i] == "Files") {
                    return true;
                }
            }
        }
        return false;
    }
    function show() {
        uploadBox.classList.add("visible");
        fg.classList.add("visible");
        fg.classList.add("short");
    }
    function hide() {
        uploadBox.classList.remove("visible");
        fg.classList.remove("visible");
    }

    // setup
    var setupEvents = ["drag", "dragstart", "dragend", "dragover", "dragenter", "dragleave", "drop"];
    addEvents(window, setupEvents, function(e) {
        if (containsFiles(e)) {
            e.preventDefault();
            e.stopPropagation();
        }
    });

    // show
    addEvents(window, ["dragenter"], function(e) {
        if (containsFiles(e)) show();
    });
    // hide
    addEvents(window, ["dragend", "dragleave"], function(e) {
        if (containsFiles(e)) {
            if (e.type == "dragleave" && e.relatedTarget == null) hide();
            else if (e.type != "dragleave") hide();
        }
    });

    // uploadBox hover
    addEvents(uploadBox, ["dragover", "dragenter"], function() {
        uploadBox.classList.add("hover");
    });
    // uploadBox unhover
    addEvents(uploadBox, ["dragleave", "dragend"], function() {
        uploadBox.classList.remove("hover");
    });

    // uploadBox drop
    addEvents(uploadBox, ["drop"], function(e) {
        hide();
        if (containsFiles(e)) {
            var files = e.dataTransfer.files;
            uploadTracks(files);
        }
    });
    // drop
    addEvents(window, ["drop"], function(e) {
        hide();
    });
})();
// player
(function player() {
    var audio = document.querySelector("audio");
    var playPauseIcon = document.querySelector(".player .icon.play-pause");
    window.playTrack = function(trackId) {
        audio.setAttribute("src", "/track/"+trackId+".mp3");
        play();
    };
    window.play = function() {
        audio.play();
        audio.classList.remove("paused");
        audio.classList.add("playing");
        playPauseIcon.innerHTML = '<path d="M0 0h24v24H0z" fill="none"></path><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"></path>';
    };
    window.pause = function() {
        audio.pause();
        audio.classList.remove("playing");
        audio.classList.add("paused");
        playPauseIcon.innerHTML = '<path d="M0 0h24v24H0z" fill="none"></path><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"></path>';
    };
    document.addEventListener("click", function(e) {
        var icon = insideClass(e.target, "icon");
        if (icon) {
            var cl = icon.classList;
            if (cl.contains("play-pause")) {
                if (audio.classList.contains("paused")) {
                    play();
                } else if (audio.classList.contains("playing")) {
                    pause();
                } else {
                    var selector = ".music-table .col .cell:nth-child(2)";
                    var firstCell = document.querySelector(selector);
                    playTrack(firstCell.dataset.trackId);
                }
            }
        }
    });
})();

// HOME PAGE
function validate(type, msg, el, third) {
    var result = false;
    if (type == "empty") {
        if (el.value == "") result = true;
    } else if (type == "noMatch") {
        var el2 = third;
        if (el.value != el2.value) result = true;
    } else if (type == "shorterThan") {
        var num = third;
        if (el.value.length < num) result = true;
    } else if (type == "longerThan") {
        var num = third;
        if (el.value.length > num) result = true;
    } else if (type == "notEmail") {
        var regex = "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?";
        if (!el.value.match(regex)) result = true;
    }
    if (result == true) {
        el.previousElementSibling.innerHTML = msg;
        el.previousElementSibling.classList.add("visible");
        return true;
    } else {
        el.previousElementSibling.classList.remove("visible");
        return false;
    }
}
function resetMsgs() {
    success.classList.remove("visible");
    username. previousElementSibling.classList.remove("visible");
    email.    previousElementSibling.classList.remove("visible");
    password. previousElementSibling.classList.remove("visible");
    password2.previousElementSibling.classList.remove("visible");
}
function displayErr(field, msg) {
    if (field == "username") field = username;
    if (field == "email") field = email;
    if (field == "password") field = password;
    if (field == "password2") field = password2;
    field.previousElementSibling.innerHTML = msg;
    field.previousElementSibling.classList.add("visible");
}
var login = document.querySelector("button.login");
var register = document.querySelector("button.register");
var form = document.querySelector(".form");

var username = document.querySelector("input[name='username']");
var email = document.querySelector("input[name='email']");
var password = document.querySelector("input[name='password']");
var password2 = document.querySelector("input[name='password2']");
var success = document.querySelector(".form .success");
function clickLogin() {
    resetMsgs();
    if (!form.classList.contains("login")) {
        email.setAttribute("tabindex", "-1");
        password2.setAttribute("tabindex", "-1");
        username.setAttribute("tabindex", "0");
        password.setAttribute("tabindex", "0");
        login.setAttribute("tabindex", "0");
        register.setAttribute("tabindex", "0");

        form.classList.remove("register");
        form.classList.add("login");
        form.classList.add("expanded");
        form.classList.add("has-been-expanded");
    } else {
        var a = false, b = false;
        if (!a) a = validate("empty",        "You should fill this in",                 username        );
        if (!a) a = validate("longerThan",   "Keep it below 30",                        username, 30    );
        if (!b) b = validate("shorterThan",  "That's a bit short... Try 8 characters",  password, 8     );
        if (!b) b = validate("longerThan",   "You crossed the 100 characters line",     password, 100   );

        if (!a && !b) {
            var req =
            "type=login"+
            "&username="+username.value+
            "&password="+password.value;
            xhr(req, "/login", function(res) {
                var errors = JSON.parse(res).errors;
                if (errors) {
                    if (errors.username == "empty") displayErr("username", "You should fill this in");
                    if (errors.username == "long") displayErr("username", "Keep it below 30");
                    if (errors.username == "exist") displayErr("username", "Had trouble finding that user");
                    if (errors.password == "short") displayErr("password", "That's a bit short... Try 8 characters");
                    if (errors.password == "long") displayErr("password", "You crossed the 100 characters line");
                    if (errors.password == "incorrect") displayErr("password", "You guessed the wrong password");
                } else {
                    loggedIn = true;
                    changePage("/");
                }
            });
        }
    }
}
function clickRegister() {
    resetMsgs();
    if (!form.classList.contains("register")) {
        username.setAttribute("tabindex", "0");
        email.setAttribute("tabindex", "0");
        password.setAttribute("tabindex", "0");
        password2.setAttribute("tabindex", "0");
        login.setAttribute("tabindex", "0");
        register.setAttribute("tabindex", "0");

        form.classList.remove("login");
        form.classList.add("register");
        form.classList.add("expanded");
        form.classList.add("has-been-expanded");
    } else {
        var a = false, b = false, c = false, d = false;
        if (!a) a = validate("empty",       "You should fill this in",                  username            );
        if (!a) a = validate("longerThan",  "Keep it below 30",                         username,  30       );
        if (!b) b = validate("empty",       "We need your email",                       email               );
        if (!b) b = validate("longerThan",  "Maximum 60 characters :/",                 email,     60       );
        if (!b) b = validate("notEmail",    "That's email isn't valid",                 email               );
        if (!c) c = validate("shorterThan", "That's a bit short... Try 8 characters",   password,  8        );
        if (!c) c = validate("longerThan",  "You crossed the 100 characters line",      password,  100      );
        if (!d) d = validate("noMatch",     "The passwords do not match",               password2, password );
        if (!a && !b && !c && !d) {
            var req =
            "type=register"+
            "&username="+username.value+
            "&email="+email.value+
            "&password="+password.value+
            "&password2="+password2.value;

            xhr(req, "/register", function(res) {
                var errors = JSON.parse(res).errors;
                if (errors) {
                    if (errors.username == "empty") displayErr("username", "You should fill this in");
                    if (errors.username == "long") displayErr("username", "Keep it below 30");
                    if (errors.username == "exist") displayErr("username", "Unavailable username");
                    if (errors.email == "invalid") displayErr("email", "That email isn't valid");
                    if (errors.email == "empty") displayErr("email", "We need your email");
                    if (errors.email == "long") displayErr("email", "Maximum 60 characters :/");
                    if (errors.email == "exist") displayErr("email", "Email already exists");
                    if (errors.password == "short") displayErr("password", "That's a bit short... Try 8 characters");
                    if (errors.password == "long") displayErr("password", "You crossed the 100 characters line");
                    if (errors.password2 == "match") displayErr("password2", "The passwords do not match");
                } else {
                    success.innerHTML = "Registration complete";
                    success.classList.add("visible");
                }
            });
        }
    }
}

// INIT FIRST PAGE
changePage(path, false);

}());
// end of wrapper function
