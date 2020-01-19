/**
 * MediaFire JavaScript SDK
 * Licensed under the Apache License, Version 2.0
 */

(function() {
    "use strict";

    /**
     * Initializes an application specific instance of MediaFire
     * @param {number} appId The supplied MediaFire application id
     * @param {object=} options Properties to override the default API SDK properties
     * @constructor
     */
    function MediaFire(appId, options) {
        options = options || {};
        
        /**
         * Path to the uploader resources
         * @constant
         * @type {string}
         * @private
         */
        this._UPLOADER_RESOURCE_PATH = options.resourcePath || '';

        /**
         * API version to use by default
         * @constant
         * @type {string}
         * @private
         */
        this._API_VERSION = options.apiVersion || '1.3';

        /**
         * Token version to use (default is 2)
         * @constant
         * @type {number}
         * @private
         */
        this._TOKEN_VERSION = options.tokenVersion && options.tokenVersion < 3 ? options.tokenVersion : 2;

        /**
         * Path to the MediaFire API
         * @constant
         * @type {string}
         * @private
         */
        this._API_PATH = '//www.mediafire.com/api/';

        /**
         * Application ID
         * @type {number}
         * @private
         */
        this._appId = appId;

        /**
         * Application Key
         * @type {string}
         * @private
         */
        this._appKey = options.appKey || '';

        /**
         * API Session Token
         * @type {string}
         * @private
         */
        this._sessionToken = '';

        /**
         * Number of v2 Session Tokens to storen (default is 3, max is 6)
         * @type {object}
         * @private
         */
        this._v2SessionTokensNum = options.tokensStored && options.tokensStored<7 ? options.tokensStored : 3;

        /**
         * API v2 Session Tokens
         * @type {object}
         * @private
         */
        this._v2SessionTokens = [];

        /**
         * API request queue
         * @type {object}
         * @private
         */
        this._requestQueue = [];

        /**
         * Uploader instance
         * @type {MFUploader}
         * @private
         */
        this._uploader;

        /**
         * Action token for the uploader
         * @type {string}
         * @private
         */
        this._actionToken;

        /**
         * Asynchronously loads the necessary resources before performing an upload
         * @param {(object|function)=} callback The success and/or error callback functions
         * @private
         */
        this._loadUploader = function(callback) {
            callback = this._parseCallback(callback);
            var self = this;

            // The uploader calls this global function when it is ready
            window.mfUploaderReady = function() {
                callback.success();
            };

            var id = 'mf-uploader';
            // Script has already been injected, nothing to do here
            if(document.getElementById(id)) {
                return;
            }

            // Inject the uploader script
            var target = document.getElementsByTagName('script')[0];
            var script = document.createElement('script');
            script.id = id;
            script.async = true;
            script.src = this._UPLOADER_RESOURCE_PATH + 'mfuploader.js';
            target.parentNode.insertBefore(script, target);
        };

        /**
         * Conforms callback input into a standard for internal use
         * @param {(object|function)=} callback The success and/or error callback functions
         * @returns {object} Conformed callback
         * @private
         */
        this._parseCallback = function(callback) {
            if(typeof callback === 'function') {
                callback = { success: callback };
            }
            return callback || {};
        };

        /**
         * Extend or update the current session token
         * @private
         */
        this._renew = function() {
            /** @this MediaFire */
            var callbackRenewToken = {
                success: function(data) {
                    this._sessionToken = data.response.session_token;
                }
            };

            var versionPath = this._API_VERSION ? this._API_VERSION + '/' : '';
            this._get(this._API_PATH + versionPath + 'user/renew_session_token.php', null, callbackRenewToken, this);
        };

        /**
         * Core XHR functionality
         * @param {string} url An absolute or relative url for the XHR
         * @param {object=} params Parameters to include with the request
         * @param {object=} callback The success and/or error callback functions
         * @param {*=} scope A scope to call the callback functions with
         * @private
         */
        this._get = function(url, params, callback, scope) {
            // Create XHR
            var xhr = new XMLHttpRequest(),
                oThis = this;

            // Make sure params exists
            if(!params) {
                params = {};
            }
            
            // Augment parameters
            params.response_format = 'json';
            if(this._TOKEN_VERSION == 1 && this._sessionToken) { 
                // v1 session token
                params.session_token = this._sessionToken;
            }else if(this._TOKEN_VERSION == 2){ 
                // v2 session token
                var session = this._getAvailableSessionToken();
                if(session){ // v2 session token found
                    xhr.session = session;
                    params = session.authenticateParams(url, params);
                }else{ // v2 session token not found
                    if(this._v2SessionTokens.length>0){ // make sure we actually have some v2 session tokens to choose from
                        this._requestQueue.push({
                            qUrl: url,
                            qParams: params,
                            qCallback: callback,
                            qScope: scope
                        });
                        return;
                    }else{ // we haven't gotten any v2 session tokens yet, just use a v1 for now
                        params.session_token = this._sessionToken;
                    }
                }
            }

            // Construct parameters
            url += '?' + Object.keys(params).map(function(key) {
                return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
            }).join('&');

            // Handle callbacks
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    // Return raw response if we cannot parse JSON.
                    var response = (typeof JSON === 'undefined') ? xhr.responseText : JSON.parse(xhr.responseText);
                    if (xhr.status === 200) {
                        // Success
                        if(callback.success) {
                            // handle v2 session token on return
                            if(oThis._TOKEN_VERSION == 2){ 
                                // Secret key needs to be updated
                                if(response.response.new_key === 'yes' && this.session) {
                                    this.session.updateSecret();
                                // A new session was created
                                } else if(response.response.secret_key) {
                                    var newSession = new Session(response.response);
                                    oThis._v2SessionTokens.push(newSession);
                                }
                            }
                            callback.success.call(scope, response, xhr);
                        }
                    } else {
                        // Error
                        if(callback.error) {
                            callback.error.call(scope, response, xhr);
                        }
                    }
                    oThis._processQueue();
                }
            };

            // Send request
            xhr.open('GET', url, true);
            xhr.send(null);
        };

        /**
         * Generates an upload action token
         * @param {(object|function)=} callback The success and/or error callback functions
         * @private
         */
        this._getUploadActionToken = function(callback) {
            var options = {type: 'upload', lifespan: 1440};
            var versionPath = this._API_VERSION ? this._API_VERSION + '/' : '';
            this._get(this._API_PATH + versionPath + 'user/get_action_token.php', options, this._parseCallback(callback), this);
        };

        /**
         * Find an available v2 session token (returns Session object or false)
         * @private
         */
        this._getAvailableSessionToken = function(callback) {
            for (var i = 0, len = this._v2SessionTokens.length; i < len; i++) {
                var session = this._v2SessionTokens[i];
                // Found an available session, stop looking and mark this one unavailable
                if(session.available) {
                    session.available = false;
                    return session;
                }
            }
            return false;
        };

        /**
         * If any calls in queue, run them
         * @private
         */
        this._processQueue = function() {
            if(this._requestQueue.length>0){
                var req = this._requestQueue[0];
                this._get(req.qUrl, req.qParams, req.qCallback, req.qScope);
                this._requestQueue.splice(0,1);
            }
        };

        /**
         * If any calls in queue, run them
         * @private
         */
        this._getV2SessionTokens = function() {
            if(this._sessionToken && this._v2SessionTokens.length == 0){
                var versionPath = this._API_VERSION ? this._API_VERSION + '/' : '';
                for(var x=0; x<this._v2SessionTokensNum; x++){ // get 6 v2 session tokens
                    // Send upgrade session token request
                    this._get('https:' + this._API_PATH + versionPath + 'user/upgrade_session_token.php', {}, {success:function(){}}, this);
                }
            }
        };
    }

    /**
     * Creates a new session
     * @param {object} credentials
     * @param {(object|function)=} callback The success and/or error callback functions
     * @returns {MediaFire} For chaining methods
     */
    MediaFire.prototype.login = function(credentials, callback) {
        // Auth-like login available, and credentials is a callback or null
        if(this._authLogin && (!credentials || typeof credentials === 'function')) {
            this._authLogin(credentials);
            return;
        }

        var oThis = this;
        callback = this._parseCallback(callback);

        /** @this MediaFire */
        var saveToken = function(data) {
            oThis._sessionToken = data.response.session_token;
            if(oThis._TOKEN_VERSION == 2){
                oThis._getV2SessionTokens();
            }
        };

        // Inject internal success callback
        if(callback.success) {
            var originalCallback = callback.success;
            callback.success = function(data) {
                saveToken(data);
                originalCallback(data);
            };
        } else {
            callback.success = saveToken;
        }

        // Determine what credentials are needed to for the signature.
        var partial;
        if(credentials.email && credentials.password) {
            partial = credentials.email + credentials.password;
        } else if(credentials.tw_oauth_token && credentials.tw_oauth_token_secret) {
            partial = credentials.tw_oauth_token + credentials.tw_oauth_token_secret;
        } else if (credentials.fb_access_token) {
            partial = credentials.fb_access_token;
        }

        // Augment credentials
        credentials.application_id = this._appId;
        credentials.signature = new SHA1().digestFromString(partial + this._appId + this._appKey);

        // Send session token request
        var versionPath = this._API_VERSION ? this._API_VERSION + '/' : '';
        this._get('https:' + this._API_PATH + versionPath + 'user/get_session_token.php', credentials, callback, this);

        // If using v1 session token, renew session token every 6 minutes.
        if(this._TOKEN_VERSION == 1){
            var self = this;
            setInterval(function() {
                self._renew.call(self);
            }, 6 * 60 * 1000);
        }
        return this;
    };

    /**
     * Sends an api request
     * @param {string} path The relevant api path
     * @param {object=} options Parameters to include with the request
     * @param {(object|function)=} callback The success and/or error callback functions
     * @returns {MediaFire} For chaining methods
     */
    MediaFire.prototype.api = function(path, options, callback, apiVersion) {
        // Allow override of global API version
        apiVersion = apiVersion || this._API_VERSION;

        var versionPath = apiVersion ? apiVersion + '/' : '';
        this._get(this._API_PATH + path + '.php', options, this._parseCallback(callback), this);
        return this;
    };

    /**
     * Uploads files into the logged-in user's account
     * @param {object} files a FileList object from an event
     * @param {object=} callback {onUpdate:, onUploadProgress:, onHashProgress:}
     * @param {object=} options configurations specific to MFUploader
     * @returns {MediaFire} For chaining methods
     */
    MediaFire.prototype.upload = function(files, callbacks, options) {
        var actionToken = this._actionToken;
        var self = this;
        var bFilesSent = false;

        var checkReadyState = function() {
            if(actionToken) {
                if(window.MFUploader && !self._uploader) {
                    options = options || {};
                    options.apiUrl = self._API_PATH;
                    options.resourcePath = self._UPLOADER_RESOURCE_PATH;
                    if(!options.apiVersion && self._API_VERSION) {
                        options.apiVersion = self._API_VERSION;
                    }
                    self._uploader = new MFUploader(actionToken, callbacks, options);
                }

                if(self._uploader) {
                    bFilesSent = true;
                    self._uploader.send(files);
                }
            }
        };

        // Generate action token
        if(actionToken) {
            checkReadyState();
        } else {
            this._getUploadActionToken(function(data) {
                actionToken = data.response.action_token;
                this._actionToken = actionToken;
                checkReadyState();
            });
        }

        // Load uploader resources
        if(!bFilesSent) {
            if(window.MFUploader || this._uploader) {
                checkReadyState();
            } else {
                this._loadUploader(function(MFUploader) {
                    checkReadyState();
                });
            }
        }

        return this;
    };    
    
    
    /**
     * Represents a Version 2 Session Token.
     * @constructor
     * @private
     */
    function Session(data) {
        this.sessionToken = data.session_token;
        this.secretKey = data.secret_key;
        this.initTime = data.time;
        this.available = true;
        
        /*
         *  Creates URL for the purposes of creating a v2 session token signature
         */
        this._createUrl = function(url, params, forceRelative) {
            // returns array of keys from given object
            var sortedKeys = function(obj) {
                var keys = [];
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        keys.push(key);
                    }
                }
                return keys;
            };
            
            // function to iterate through object and run function (iterator)
            var forEachSorted = function(obj, iterator, context) {
                var keys = sortedKeys(obj);
                for (var i = 0; i < keys.length; i++) {
                    iterator.call(context, obj[keys[i]], keys[i]);
                }
                return keys;
            };
            
            if(forceRelative && url.indexOf('mediafire.com') !== -1) {
                url = url.split('mediafire.com').pop();
            }
    
            if(!params) {
                return url;
            }
    
            var parts = [];
            forEachSorted(params, function (value, key) {
                if(value === null || value === undefined) {
                    return;
                }
                if(typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
            });
    
            return url + ((url.indexOf('?') === -1) ? '?' : '&') + parts.join('&');
        };
        
        /*
         * JavaScript MD5 1.0.1
         * https://github.com/blueimp/JavaScript-MD5
         *
         * Copyright 2011, Sebastian Tschan
         * https://blueimp.net
         *
         * Licensed under the MIT license:
         * http://www.opensource.org/licenses/MIT
         * 
         * Based on
         * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
         * Digest Algorithm, as defined in RFC 1321.
         * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
         * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
         * Distributed under the BSD License
         * See http://pajhome.org.uk/crypt/md5 for more info.
         */
        !function(a){"use strict";function b(a,b){var c=(65535&a)+(65535&b),d=(a>>16)+(b>>16)+(c>>16);return d<<16|65535&c}function c(a,b){return a<<b|a>>>32-b}function d(a,d,e,f,g,h){return b(c(b(b(d,a),b(f,h)),g),e)}function e(a,b,c,e,f,g,h){return d(b&c|~b&e,a,b,f,g,h)}function f(a,b,c,e,f,g,h){return d(b&e|c&~e,a,b,f,g,h)}function g(a,b,c,e,f,g,h){return d(b^c^e,a,b,f,g,h)}function h(a,b,c,e,f,g,h){return d(c^(b|~e),a,b,f,g,h)}function i(a,c){a[c>>5]|=128<<c%32,a[(c+64>>>9<<4)+14]=c;var d,i,j,k,l,m=1732584193,n=-271733879,o=-1732584194,p=271733878;for(d=0;d<a.length;d+=16)i=m,j=n,k=o,l=p,m=e(m,n,o,p,a[d],7,-680876936),p=e(p,m,n,o,a[d+1],12,-389564586),o=e(o,p,m,n,a[d+2],17,606105819),n=e(n,o,p,m,a[d+3],22,-1044525330),m=e(m,n,o,p,a[d+4],7,-176418897),p=e(p,m,n,o,a[d+5],12,1200080426),o=e(o,p,m,n,a[d+6],17,-1473231341),n=e(n,o,p,m,a[d+7],22,-45705983),m=e(m,n,o,p,a[d+8],7,1770035416),p=e(p,m,n,o,a[d+9],12,-1958414417),o=e(o,p,m,n,a[d+10],17,-42063),n=e(n,o,p,m,a[d+11],22,-1990404162),m=e(m,n,o,p,a[d+12],7,1804603682),p=e(p,m,n,o,a[d+13],12,-40341101),o=e(o,p,m,n,a[d+14],17,-1502002290),n=e(n,o,p,m,a[d+15],22,1236535329),m=f(m,n,o,p,a[d+1],5,-165796510),p=f(p,m,n,o,a[d+6],9,-1069501632),o=f(o,p,m,n,a[d+11],14,643717713),n=f(n,o,p,m,a[d],20,-373897302),m=f(m,n,o,p,a[d+5],5,-701558691),p=f(p,m,n,o,a[d+10],9,38016083),o=f(o,p,m,n,a[d+15],14,-660478335),n=f(n,o,p,m,a[d+4],20,-405537848),m=f(m,n,o,p,a[d+9],5,568446438),p=f(p,m,n,o,a[d+14],9,-1019803690),o=f(o,p,m,n,a[d+3],14,-187363961),n=f(n,o,p,m,a[d+8],20,1163531501),m=f(m,n,o,p,a[d+13],5,-1444681467),p=f(p,m,n,o,a[d+2],9,-51403784),o=f(o,p,m,n,a[d+7],14,1735328473),n=f(n,o,p,m,a[d+12],20,-1926607734),m=g(m,n,o,p,a[d+5],4,-378558),p=g(p,m,n,o,a[d+8],11,-2022574463),o=g(o,p,m,n,a[d+11],16,1839030562),n=g(n,o,p,m,a[d+14],23,-35309556),m=g(m,n,o,p,a[d+1],4,-1530992060),p=g(p,m,n,o,a[d+4],11,1272893353),o=g(o,p,m,n,a[d+7],16,-155497632),n=g(n,o,p,m,a[d+10],23,-1094730640),m=g(m,n,o,p,a[d+13],4,681279174),p=g(p,m,n,o,a[d],11,-358537222),o=g(o,p,m,n,a[d+3],16,-722521979),n=g(n,o,p,m,a[d+6],23,76029189),m=g(m,n,o,p,a[d+9],4,-640364487),p=g(p,m,n,o,a[d+12],11,-421815835),o=g(o,p,m,n,a[d+15],16,530742520),n=g(n,o,p,m,a[d+2],23,-995338651),m=h(m,n,o,p,a[d],6,-198630844),p=h(p,m,n,o,a[d+7],10,1126891415),o=h(o,p,m,n,a[d+14],15,-1416354905),n=h(n,o,p,m,a[d+5],21,-57434055),m=h(m,n,o,p,a[d+12],6,1700485571),p=h(p,m,n,o,a[d+3],10,-1894986606),o=h(o,p,m,n,a[d+10],15,-1051523),n=h(n,o,p,m,a[d+1],21,-2054922799),m=h(m,n,o,p,a[d+8],6,1873313359),p=h(p,m,n,o,a[d+15],10,-30611744),o=h(o,p,m,n,a[d+6],15,-1560198380),n=h(n,o,p,m,a[d+13],21,1309151649),m=h(m,n,o,p,a[d+4],6,-145523070),p=h(p,m,n,o,a[d+11],10,-1120210379),o=h(o,p,m,n,a[d+2],15,718787259),n=h(n,o,p,m,a[d+9],21,-343485551),m=b(m,i),n=b(n,j),o=b(o,k),p=b(p,l);return[m,n,o,p]}function j(a){var b,c="";for(b=0;b<32*a.length;b+=8)c+=String.fromCharCode(a[b>>5]>>>b%32&255);return c}function k(a){var b,c=[];for(c[(a.length>>2)-1]=void 0,b=0;b<c.length;b+=1)c[b]=0;for(b=0;b<8*a.length;b+=8)c[b>>5]|=(255&a.charCodeAt(b/8))<<b%32;return c}function l(a){return j(i(k(a),8*a.length))}function m(a,b){var c,d,e=k(a),f=[],g=[];for(f[15]=g[15]=void 0,e.length>16&&(e=i(e,8*a.length)),c=0;16>c;c+=1)f[c]=909522486^e[c],g[c]=1549556828^e[c];return d=i(f.concat(k(b)),512+8*b.length),j(i(g.concat(d),640))}function n(a){var b,c,d="0123456789abcdef",e="";for(c=0;c<a.length;c+=1)b=a.charCodeAt(c),e+=d.charAt(b>>>4&15)+d.charAt(15&b);return e}function o(a){return unescape(encodeURIComponent(a))}function p(a){return l(o(a))}function q(a){return n(p(a))}function r(a,b){return m(o(a),o(b))}function s(a,b){return n(r(a,b))}function t(a,b,c){return b?c?r(b,a):s(b,a):c?p(a):q(a)}"function"==typeof define&&define.amd?define(function(){return t}):a.md5=t}(this);
        // usage Session.md5(string, key, raw) // key and raw are optional
    }
    
    /**
     * Updates a the secret key of a Session.
     */
    Session.prototype.updateSecret = function() {
        this.available = true;
        this.secretKey = (this.secretKey * 16807) % 2147483647;
    };
    
    /**
     * Updates a the secret key of a Session.
     * @param {string} url of http request
     * @param {object} params
     */
    Session.prototype.authenticateParams = function(requestUrl, params) {
        // Append session token first, it's used in url verification
        params.session_token = this.sessionToken;
        // Build url exactly how it will be sent
        var url = this._createUrl(requestUrl, params, true);
        // Append signature hash
        params.signature = this.md5((this.secretKey % 256) + this.initTime + url);
        return params;
    };

    window.MF = MediaFire;
})();

