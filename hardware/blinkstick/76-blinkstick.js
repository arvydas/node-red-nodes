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

        var blinkstickAnimationComplete = function () {
            animationComplete = true;
        };

        findBlinkStick();

        this.on("input", function(msg) {
            if (!animationComplete) {
                node.warn("BlinkStick is already running animation");
                return;
            }

            if (Object.size(node.led) !== 0) {
                try {
                    var color;

                    if (p2.test(msg.payload)) {
                        var rgb = msg.payload.split(",");
                        color = "#" + decimalToHex(parseInt(rgb[0])&255) +
                          decimalToHex(parseInt(rgb[1])&255) + decimalToHex(parseInt(rgb[2])&255);
                    } else {
                        color = msg.payload.toLowerCase().replace(/\s+/g,'');
                    }

                    animationComplete = false;

                    if (this.task == "pulse") {
                        node.led.pulse(color, {'duration': this.duration, 'steps': this.steps }, blinkstickAnimationComplete);
                    } else if (this.task == "morph") {
                        node.led.morph(color, {'duration': this.duration, 'steps': this.steps }, blinkstickAnimationComplete);
                    } else if (this.task == "blink") {
                        node.led.blink(color,{'repeats': this.repeats, 'delay': this.delay }, blinkstickAnimationComplete);
                    } else {
                        node.led.setColor(color, blinkstickAnimationComplete);
                    }
                }
                catch (err) {
                    node.warn("BlinkStick missing ? " + err);
                    node.led = blinkstick.findFirst();
                }
            }
            else {
                //node.warn("No BlinkStick found");
                findBlinkStick();
            }
        });
    }

    RED.nodes.registerType("blinkstick",BlinkStick);
};
