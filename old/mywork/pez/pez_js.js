"use strict";
var myPezDispenser;
var myPezHeadOptions = [];
document.addEventListener("DOMContentLoaded", function (event) {
    var headOptions = document.querySelectorAll('[data-head]');
    for (var i = 0; i < headOptions.length; ++i) {if (window.CP.shouldStopExecution(1)){break;}
        // Add dispenser options
        myPezHeadOptions.push(new PezDispenserHead(headOptions[i].getAttribute('data-head'), headOptions[i].currentSrc, headOptions[i].getAttribute('data-size'), headOptions[i].getAttribute('data-value')));
    }
window.CP.exitedLoop(1);

    var anchor = document.getElementById("MyPezDispenser");
    myPezDispenser = new PezDispenser(anchor, myPezHeadOptions[1]);
    var _loop_1 = function (i) {
        headOptions[i].addEventListener('click', function (event) {
            myPezDispenser.swap(myPezHeadOptions[i]);
        });
    };
    for (var i = 0; i < headOptions.length; ++i) {if (window.CP.shouldStopExecution(2)){break;}
        _loop_1(i);
    }
window.CP.exitedLoop(2);

});
var Pez = (function () {
    function Pez(flavor) {
        if (undefined === flavor) {
            var possibles = ['cherry', 'blueberry', 'grape', 'orange'];
            var index = Math.floor(Math.random() * (possibles.length));
            flavor = possibles[index];
        }
        this.flavor = flavor;
    }
    Pez.prototype.getFlavor = function () { return this.flavor; };
    return Pez;
}());
var PezDispenserHead = (function () {
    function PezDispenserHead(name, url, maxSize, value) {
        this.name = name;
        this.url = url;
        this.maxSize = maxSize;
        this.value = value;
    }
    PezDispenserHead.prototype.getName = function () { return this.name; };
    PezDispenserHead.prototype.getURL = function () { return this.url; };
    PezDispenserHead.prototype.getMaxSize = function () { return this.maxSize; };
    PezDispenserHead.prototype.getValue = function () { return this.value; };
    return PezDispenserHead;
}());
var PezDispenser = (function () {
    function PezDispenser(anchor, head) {
        var self = this;
        this.anchor = anchor;
        this.head = head;
        this.container = [];
        // Create the pez dispenser elements
        this.headElement = document.createElement('img');
        this.headElement.src = this.head.getURL();
        this.headElement.alt = this.head.getName();
        this.headElement.classList = "pezHead";
        this.countElement = document.createElement('span');
        this.countElement.innerText = "Pez Count: " + this.container.length + " / " + this.head.getMaxSize();
        this.addElement = document.createElement('input');
        this.addElement.type = "button";
        this.addElement.value = "Add";
        this.addElement.addEventListener('click', function (event) {
            self.add(new Pez());
        });
        this.dispenseElement = document.createElement('input');
        this.dispenseElement.type = "button";
        this.dispenseElement.value = "Dispense";
        this.dispenseElement.addEventListener('click', function (event) {
            self.dispense();
        });
        this.messageElement = document.createElement('span');
        this.messageElement.innerText = "";
        this.anchor.appendChild(this.headElement);
        this.anchor.appendChild(this.countElement);
        this.anchor.appendChild(this.addElement);
        this.anchor.appendChild(this.dispenseElement);
        this.anchor.appendChild(this.messageElement);
    }
    PezDispenser.prototype.swap = function (newHead) {
        this.head = newHead;
        this.headElement.src = this.head.getURL();
        this.headElement.alt = this.head.getName();
        // Drop out any extra pez
        if (this.head.getMaxSize() < this.container.length) {
            this.container.length = this.head.getMaxSize();
        }
        this.countElement.innerText = "Pez Count: " + this.container.length + " / " + this.head.getMaxSize();
        this.messageElement.innerText = "Swapped to " + newHead.getName() + "!";
    };
    PezDispenser.prototype.add = function (pez) {
        if (this.head.getMaxSize() > this.container.length) {
            this.container.push(pez);
            this.countElement.innerText = "Pez Count: " + this.container.length + " / " + this.head.getMaxSize();
            this.messageElement.innerText = "Added a " + pez.getFlavor() + " flavored pez";
            return true;
        }
        else {
            this.messageElement.innerText = "It's full! Cannot add anymore!";
            return false;
        }
    };
    PezDispenser.prototype.dispense = function () {
        if (0 < this.container.length) {
            var result = this.container.pop();
            this.messageElement.innerText = "Yum! You got a " + result.getFlavor() + " flavored pez!";
            this.countElement.innerText = "Pez Count: " + this.container.length + " / " + this.head.getMaxSize();
            return result;
        }
        else {
            this.messageElement.innerText = "There's no more.";
            this.countElement.innerText = "Pez Count: " + this.container.length + " / " + this.head.getMaxSize();
            return null;
        }
    };
    return PezDispenser;
}());
