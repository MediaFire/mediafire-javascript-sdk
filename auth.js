(function() {
    "use strict";

    var _popup = function(sUrl, iWidth, iHeight) {
        var iLeft = ((window.innerWidth / 2) - (iWidth / 2)) + (window.screenLeft || screen.left || 0);
        var iTop = ((window.innerHeight / 2) - (iHeight / 2)) + (window.screenTop || screen.top || 0);
        var wPopup = window.open(sUrl, '', 'width='+iWidth+',height='+iHeight+',top='+iTop+',left='+iLeft+',menubar=no,toolbar=no,status=no,dependent=yes,dialog=yes');
        if(wPopup.focus) {
            wPopup.focus();
        }
        return wPopup;
    };

    var _login = function(oConfig, fCallback, oScope) {
        var sTargetOrigin = 'https://mediafire.com';
        var sOrigin = encodeURIComponent(window.location.protocol + '//' + window.location.hostname);
        var iAppId = encodeURIComponent(oConfig.apiID);
        var sUrl = sTargetOrigin + '/auth/mediafire_login.php?app_id=' + iAppId + '&origin=' + sOrigin;
        var iPingInterval, iNameTransportInterval;
        var wPopup = _popup(sUrl, 520, 360);

        // Browsers that do not support XDM PostMessage (NameTransport Hack)
        // Stop polling when (if) the PostMessage comes back
        iNameTransportInterval = setInterval(function() {
            try {
                if(!wPopup.closed && wPopup.name) {
                    clearInterval(iPingInterval);
                    clearInterval(iNameTransportInterval);
                    fCallback.call(oScope, wPopup.name);
                    wPopup.close();
                }
            } catch(e) {}
        }, 50);

        // Stop pinging when (if) the PostMessage comes back
        iPingInterval = setInterval(function() {
            wPopup.postMessage("ping", sTargetOrigin);
        }, 200);

        // Browsers with XDM PostMessage Support
        function fReceivedMessage(event) {
            if (event.origin !== sTargetOrigin) {
                return;
            }

            // Acknowledged recipient, PostMessage supported
            if(event.data.trim() === 'pong') {
                clearInterval(iPingInterval);
                clearInterval(iNameTransportInterval);
            // Session token received
            } else {
                fCallback.call(oScope, event.data);
                clearInterval(iPingInterval);
                wPopup.close();
            }
        }

        if(window.addEventListener) {
            window.addEventListener("message", fReceivedMessage, false);
        } else {
            window.attachEvent("message", fReceivedMessage);
        }
    };

    function MediaFire(iAppID) {
        this._appId = iAppID;
        this._sessionToken = '';
    };

    MediaFire.prototype.login = function(fCallback) {
        var oThis = this;
        _login({apiID: this._appId}, function(sSessionToken) {
            oThis._sessionToken = sSessionToken;
            if(fCallback) {
                fCallback(sSessionToken);
            }
        });
    };

    // Integrate into existing MediaFire SDK
    if(window.MF && MF.prototype && MF.prototype.login) {
        MF.prototype._authLogin = MediaFire.prototype.login;
    } else {
        window.MF = MediaFire;
    }

    // Static call always available
    MF.login = _login;
})();