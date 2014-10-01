/**
 * Copyright 2013 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    "use strict";
    var blinkstick = require("blinkstick");

    Object.size = function(obj) {
        var size = 0;
        for (var key in obj) { if (obj.hasOwnProperty(key)) { size++; } }
        return size;
    };

    function decimalToHex(d, padding) {
        var hex = Number(d).toString(16);
        padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

        while (hex.length < padding) {
            hex = "0" + hex;
        }

        return hex;
    }

    function BlinkStick(n) {
        RED.nodes.createNode(this,n);

        this.name = n.name;
        this.serial = n.serial;
        this.task = n.task;
        this.delay = n.delay;
        this.repeats = n.repeats;
        this.duration = n.duration;
        this.steps = n.steps;
        this.repeat = n.repeat;
        this.closing = false;
        this.color = '';

        var p1 = /^\#[A-Fa-f0-9]{6}$/;
        var p2 = /[0-9]+,[0-9]+,[0-9]+/;
        var node = this;
        var animationComplete = true;

        var findBlinkStick = function () {
            if (typeof(node.serial) == 'string' && node.serial.replace(/\s+/g,'') !== '') {
                blinkstick.findBySerial(node.serial, function (device) {
                    node.led = device;

                    if (Object.size(node.led) === 0) {
                        node.error("BlinkStick with serial number " + node.serial + " not found");
                    }
                });
            } else {
                node.led = blinkstick.findFirst();

                if (Object.size(node.led) === 0) {
                    node.error("No BlinkStick found");
                }
            }
        };

        var canRepeat = function () {
            return node.task == "pulse" || node.task == "blink";
        };

        var blinkstickAnimationComplete = function () {
            animationComplete = true;

            if (!node.closing && node.color !== '') {
                applyPayload();
            }
        };

        var applyPayload = function () {
            animationComplete = false;

            if (node.task == "pulse") {
                node.led.pulse(node.color, {'duration': node.duration, 'steps': node.steps }, blinkstickAnimationComplete);
            } else if (node.task == "morph") {
                node.led.morph(node.color, {'duration': node.duration, 'steps': node.steps }, blinkstickAnimationComplete);
            } else if (node.task == "blink") {
                node.led.blink(node.color,{'repeats': node.repeats, 'delay': node.delay }, blinkstickAnimationComplete);
            } else {
                node.led.setColor(node.color, blinkstickAnimationComplete);
            }

            //Clear color value until next one is received
            if (!node.repeat) {
                node.color = '';
            }
        };

        findBlinkStick();

        this.on("input", function(msg) {
            if (Object.size(node.led) !== 0) {
                try {
                    if (p2.test(msg.payload)) {
                        var rgb = msg.payload.split(",");
                        node.color = "#" + decimalToHex(parseInt(rgb[0])&255) +
                          decimalToHex(parseInt(rgb[1])&255) + decimalToHex(parseInt(rgb[2])&255);
                    } else {
                        node.color = msg.payload.toLowerCase().replace(/\s+/g,'');
                    }

                    //Start color animation, otherwise the color is queued until animation completes
                    if (animationComplete) {
                        applyPayload();
                    }
                } catch (err) {
                    node.warn("BlinkStick missing ? " + err);
                    //Reset animation
                    animationComplete = true;
                    //Look for a BlinkStick
                    findBlinkStick();
                }
            }
            else {
                //node.warn("No BlinkStick found");
                findBlinkStick();
            }
        });

        this.on("close", function() {
            this.closing = true;
        });
    }

    RED.nodes.registerType("blinkstick",BlinkStick);
};