/**
 * Copyright (c) 2013 Sam Rijs (http://awesam.de)
 * Licensed under the MIT License (MIT)
 */
(function(){
    if(typeof FileReaderSync!=='undefined'){var reader=new FileReaderSync(),hasher=new Rusha(4*1024*1024);self.onmessage=function onMessage(event){var hash,data=event.data.data;if(data instanceof Blob){try{data=reader.readAsBinaryString(data);}catch(e){self.postMessage({id:event.data.id,error:e.name});return;}}
        hash=hasher.digest(data);self.postMessage({id:event.data.id,hash:hash});};}
    function Rusha(sizeHint){"use strict";var self={fill:0};var padlen=function(len){return len+1+((len)%64<56?56:56+64)-(len)%64+8;};var padZeroes=function(bin,len){for(var i=len>>2;i<bin.length;i++)bin[i]=0;};var padData=function(bin,len){bin[len>>2]|=0x80<<(24-(len%4<<3));bin[(((len>>2)+2)&~0x0f)+15]=len<<3;};var convStr=function(str,bin,len){var i;for(i=0;i<len;i=i+4|0){bin[i>>2]=str.charCodeAt(i)<<24|str.charCodeAt(i+1)<<16|str.charCodeAt(i+2)<<8|str.charCodeAt(i+3);}};var convBuf=function(buf,bin,len){var i,m=len%4,j=len-m;for(i=0;i<j;i=i+4|0){bin[i>>2]=buf[i]<<24|buf[i+1]<<16|buf[i+2]<<8|buf[i+3];}
        switch(m){case 0:bin[j>>2]|=buf[j+3];case 3:bin[j>>2]|=buf[j+2]<<8;case 2:bin[j>>2]|=buf[j+1]<<16;case 1:bin[j>>2]|=buf[j]<<24;}};var conv=function(data,bin,len){if(typeof data==='string'){return convStr(data,bin,len);}else if(data instanceof Array||(typeof global!=='undefined'&&typeof global.Buffer!=='undefined'&&data instanceof global.Buffer)){return convBuf(data,bin,len);}else if(data instanceof ArrayBuffer){return convBuf(new Uint8Array(data),bin,len);}else if(data.buffer instanceof ArrayBuffer){return convBuf(new Uint8Array(data.buffer),bin,len);}else{throw new Error('Unsupported data type.');}};var hex=function(binarray){var i,x,hex_tab="0123456789abcdef",res=[];for(i=0;i<binarray.length;i++){x=binarray[i];res[i]=hex_tab.charAt((x>>28)&0xF)+
        hex_tab.charAt((x>>24)&0xF)+hex_tab.charAt((x>>20)&0xF)+hex_tab.charAt((x>>16)&0xF)+hex_tab.charAt((x>>12)&0xF)+hex_tab.charAt((x>>8)&0xF)+hex_tab.charAt((x>>4)&0xF)+hex_tab.charAt((x>>0)&0xF);}
        return res.join('');};var nextPow2=function(v){var p=1;while(p<v)p=p<<1;return p;};var resize=function(size){self.sizeHint=size;self.heap=new ArrayBuffer(nextPow2(padlen(size)+320));self.core=RushaCore({Int32Array:Int32Array},{},self.heap);};resize(sizeHint||0);var coreCall=function(len){var h=new Int32Array(self.heap,len<<2,5);h[0]=1732584193;h[1]=-271733879;h[2]=-1732584194;h[3]=271733878;h[4]=-1009589776;self.core.hash(len);};var rawDigest=this.rawDigest=function(str){var len=str.byteLength||str.length;if(len>self.sizeHint){resize(len);}
        var view=new Int32Array(self.heap,0,padlen(len)>>2);padZeroes(view,len);conv(str,view,len);padData(view,len);coreCall(view.length);return new Int32Array(self.heap,0,5);};this.digest=this.digestFromString=this.digestFromBuffer=this.digestFromArrayBuffer=function(str){return hex(rawDigest(str));};};function RushaCore(stdlib,foreign,heap){"use asm";var H=new stdlib.Int32Array(heap);function hash(k){k=k|0;var i=0,j=0,y0=0,z0=0,y1=0,z1=0,y2=0,z2=0,y3=0,z3=0,y4=0,z4=0,t0=0,t1=0;y0=H[k+0<<2>>2]|0;y1=H[k+1<<2>>2]|0;y2=H[k+2<<2>>2]|0;y3=H[k+3<<2>>2]|0;y4=H[k+4<<2>>2]|0;for(i=0;(i|0)<(k|0);i=i+16|0){z0=y0;z1=y1;z2=y2;z3=y3;z4=y4;for(j=0;(j|0)<16;j=j+1|0){t1=H[i+j<<2>>2]|0;t0=((((y0)<<5|(y0)>>>27)+(y1&y2|~y1&y3)|0)+((t1+y4|0)+1518500249|0)|0);y4=y3;y3=y2;y2=((y1)<<30|(y1)>>>2);y1=y0;y0=t0;H[k+j<<2>>2]=t1;}
        for(j=k+16|0;(j|0)<(k+20|0);j=j+1|0){t1=(((H[j-3<<2>>2]^H[j-8<<2>>2]^H[j-14<<2>>2]^H[j-16<<2>>2])<<1|(H[j-3<<2>>2]^H[j-8<<2>>2]^H[j-14<<2>>2]^H[j-16<<2>>2])>>>31));t0=((((y0)<<5|(y0)>>>27)+(y1&y2|~y1&y3)|0)+((t1+y4|0)+1518500249|0)|0);y4=y3;y3=y2;y2=((y1)<<30|(y1)>>>2);y1=y0;y0=t0;H[j<<2>>2]=t1;}
        for(j=k+20|0;(j|0)<(k+40|0);j=j+1|0){t1=(((H[j-3<<2>>2]^H[j-8<<2>>2]^H[j-14<<2>>2]^H[j-16<<2>>2])<<1|(H[j-3<<2>>2]^H[j-8<<2>>2]^H[j-14<<2>>2]^H[j-16<<2>>2])>>>31));t0=((((y0)<<5|(y0)>>>27)+(y1^y2^y3)|0)+((t1+y4|0)+1859775393|0)|0);y4=y3;y3=y2;y2=((y1)<<30|(y1)>>>2);y1=y0;y0=t0;H[j<<2>>2]=t1;}
        for(j=k+40|0;(j|0)<(k+60|0);j=j+1|0){t1=(((H[j-3<<2>>2]^H[j-8<<2>>2]^H[j-14<<2>>2]^H[j-16<<2>>2])<<1|(H[j-3<<2>>2]^H[j-8<<2>>2]^H[j-14<<2>>2]^H[j-16<<2>>2])>>>31));t0=((((y0)<<5|(y0)>>>27)+(y1&y2|y1&y3|y2&y3)|0)+((t1+y4|0)-1894007588|0)|0);y4=y3;y3=y2;y2=((y1)<<30|(y1)>>>2);y1=y0;y0=t0;H[j<<2>>2]=t1;}
        for(j=k+60|0;(j|0)<(k+80|0);j=j+1|0){t1=(((H[j-3<<2>>2]^H[j-8<<2>>2]^H[j-14<<2>>2]^H[j-16<<2>>2])<<1|(H[j-3<<2>>2]^H[j-8<<2>>2]^H[j-14<<2>>2]^H[j-16<<2>>2])>>>31));t0=((((y0)<<5|(y0)>>>27)+(y1^y2^y3)|0)+((t1+y4|0)-899497514|0)|0);y4=y3;y3=y2;y2=((y1)<<30|(y1)>>>2);y1=y0;y0=t0;H[j<<2>>2]=t1;}
        y0=y0+z0|0;y1=y1+z1|0;y2=y2+z2|0;y3=y3+z3|0;y4=y4+z4|0;}H[0]=y0;H[1]=y1;H[2]=y2;H[3]=y3;H[4]=y4;}return{hash:hash};}
    window.SHA1=Rusha;
})();
