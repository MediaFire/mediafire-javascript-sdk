(function() {
    "use strict";

    function MFUploader(sActionToken, oCallbacks, oConfig) {
        // Config Options:
        // oCallbacks.onUpdate
        // oCallbacks.onUploadProgress
        // oCallbacks.onHashProgress
        // oCallbacks.onDuplicateConfirm
        // oConfig.relativePath
        // oConfig.folderkey
        // oConfig.apiUrl
        // oConfig.apiVersion
        // oConfig.uploadUrl
        // oConfig.resourcePath
        // oConfig.concurrentUploads
        // oConfig.retryAttempts
        // oConfig.disableInstantUploads
        // oConfig.actionOnDuplicate
        // oConfig.returnThumbnails (true/false)
        // oConfig.filterByExtension (string or array)
        oConfig = oConfig || {};

        // Constants
        this.EVENT_FILE_STATE = 0;
        this.EVENT_UPLOAD_PROGRESS = 1;
        this.EVENT_HASH_PROGRESS = 2;
        this.EVENT_DUPLICATE = 3;
        
        this.TYPE_UNDETERMINED = 0;
        this.TYPE_INSTANT = 1;
        this.TYPE_RESUMABLE = 2;

        this.FILE_STATE_HASH_QUEUED = 'hash-queue';
        this.FILE_STATE_HASHING = 'hashing';
        this.FILE_STATE_HASHED = 'hashed';
        this.FILE_STATE_UPLOAD_CHECK = 'pre-upload';
        this.FILE_STATE_UPLOAD_QUEUED = 'upload-queue';
        this.FILE_STATE_UPLOADING = 'uploading';
        this.FILE_STATE_VERIFYING = 'verifying';
        this.FILE_STATE_COMPLETE = 'complete';
        this.FILE_STATE_DUPLICATE = 'duplicate';
        this.FILE_STATE_ABORTED = 'aborted';
        this.FILE_STATE_SKIPPED = 'skipped';
        this.FILE_STATE_FAILED = 'failed';
        
        this.THUMB_SIZE_LIMIT = 5*1024*1024; // do not return data url if over this size

        // Store callbacks
        this._callbacks = [];
        if(oCallbacks) {
            this._callbacks[this.EVENT_FILE_STATE] = oCallbacks.onUpdate;
            this._callbacks[this.EVENT_UPLOAD_PROGRESS] = oCallbacks.onUploadProgress;
            this._callbacks[this.EVENT_HASH_PROGRESS] = oCallbacks.onHashProgress;
            this._callbacks[this.EVENT_DUPLICATE] = oCallbacks.onDuplicateConfirm;
        }

        // Valid action token required
        if(!sActionToken) {
            throw new Error('Missing or invalid action token was supplied');
            return;
        }

        // Check for core feature support
        if(!MFUploader.checkSupport()) {
            throw new Error('This browser does not support HTML5 uploads');
            return;
        }

        this._actionToken = sActionToken;
        this._apiUrl = (oConfig.apiUrl || '//mediafire.com/api/') + (oConfig.apiVersion ? oConfig.apiVersion + '/' : '');
        this._resourcePath = oConfig.resourcePath || '';
        this._uploadUrl = oConfig.uploadUrl || this._apiUrl;
        this._uploadOnAdd = typeof oConfig.uploadOnAdd !== 'undefined' ? oConfig.uploadOnAdd : true;

        // Save optional config
        this._options = oConfig;

        // Internal file list
        this.files = [];
        this._activeUploads = 0;
        this._uploadQueue = [];
        this._waitingToStartUpload = [];

        // Duplicate actions
        this._actionOnDuplicate = oConfig.actionOnDuplicate;
        this._awaitingDuplicateAction = false;
        this._duplicateConfirmQueue = [];

        // Initialize the hasher
        Hasher.init({
            pnaclListenerId: 'pnacl_listener',
            resourcePath: this._resourcePath
        });
    }

    MFUploader.checkSupport = function(sTestCase) {
        var oTests = {
            filereader: typeof FileReader !== 'undefined',
            formdata: !!window.FormData,
            webworker: !!window.Worker,
            // This test will determine if we can return a progress meter
            progress: 'upload' in new XMLHttpRequest()
        };

        // No test case specified, default to the required three
        if(!sTestCase) {
            return oTests.filereader && oTests.formdata && oTests.webworker;
        } else {
            return oTests[sTestCase];
        }
    };

    MFUploader.getUnitSize = function(iFileSize){
        var iUnitSize = 0;
        for (var i = 0; i <= 7; i++) {
            // 0x400000 = 4MB
            if (iFileSize < 0x400000 * Math.pow(4, i) || i === 7) {
                // 0x100000 = 1MB
                return (i === 0 ? 0x400000 : (0x100000 * Math.pow(2, i - 1)));
            }
        }
    };

    MFUploader.getBytesUploaded = function(oFile){
        var iBytes = 0;
        var iLastUnitSize = oFile.size % oFile.unitSize;
        var iTotalUnits = oFile.units.length;
        // Increment uploaded bytes
        oFile.units.forEach(function(bUploaded, iUnit) {
            if(bUploaded) {
                // The last unit is not guaranteed to be full.
                iBytes += (iUnit === iTotalUnits) ? iLastUnitSize : oFile.unitSize;
            }
        });
        return iBytes;
    };

    MFUploader.decodeBitmap = function(oBitmap) {
        var aUnits = [];
        for (var i = 0; i < oBitmap.count; i++) {
            var iWord = parseInt(oBitmap.words[i], 10);
            var sBin = iWord.toString(2);
            while(sBin.length < 16) {
                sBin = '0' + sBin;
            }
            for(var b = 0; b < sBin.length; b++) {
                aUnits[i * 16 + b] = (sBin[15 - b] === '1');
            }
        }
        return aUnits;
    };

    MFUploader.sortFiles = function(aFiles) {
        aFiles.sort(function(a, b) {
            return a.size - b.size;
        });
    };

    MFUploader.prototype._emit = function(iEvent, oFile, oData) {
        var emit = function() {
            if(this._callbacks[iEvent]) {
                this._callbacks[iEvent](this, oFile, oData || oFile.state);
            }
        };
        setTimeout(emit.bind(this), 0);
    };

    MFUploader.prototype._augmentFile = function(oFile) {
        oFile.unitSize = MFUploader.getUnitSize(oFile.size);
        oFile.bytesHashed = 0;
        oFile.bytesUploaded = 0;
        oFile.uploadRetries = 0;
        oFile.state = this.FILE_STATE_HASH_QUEUED;
        oFile.uploadType = this.TYPE_UNDETERMINED;
        oFile.dataURL = false;
        this._emit(this.EVENT_FILE_STATE, oFile);
    };

    MFUploader.prototype._apiRequest = function(sAction, oParams, oCallbacks) {
        var oXHR = new XMLHttpRequest();

        // Default api params
        oParams = oParams || {};
        oParams.session_token = this._actionToken;
        oParams.response_format = 'json';

        // Build query string
        var sQuery = '?' + Object.keys(oParams).map(function(sKey) {
            return [sKey, oParams[sKey]].map(encodeURIComponent).join('=');
        }).join('&');
        
        // Bypass cache with date timestamp
        sQuery += ('&' + new Date().getTime());

        // Events: load, progress, error, abort
        if(oCallbacks) {
            Object.keys(oCallbacks).forEach(function(sKey) {
                oXHR.addEventListener(sKey, oCallbacks[sKey], false);
            });
        }

        oXHR.open('GET', this._apiUrl + 'upload/' + sAction + '.php' + sQuery, true);
        oXHR.send();
    };

    MFUploader.prototype._uploadUnit = function(oFile, iUnit, sDuplicateAction) {
        var oXHR = new XMLHttpRequest();
        var oThis = this;

        // Default upload params
        var oParams = {};
        oParams.session_token = this._actionToken;
        oParams.uploadkey = this._options.folderkey || 'myfiles';
        oParams.response_format = 'json';

        // Relative path specified
        if(this._options.relativePath) {
            oParams.path = this._options.relativePath;
        }

        // Duplicate action is global or specified explicitly
        if(sDuplicateAction || this._actionOnDuplicate) {
            oParams.action_on_duplicate = (sDuplicateAction || this._actionOnDuplicate);
        }
        
        // Build query string
        var sQuery = '?' + Object.keys(oParams).map(function(sKey) {
            return [sKey, oParams[sKey]].map(encodeURIComponent).join('=');
        }).join('&');

        // Track per unit, append results
        var iInitialBytesUploaded = oFile.bytesUploaded;
        var iUnitBytesUploaded = 0;

        // Slice blob from file
        var oUnitBlob = oFile.slice(iUnit * oFile.unitSize, (iUnit + 1) * oFile.unitSize);

        // Unit successfully uploaded
        var fUploadSuccess = function(sUploadKey) {
            // Mark unit as uploaded
            oFile.units[iUnit] = true;

            // Attach key for verification
            oFile.uploadKey = sUploadKey;

            // Check next available unit to upload
            var iNextUnit = oFile.units.indexOf(false);

            // Found a unit to upload
            if(iNextUnit >= 0) {
                oThis._uploadUnit(oFile, iNextUnit);
            // Finished uploading file
            } else {
                oThis._activeUploads--;
                // Update state
                oFile.state = oThis.FILE_STATE_VERIFYING;
                oThis._emit(oThis.EVENT_FILE_STATE, oFile);
                oThis._pollUpload(oFile);
                // Upload next file if any in queue
                if(oThis._uploadQueue.length > 0) {
                    oThis._activeUploads++;
                    oThis._uploadUnit.apply(oThis, oThis._uploadQueue.shift());
                }
            }
        };

        // Unit failed at some point
        var fUploadFailed = function() {
            // Retry unit if we can
            if(oFile.uploadRetries < (oThis._options.retryAttempts || 3)) {
                oFile.uploadRetries++;
                oThis._uploadUnit(oFile, iUnit);
            // Out of retries, fail
            } else {
                oThis._activeUploads--;
                oFile.bytesUploaded -= iUnitBytesUploaded;
                oFile.state = oThis.FILE_STATE_FAILED;
                oThis._emit(oThis.EVENT_FILE_STATE, oFile);
                // Upload next file if any in queue
                if(oThis._uploadQueue.length > 0) {
                    oThis._activeUploads++;
                    oThis._uploadUnit.apply(null, oThis._uploadQueue.shift());
                }
            }
        };

        // Determine success or error of the upload
        oXHR.onreadystatechange = function() {
            if(oXHR.readyState === 4) {
                if(oXHR.status === 200) {
                    var oData = JSON.parse(oXHR.responseText);
                    // Unit upload was successful
                    if(oData.response.doupload.result === "0") {
                        fUploadSuccess(oData.response.doupload.key);
                    } else {
                        fUploadFailed();
                    }
                } else {
                    fUploadFailed();
                }
            }
        };

        // Update bytes
        oXHR.upload.addEventListener('progress', function(oEvent) {
            // Update total bytes uploaded
            iUnitBytesUploaded = oEvent.loaded;
            oFile.bytesUploaded = (iInitialBytesUploaded + oEvent.loaded);
            oThis._emit(oThis.EVENT_UPLOAD_PROGRESS, oFile, oFile.bytesUploaded);
        }, false);

        oXHR.open('POST', this._uploadUrl + 'upload/resumable.php' + sQuery, true);
        oXHR.setRequestHeader('Content-Type', 'application/octet-stream');
        oXHR.setRequestHeader('X-Filename', oFile.name);
        oXHR.setRequestHeader('X-Filesize', oFile.size);
        oXHR.setRequestHeader('X-Filetype', oFile.type || 'application/octet-stream');
        oXHR.setRequestHeader('X-Filehash', oFile.hashes.full);
        oXHR.setRequestHeader('X-Unit-Id', iUnit);
        oXHR.setRequestHeader('X-Unit-Hash', oFile.hashes.units[iUnit]);
        oXHR.setRequestHeader('X-Unit-Size', oUnitBlob.size);
        oXHR.send(oUnitBlob);
    };

    MFUploader.prototype._uploadCheck = function(oFile) {
        var oThis = this;
        var oParams = {
            hash: oFile.hashes.full,
            size: oFile.size,
            filename: oFile.name,
            resumable: 'yes'
        };
        
        if (this._options.folderkey)
            oParams.folder_key = this._options.folderkey;

        this._apiRequest('check', oParams, {
            load: function(evt) {
                var oData = JSON.parse(this.responseText);
                
                // Instant uploads enabled and hash exists, mark as instant upload
                if(!oThis._options.disableInstantUploads && oData.response.hash_exists === "yes") {
                    oFile.uploadType = oThis.TYPE_INSTANT;
                    
                // Otherwise, it is a resumable upload
                } else if(oData.response.resumable_upload) {
                    oFile.uploadType = oThis.TYPE_RESUMABLE;
                    // Save unit states
                    oFile.units = MFUploader.decodeBitmap(oData.response.resumable_upload.bitmap);
                    // Cap bitmap to units
                    oFile.units.length = parseInt(oData.response.resumable_upload.number_of_units, 10);
                    // Increment the bytes the server already has
                    oFile.bytesUploaded = MFUploader.getBytesUploaded(oFile);
                }
                
                // Duplicate name, requires user action to continue
                // unless user action has been applied to all or global is set
                if(oData.response.file_exists === "yes") {

                    oFile.dupeQuickkey = oData.response.duplicate_quickkey;
                    oFile.state = oThis.FILE_STATE_DUPLICATE;
                    oThis._emit(oThis.EVENT_FILE_STATE, oFile);

                    // Duplicate action available, no need to confirm or queue
                    if(oThis._actionOnDuplicate) {
                        // Skip file
                        if(oThis._actionOnDuplicate === 'skip') {
                            // Update state
                            oFile.state = oThis.FILE_STATE_SKIPPED;
                            oThis._emit(oThis.EVENT_FILE_STATE, oFile);
                        // Attempt to check upload again
                        } else {
                            // send to upload
                            oThis._doUpload(oFile, oThis._actionOnDuplicate);
                        }
                    // Awaiting confirmation
                    } else {
                        // Already awaiting a duplicate action, add to queue
                        if(oThis._awaitingDuplicateAction) {
                            oThis._duplicateConfirmQueue.push(oFile);
                        // Emit event, note we are awaiting a response
                        } else {
                            oThis._awaitingDuplicateAction = true;
                            oThis._emit(oThis.EVENT_DUPLICATE, oFile);
                        }
                    }
                    
                // File is instant upload (hash already exists)
                } else if(oFile.uploadType === oThis.TYPE_INSTANT) {    
                    
                    // Update state
                    oFile.state = oThis.FILE_STATE_UPLOAD_CHECK;
                    oThis._emit(oThis.EVENT_FILE_STATE, oFile);
                    
                    // Do instant upload
                    oThis._instant(oFile);
                
                // File is resumable upload
                } else if(oFile.uploadType === oThis.TYPE_RESUMABLE) {
                    
                    // Update state
                    oFile.state = oThis.FILE_STATE_UPLOAD_CHECK;
                    oThis._emit(oThis.EVENT_FILE_STATE, oFile);
                    
                    if(oData.response.resumable_upload.all_units_ready !== 'yes') {
                        oThis._resumable(oFile);
                    }

                // Error 
                } else {
                    oFile.state = oThis.FILE_STATE_FAILED;
                    oThis._emit(oThis.EVENT_FILE_STATE, oFile);
                }
            },
            error: function(evt) {
                // Save error state
                oFile.state = oThis.FILE_STATE_FAILED;
                oThis._emit(oThis.EVENT_FILE_STATE, oFile);
            }
        });
    };
    
    MFUploader.prototype._doUpload = function(oFile, sDuplicateAction){
        // Send to appropriate upload method
        if(oFile.uploadType === this.TYPE_INSTANT) {
            this._instant(oFile, sDuplicateAction);
        } else {
            this._resumable(oFile, sDuplicateAction);
        }
    };
    
    MFUploader.prototype._resumable = function(oFile, sDuplicateAction){
        // Attempt to start first unit upload
        var iUnit = oFile.units.indexOf(false);
        if(iUnit >= 0) {
            if(this._activeUploads < (this._options.concurrentUploads || 3)) {
                this._activeUploads++;
                this._uploadUnit(oFile, iUnit, sDuplicateAction);
                oFile.state = this.FILE_STATE_UPLOADING;
                this._emit(this.EVENT_FILE_STATE, oFile);
            // Queue upload
            } else {
                this._uploadQueue.push([oFile, iUnit]);
                oFile.state = this.FILE_STATE_UPLOAD_QUEUED;
                this._emit(this.EVENT_FILE_STATE, oFile);
            }
       }
    };

    MFUploader.prototype._instant = function(oFile, sDuplicateAction) {
        var oThis = this;
        var oParams = {
            hash: oFile.hashes.full,
            size: oFile.size,
            filename: oFile.name
        };

        // Relative path specified
        if(this._options.relativePath) {
            oParams.path = this._options.relativePath;
        }

        // Duplicate action is global or specified explicitly
        if(sDuplicateAction || this._actionOnDuplicate) {
            oParams.action_on_duplicate = (sDuplicateAction || this._actionOnDuplicate);
        }

        this._apiRequest('instant', oParams, {
            load: function(evt) {
                var oData = JSON.parse(this.responseText);
                // Instant upload, no duplicate
                if(oData.response.quickkey) {
                    oFile.bytesUploaded = oFile.size;
                    oFile.quickkey = oData.response.quickkey;
                    oFile.state = oThis.FILE_STATE_COMPLETE;
                    oThis._emit(oThis.EVENT_FILE_STATE, oFile);
                // Duplicate name, requires user action to continue
                // unless user action has been applied to all or global is set
                } else {
                    oFile.state = oThis.FILE_STATE_FAILED;
                    oThis._emit(oThis.EVENT_FILE_STATE, oFile);
                }
            },
            error: function(evt) {
                // Save error state
                oFile.state = oThis.FILE_STATE_FAILED;
                oThis._emit(oThis.EVENT_FILE_STATE, oFile);
            }
        });
    };

    MFUploader.prototype._pollUpload = function(oFile) {
        var oThis = this;
        this._apiRequest('poll_upload', {key: oFile.uploadKey, resumable: 'yes'}, {
            load: function(evt) {
                var oData = JSON.parse(this.responseText);
                // No more requests available, the quickkey should be present
                if(oData.response.doupload.result == "0" && oData.response.doupload.status == "99") {
                    // Quickkey present, file upload was successful
                    if(oData.response.doupload.quickkey) {
                        oFile.quickkey = oData.response.doupload.quickkey;
                        // Update state
                        oFile.state = oThis.FILE_STATE_COMPLETE;
                        oThis._emit(oThis.EVENT_FILE_STATE, oFile);
                    } else {
                        oFile.state = oThis.FILE_STATE_FAILED;
                        oThis._emit(oThis.EVENT_FILE_STATE, oFile);
                    }
                // Continue to poll (3s)
                } else {
                    setTimeout(function() {
                        oThis._pollUpload(oFile);
                    }, 3000);
                }
            },
            error: function(evt) {
                // Save error state
                oFile.state = oThis.FILE_STATE_FAILED;
                oThis._emit(oThis.EVENT_FILE_STATE, oFile);
            }
        });
    };
    
    MFUploader.prototype._passesFilter = function(oFile) {
        // If there is no filter, pass
        if(!this._options.filterByExtension) {
            return true;
        }
        
        var sExt = oFile.name.split('.').pop().toLowerCase(), // get extenson
            aFilters = this._options.filterByExtension; // for storing extenstions from filter

        // Cast delimited string to Array
        if(!(aFilters instanceof Array)) {
            aFilters = aFilters.split(/[\s,]+/); // convert to array
        }

        for(var i=0, l=aFilters.length; i<l; i++) {
            if(aFilters[i].toLowerCase() === sExt) {
                return true;
            }
        }

        return false;
    };

    MFUploader.prototype.add = function(oFile) {
        
        if(!this._passesFilter(oFile)) {
            return;
        }
        
        var oThis = this;
        this._augmentFile(oFile);
        this.files.push(oFile);
        
        // Get thumbnail if configured to do so
        if(!!this._options.returnThumbnails && oFile.size < this.THUMB_SIZE_LIMIT && MFUploader.isImage(oFile)) {
            window.URL = window.URL || window.webkitURL;
            if(window.URL) {
                oFile.dataURL = window.URL.createObjectURL(oFile);
                oThis._emit(oThis.EVENT_FILE_STATE, oFile);
            }
        }
        
        // Add to hasher immediately, it has it's own queue system
        Hasher.addFile(oFile, oFile.unitSize, {
            success: function(oHashes) {
                // Save hashes
                oFile.hashes = oHashes;
                // Update state
                oFile.state = oThis.FILE_STATE_HASHED;
                oThis._emit(oThis.EVENT_FILE_STATE, oFile);
                // Retrieve units needed to upload
                if(oThis._uploadOnAdd === true) {
                    oThis._uploadCheck(oFile);
                } else {
                    oThis._waitingToStartUpload.push(oFile);
                }
            },
            progress: function(iBytesHashed) {
                // Update state
                if(oFile.state !== oThis.FILE_STATE_HASHING) {
                    oFile.state = oThis.FILE_STATE_HASHING;
                    oThis._emit(oThis.EVENT_FILE_STATE, oFile);
                }
                oFile.bytesHashed = iBytesHashed;
                oThis._emit(oThis.EVENT_HASH_PROGRESS, oFile, iBytesHashed);
            }
        });
    };
    
    MFUploader.isImage = function(oFile){
        return oFile.type.substr(0,6) === 'image/';
    };
    
    MFUploader.prototype.startUpload = function() {
        this._waitingToStartUpload.forEach(this._uploadCheck, this);
        this._waitingToStartUpload = [];
    };

    MFUploader.prototype.send = function(aFiles) {
        // Transform FileList into an Array
        aFiles = [].slice.call(aFiles);

        // Optionally add files before sending
        if(aFiles && aFiles.length > 0) {
            if(aFiles.length === 1) {
                this.add(aFiles[0]);
            } else {
                // Add all files
                for(var i=0, l=aFiles.length; i<l; i++) {
                    this.add(aFiles[i]);
                }
            }
        }
    };

    MFUploader.prototype.duplicateAction = function(oFile, sAction, bApplyAll) {
        var aChoices = ['keep', 'skip', 'replace'];
        // Validate duplicate action and valid action
        if(oFile.state === this.FILE_STATE_DUPLICATE && aChoices.indexOf(sAction) !== -1) {

            // No longer awaiting user confirmation
            this._awaitingDuplicateAction = false;

            // User chose to skip
            if(sAction === 'skip') {
                // Update state
                oFile.state = this.FILE_STATE_SKIPPED;
                this._emit(this.EVENT_FILE_STATE, oFile);
            // Send to upload
            } else {
                this._doUpload(oFile, sAction);
            }

            // Apply choice for future occurrences in this uploader instance
            // as well as any in the duplicate queue
            if(bApplyAll) {
                this._actionOnDuplicate = sAction;
                this._duplicateConfirmQueue.forEach(function(oQueuedFile) {
                    // Confirm they are in a duplicate state
                    if(oQueuedFile.state === this.FILE_STATE_SKIPPED) {
                        // Skip all in queue
                        if(sAction === 'skip') {
                            // Update state
                            oQueuedFile.state = this.FILE_STATE_SKIPPED;
                            this._emit(this.EVENT_FILE_STATE, oQueuedFile);
                        // Upload all in queue
                        } else {
                            this._doUpload(oQueuedFile, sAction);
                        }
                    }
                }, this);
                // Clear queue
                this._duplicateConfirmQueue = [];
            // No global action, emit event for next user confirmation if available
            } else if(this._duplicateConfirmQueue.length > 0) {
                this._emit(this.EVENT_DUPLICATE, this._duplicateConfirmQueue.shift());
            }
        }
    };

    var Hasher = (function() {
        "use strict";

        var _WORKER_NAME = 'hasher.js';
        var _PNACL_MANIFEST_NAME = 'hasher.nmf';
        var _resourcePath = '';
        var _initTime;
        var _oWorker;
        var _oActive;
        var _aQueue = [];

        function _messageReceived(evt) {
            // Message format {id:event, content:*}
            switch(evt.data.id.toString()) {
                case 'progress':
                    // Number of bytes hashed so far
                    _oActive.callback.progress(parseInt(evt.data.content, 10));
                    // More units left to hash
                    if (_oActive.currentUnit < _oActive.units) {
                        // Okay to stream the next unit
                        _streamUnit(_oActive.file, ++_oActive.currentUnit, _oActive.unitSize);
                    }
                    break;
                case 'success':
                    // Content contains the hashes {full: <file hash>, units: [<unit 1 hash>, ...]}
                    _oActive.callback.success(evt.data.content);
                    // Start next file in queue
                    _oActive = null;
                    if(_aQueue.length > 0) {
                        _addFile.apply(null, _aQueue.shift());
                    }
                    break;
            }
        }

        function _createModule() {
            var eModule = document.createElement('embed');
            eModule.setAttribute('width', 0);
            eModule.setAttribute('height', 0);
            eModule.setAttribute('type', 'application/x-pnacl');
            eModule.setAttribute('src', _resourcePath + _PNACL_MANIFEST_NAME);
            return eModule;
        }

        function _createWorker() {
            _oWorker = new Worker(_resourcePath + _WORKER_NAME);
            _oWorker.onmessage = _messageReceived;
            return _oWorker;
        }

        function _messageWorker(data) {
            // We do not have a worker yet, this means the PNaCl module never loaded (unsupported browser or error)
            // Create a Web Worker instead
            if(!_oWorker) {
                _createWorker();
            }

            _oWorker.postMessage(data);
        }

        function _streamUnit(oFile, iUnit, iUnitSize) {
            // Slice the unit Blob out of the File oject
            var iOffset = (iUnit - 1) * iUnitSize;
            var oBlob = oFile.slice(iOffset, iOffset + iUnitSize);

            // Create reader
            var oReader = new FileReader();

            // Read file in slices
            oReader.onloadend = function(evt) {
                // Ready to send result to the hasher
                if (evt.target.readyState == FileReader.DONE) {
                    // Send data to worker
                    _oWorker.postMessage(evt.target.result);
                    // Reference should clear after this function, let's just make sure
                    delete evt.target.result;
                }
            };

            // Read the Blob so we can send it to the web worker
            oReader.readAsArrayBuffer(oBlob);
        }

        function _addFile(oFile, iUnitSize, oCallback) {
            // We're already hashing a file, add this file to the queue.
            // Also queue if we're waiting for the pnacl module (within 3s from init)
            if(_oActive || (!_oWorker && new Date().getTime() - _initTime < 3000)) {
                _aQueue.push([oFile, iUnitSize, oCallback]);
                return;
            }

            var iUnits = Math.ceil(oFile.size / iUnitSize);

            // Set this file as the active task
            _oActive = {
                file: oFile,
                unitSize: iUnitSize,
                units: iUnits,
                callback: oCallback,
                currentUnit: 1
            };

            // Send the number of units, the worker will realize we want to stream
            _messageWorker(iUnits);

            // Start streaming the first unit immediately
            _streamUnit(oFile, 1, iUnitSize);
        }

        return {
            init: function(options) {
                _resourcePath = options.resourcePath || '';
                _initTime = new Date().getTime();
                // Listener defined and pnacl supported, monitor events
                if(options.pnaclListenerId && navigator.mimeTypes['application/x-pnacl']) {
                    // Wait up to 3 seconds before falling back to worker
                    setTimeout(function() {
                        if(!_oActive && _aQueue.length > 0) {
                            _addFile.apply(null, _aQueue.shift());
                        }
                    }, 3000);

                    var eListener = document.getElementById(options.pnaclListenerId);
                    // We found the listener
                    if(eListener) {
                        // Create the PNaCl module
                        var oModule = _createModule();
                        // Wait for the listener to say the module loaded
                        // This will never fire in unsupported browsers
                        eListener.addEventListener('load', function() {
                            // If there is no current task, override the worker
                            if(!_oActive) {
                                _oWorker = oModule;
                                // Start queue if any files were waiting on the module
                                if(_aQueue.length > 0) {
                                    _addFile.apply(null, _aQueue.shift());
                                }
                            }
                        }, true);

                        // Module messages are handled the same way as Web Workers
                        eListener.addEventListener('message', _messageReceived, true);

                        // Attach the module
                        eListener.appendChild(oModule);
                    }
                } else {
                    _createWorker();
                }
            },

            addFile: _addFile
        };
    })();

    window.MFUploader = MFUploader;

    // Async Callback
    if(window.mfUploaderReady && !window.mfUploaderReady.init) {
        window.mfUploaderReady.init = true;
        window.mfUploaderReady();
    }
})();
