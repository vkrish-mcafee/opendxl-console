/*

  SmartClient Ajax RIA system
  Version v11.1p_2018-06-28/LGPL Deployment (2018-06-28)

  Copyright 2000 and beyond Isomorphic Software, Inc. All rights reserved.
  "SmartClient" is a trademark of Isomorphic Software, Inc.

  LICENSE NOTICE
     INSTALLATION OR USE OF THIS SOFTWARE INDICATES YOUR ACCEPTANCE OF
     ISOMORPHIC SOFTWARE LICENSE TERMS. If you have received this file
     without an accompanying Isomorphic Software license file, please
     contact licensing@isomorphic.com for details. Unauthorized copying and
     use of this software is a violation of international copyright law.

  DEVELOPMENT ONLY - DO NOT DEPLOY
     This software is provided for evaluation, training, and development
     purposes only. It may include supplementary components that are not
     licensed for deployment. The separate DEPLOY package for this release
     contains SmartClient components that are licensed for deployment.

  PROPRIETARY & PROTECTED MATERIAL
     This software contains proprietary materials that are protected by
     contract and intellectual property law. You are expressly prohibited
     from attempting to reverse engineer this software or modify this
     software for human readability.

  CONTACT ISOMORPHIC
     For more information regarding license rights and restrictions, or to
     report possible license violations, please contact Isomorphic Software
     by email (licensing@isomorphic.com) or web (www.isomorphic.com).

*/
//------------------------------------------------------------------------------------
isc.defineClass("MessagingDMIServer").addProperties({

socketConstructor: "MessagingDMISocket",

// set this to start a second socket that listens for discover() calls on the named channel
// - typically used as a broadcast discovery mechanism
// discoverableOnChannel: null,

init : function () {
    if (!this.visibleMethods) this.visibleMethods = [];    

    // for direct binding
    this.window = window;
},

// this has an async interface so we can e.g. call the server for a truly unique GUID
getGUID : function (callback) {
    if (!this.GUID) this.GUID = isc.Math.randomUUID();
    this.fireCallback(callback, "GUID", [this.GUID]);
},

handlePacket : function (packet, originSocket, originWindow) {
    if (this.logIsDebugEnabled()) {
        this.logDebug("packetReceived: " + isc.echo(packet));            
    }

    var _this = this;

    // patch our callback and invoke call()
    var props = isc.addProperties({}, packet.payload);
    props.callback = function (retVal) {
        if (this.logIsDebugEnabled) _this.logDebug("invocation of: " + packet.payload.methodName + " returned");
        _this.socket.sendReply(packet, retVal, originSocket, originWindow);
    };
    this.call(props);
},

getServerProperties : function () {
    return {
        // every server should have a global unique identifier (GUID)
        // there are several uses, but one is for unique id by DMIDiscovery
        GUID: this.GUID,
        // the receiveChannel is usually the same as the GUID, but could be a multicast or
        // broadcast channel or something custom instead
        receiveChannel: this.receiveChannel,
        discoverableOnChannel: this.discoverableOnChannel,

        generatedDate: new Date(),

        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,

        // these are the methods that the client is allowed to call - excepting builtins
        visibleMethods: this.visibleMethods
    };
},

getSocket : function (receiveChannel) {
    if (this.sockets) return this.sockets.find("receiveChannel", receiveChannel);
    return null;
},

start : function (callback) {
    var _this = this;

    // don't leak sockets in case start() is called more than once
    if (this.sockets) {
        this.logWarn("start() called when socket is connected - restarting");
        this.stop(); // synchronous - we don't care to wait for ack in this case
    }

    if (!this.receiveChannel) {
        // use GUID for receiveChannel - if not set, generate and call ourselves back
        this.getGUID(function (GUID) {
            _this.receiveChannel = GUID;
            _this.start(callback);
        });
        return;
    }

    this.sockets = [];
    this.socket = isc.ClassFactory.getClass(this.socketConstructor, true).create({
        receiveChannel: this.receiveChannel,
        packetReceived : function (packet, originSocket, originWindow) {
            // Note: receiveChannel will be auto-generated by the socket
            _this.handlePacket(packet, originSocket, originWindow);
        }
    }, this.socketDefaults, this.socketProperties);
    this.sockets.add(this.socket);


    if (this.discoverableOnChannel) {
        this.discoverySocket = isc.ClassFactory.getClass(this.socketConstructor, true).create({
            receiveChannel: this.discoverableOnChannel,
            packetReceived : function (packet, originSocket, originWindow) {
                _this.handlePacket(packet, originSocket, originWindow);
            }
        }, this.socketDefaults, this.socketProperties);
        this.sockets.add(this.discoverySocket);
    }

    var _this = this;
    var numSocketsConnected = 0;
    for (var i = 0; i < this.sockets.length; i++) {
        var socket = this.sockets[i];
        socket.bind(function () {
            if (++numSocketsConnected == _this.sockets.length) {
               _this.isAvailable = true;
               if (callback) _this.fireCallback(callback);
            }
        });
    };
},

stop : function (callback) {
    this.isAvailable = false;

    if (!this.sockets) {
        this.fireCallback(callback);
        return;
    }

    var _this = this;
    var numSocketsConnected = this.sockets.length;
    // careful: our callback below deletes this.sockets
    for (var i = 0; this.sockets && i < this.sockets.length; i++) {
        var socket = this.sockets[i];
        socket.close(function () {
            if (--numSocketsConnected == 0) {
                delete _this.sockets;
                if (callback) _this.fireCallback(callback);
            }
        });
    }
},

// builtins

discover : function (callback) {
    this.logDebug("discover invoked - callback: "+(callback ? callback.toString() : "null"));
    // respond with metadata about the server - at minimum what's required in
    // MessagingDMI.connect() to create a MessagingDMIClient that can talk to this server
    if (callback) this.fireCallback(callback, "serverProperties", [this.getServerProperties()]);
},


ping : function (callback) {
    this.logDebug("ping"); 
    if (callback) this.fireCallback(callback);
},
connect : function (callback) {
    this.logDebug("connect");
    if (callback) this.fireCallback(callback);
},
disconnect : function (callback) {
    this.logDebug("disconnect");
    if (callback) this.fireCallback(callback);
},


call : function (methodName, args, callback) {
    //!OBFUSCATEOK
    var _this = this;
     
    var targetName;
    var props = {};
    if (isc.isAn.Object(methodName)) {
        props = methodName;
        targetName = props.targetName;
        methodName = props.methodName;
        args = props.args;
        callback = props.callback;
    }

    // targetName may be encoded in methodName or may be supplied separately
    if (!targetName) {
        var lastDotIndex = methodName.lastIndexOf(".");
        if (lastDotIndex != -1) {
            // parse the target and method
            targetName = methodName.substring(0, lastDotIndex);
            methodName = methodName.substring(lastDotIndex+1);
        }
    }
    
    if (targetName && !this.allowUnrestrictedCallTarget) {
        this.logError("Attempt to call: " + targetName+"."+methodName+"()"
            + " REJECTED - to enable, set allowUnrestrictedCallTarget on your "+this.getClassName());
        return;
    }
    var target = targetName ? eval(targetName) : this;

    // check that the user is invoking a visibleMethod or builtinMethod
    // Note: "*" in visibleMethods means all methods on this class are invocable (except for
    // set(), which also requires the special allowUnrestrictedCallTarget property to be set);
    if (!(this.visibleMethods.contains("*") || this.allowUnrestrictedCallTarget)) {
        if (!(this.visibleMethods.contains(methodName) || isc.MessagingDMI.builtinMethods.contains(methodName))) {
            this.logError("Attempt to call non-visible method: " + methodName + " DENIED." 
                + " To allow this action, declare this method in your " 
                + this.getClassName()+".visibleMethods list.");

            return;
        }
    }
    
    // execute
    var method = target[methodName];
    if (!method) {
        this.logError("Unable to find method named '"+methodName+"' on class: " + this.getClassName());
        return;
    }
    
    if (!args) args = [];       

    if (!isc.isAn.Array(args)) {
        this.logError("Expected Array as second arg or props.args in "+this.getClassName()
         + ".call(), but got:" + isc.echoFull(args));
        return;
    }

    if (target == this) {
        // if the call is on this class, then we mandate that the call is asynchronous here -
        // i.e. the last argument of the local method is going to be a callback that passes us
        // the retVal (unless the method is not intended to return a value, in which case no
        // callback need be passed).  This allows fully asynchronous calls from the DMI client
        method.apply(this, args.concat([function (retVal) {
            if (callback) _this.fireCallback(callback, "retVal", [retVal]);
        }]));
    } else {
        // if the method is being invoked on something else, we can't control how/where we pass
        // a callback, so it has to be synchronous here - we take the return value and pass it
        // back to the DMI client
        var retVal = method.apply(target, args);
        if (callback) _this.fireCallback(callback, "retVal", [retVal]);
    }

}



});


