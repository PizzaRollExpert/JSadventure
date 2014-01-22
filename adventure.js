
"use strict";


// Extending existing prototypes
Function.prototype.curry = function() { //Currying! (http://ejohn.org/blog/partial-functions-in-javascript/)
    var fn = this, args = Array.prototype.slice.call(arguments);
    return function() {
      return fn.apply(
        this,
        args.concat(Array.prototype.slice.call(arguments))
      );
    };
  };


//utility functions

function defaultVal(variable, value) {
  return variable === undefined ? value : variable;
}
function defaultObj(object, value) {
  object = defaultVal(object, {});
  for (var i in value) {
    object[i] = defaultVal(object[i], value[i]);
  }
  return object;
}

function rgb(red, blue, green) {
  return 'rgb(' + Math.round(red) + ', ' + Math.round(blue) + ', ' +  Math.round(green) + ')';
}


function bound(num, a, b) {
  var low = Math.min(a, b);
  var high = Math.max(a, b);
  return Math.max(low, Math.min(high, num));
}


//function for code that users write

function userCode(code) {
  var resultant;
  adventure.command.history.unshift(code);

  //user-accesable variables;
  var fireball = new Spell(20, "fire", "images/pixlfireball.png");

  function say(what) {
    adventure.command.message('you: ' + what);
  }
  function getObjects() {
    var result = [], x, y,
        hero = adventure.world.hero;
    for (x = hero.x - 1; hero.x + 1 >= x; x++) {
      for (y = hero.y - 1; hero.y + 1 >= y; y++) {
        result.push(adventure.map.objects[y][x]);
      }
    }
    return result;
  }
  try {
    resultant = (function() {
      var adventure, Action, Creature, resultant; //shielding things from user
      return eval(code);
    })();
  }
  catch (err) {
    console.error(new Error(err));
    adventure.command.message("error: " + err);
  }
  if (resultant !== undefined) adventure.command.message(resultant);
}

//constructors

var Action = function(x, y, callback) {
  this.x = x;
  this.y = y;
  this.callback = callback;
};



var Creature = function(hp, power, image, name, setup) {
  var self = this;
  setup = defaultObj(setup, {
    "repeat" : "no-repeat"
  });
  this.name = name;
  this.hp = hp;
  this.maxHp = hp;
  this.setup = setup;
  this.power = power;
  this.image = image;
  this.attack = function () {
    adventure.command.message(this.name + " hits you for " + this.power + " points of damage");
    adventure.world.hero.damage(this.power);
  };

  this.damage = function(amount) {
    if (adventure.world.mode === "combat") {
        if (!adventure.combat.aggravated) adventure.combat.engage();
        this.hp -= amount;
        if (this.hp <= 0) { //death x_x
          adventure.combat.end();
      }
    }
  };

  this.actions = [new Action(0, 0, function() {
      adventure.combat.start([self]);
      console.log("combat started!");
    })];

};


var Spell = function(power, type, image){
  this.power = Math.pow(power, 1.1);
  this.type = type;
  this.image = image;
  this.time = power * 50;
  this.cast = function() {
    adventure.spellQueue.addToQueue(this);
  };
  this.callback = function() {
    var damage = this.power;
    adventure.command.message("hit! " + damage + " points of damage");
    adventure.combat.target.damage(damage);
  };
};
//the main thing

var adventure = {

  
  el : document.getElementById('JSadventure'),
  canvas : document.getElementById('JSadventure').getContext('2d'),
  
  command : {

    box : document.getElementById('commandBox'),
    log : document.querySelector('#commandBox .log'),
    line : document.querySelector('#commandBox .commandLine'),

    history : [],
    historyIndex : -1,
    
    message : function(what) {
      var message = document.createElement('div');
      message.innerHTML = what;
      adventure.command.log.appendChild(message);
    }
  },

  world : {
    
    height: 800,
    width : 800,

    mode : "map",


    hero : {

      
      x : 0,
      y : 0,
      
      compX : 0,
      compY : 0,

      hp : 100,
      maxHp : 100,
      damage : function(ammount){
        console.log(ammount);
        this.hp -= ammount;
        if (this.hp <= 0) {
          adventure.gameOver(); //to be implemented
        }
      },
      
      inventory : [],
      
      image : ["images/pixlwizard.png"],
      
      setup : {
        repeat : "no-repeat",
      },
      
      move : function(x, y, type) {

        var map = adventure.map,
            //terain = map.terain[this.y][this.x],
            obj = map.objects[this.y][this.x],
            
            squares = adventure.squares,
           
            i, v;

        adventure.map.draw();
        x = defaultVal(x, 0);
        y = defaultVal(y, 0);
        type = defaultVal(type, "rel");
        this.compX = bound(type === "abs" ? x : this.x + x, 0, squares.x - 1);
        this.compY = bound(type === "abs" ? y : this.y + y, 0, squares.y - 1);
        for (i in map.actions[this.compY][this.compX]) {
          v = map.actions[this.compY][this.compX][i];
          //console.log(v);
          if (v instanceof Action) v.callback();
        }
        this.x = bound(this.compX, 0, squares.x - 1); //dat zero index
        this.y = bound(this.compY, 0, squares.y - 1);
        this.setup.scale = {
          "x" : adventure.el.width/adventure.world.width,
          "y" : adventure.el.height/adventure.world.height
        };
        if (adventure.world.mode === "map") adventure.draw(this, this.x, this.y);
      }
    },

    preojectiles : {
      fireball : "images/pixlfireball.png"
    },

    ork : new Creature(100, 10,
      ["images/pixlork2.png"],
      "Ork"
    ),

    background : {
      image : ["images/pixlfield.png"],
      dim : {
        x: 800,
        y : 800
      }
    },
    
    grass : {
      //image : ["images/pixlgrass.png", "images/pixlgrass2.png", "images/pixlgrass3.png"],
      pattern : function (startX, startY, endX, endY, ctx) {
        console.log([startX, startY, endX, endY, ctx]);
        function mapColors(c, i) {
          var up = 110, down = 90;
          if (i === 1) {up = 235; down = 170;}
          return bound((c + oldLine[x][i])/2 + Math.random() * 20 - 10, down, up);
        }
        var width = 5,
            color = [
              Math.random() * 50 + 90,
              Math.random() * 105 + 155,
              Math.random() * 30 + 90
            ],
            oldLine = [],
            y, x;
        for (y = startY; y < endY; y += width) {
          color = [
            Math.random() * 50 + 90,
            Math.random() * 105 + 155,
            Math.random() * 30 + 90
          ];
          for (x = startX; x < endX; x += width) {
            if (!oldLine[x]) oldLine[x] = color;
            color = color.map(mapColors);
            oldLine[x] = color;
            ctx.fillStyle = rgb(color[0], color[1], color[2]);
            ctx.fillRect(x, y, width, width);
          }
          y += width;
          for (x = endX - width; x >= 0; x -= width) {
            if (!oldLine[x]) oldLine[x] = color;
            color = color.map(mapColors);
            oldLine[x] = color;
            ctx.fillStyle = rgb(color[0], color[1], color[2]);
            ctx.fillRect(x, y, width, width);
          }
        }

      }
    },

    brick : {
      image : ["images/pixlbrick.png"],
      
      actions : [new Action(0, 0, function() {
          var hero = adventure.world.hero;
          hero.compX = hero.x;
          hero.compY = hero.y;
        })]
    },

    treasure : {
      image : ["images/pixlchest.png", "images/pixlchest2.png"],

      state : {
        closed : true
      },
      
      setup : {
       repeat : "no-repeat",
       imgnum : 0
      },
      

      open : function() {
        var i, v, key;
        for (i in adventure.world.hero.inventory) {
          v = adventure.world.hero.inventory[i];
          if (v.opens === "chest") key = true;
        }
        if (key) {
          this.state.closed = false;
          this.setup.imgnum = 1;
          adventure.map.draw("objects", false);
          adventure.map.draw("terain");
          adventure.map.draw("objects");
          adventure.command.message("Victory!");
        }
      }
    },

    key : {
      image: ["images/pixlkey.png"],

      setup : {
        repeat : "no-repeat"
      },

      opens : "chest",

      actions : [new Action(0, 0, function(){
        var hero = adventure.world.hero;
        adventure.world.hero.inventory.push(this.parent);
        console.log({x: hero.compX, y: hero.compY});
        adventure.map.objects[hero.compY][hero.compX] = 0;
        adventure.map.mapActions();
        adventure.map.mapActions();
        adventure.map.draw("objects", false);
        adventure.map.draw();
      })]
    },
    
    gate : {
      image : ["images/pixlgate.png", "images/pixlgate2.png"],
      
      setup : {
        repeat : "no-repeat",
        height : 1,
        imgnum : 0
      },
      
      state : {
        closed : true
      },
      
      actions : [new Action(0, 0, function() {
        if (this.parent.state.closed) {
          var hero = adventure.world.hero;
          hero.compX = hero.x;
          hero.compY = hero.y;
        }
        })],
      open : function() {
        this.state.closed = false;
        this.setup.imgnum = 1;
        adventure.map.draw("objects", false); //just to reset the cache, it feels dirty I know :(
        adventure.map.draw("terain");
        adventure.map.draw("objects");
      },
      close : function() {
        this.state.closed = true;
        this.setup.imgnum = 0;
        adventure.map.draw("objects", false);
        adventure.map.draw("terain");
        adventure.map.draw("objects");
      }
    }
  },
  
  map : function() {
    
    var g = adventure.world.grass,
        b = adventure.world.brick,
        p = adventure.world.gate,
        
        t = adventure.world.treasure,
        k = adventure.world.key,

        o = adventure.world.ork,

        maxWidth = adventure.squares.x,
        maxHeight = adventure.squares.y;
    
    return {
      terain : [
        [[g, {
          x : [0, maxWidth],
          y : [0, maxHeight]
        }]]
      ],
      
     objects : [
        [0,0,0,0,0,0,0,0,o,k],
        [0,0,0,0,0,0,0,0,b,b],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,b,b,b,b,b,0],
        [0,0,0,0,b,0,0,0,b,0],
        [0,0,0,0,p,0,t,0,b,0],
        [0,0,0,0,b,0,0,0,b,0],
        [0,0,0,0,b,b,b,b,b,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0]
      ],
      
      cache : {},
      
      start : {x: 0, y:5},
      
      draw : function(what, useCache) {
        useCache = defaultVal(useCache, true);
        var setup, i, v, x, y,
            cacheCanvas, context, cacheImg, drawHero,
            toLoopThrough = {};
        if (what === "all" || what === undefined) {
          toLoopThrough = {"terain" : this.terain, "objects" : this.objects};
          drawHero = true;
        } else {
          toLoopThrough[what] = this[what];
        }
        for (i in toLoopThrough) {
          v = toLoopThrough[i];
          v || console.error("unexpected value on v:" + v + ".\b what = " + what);
          if (this.cache[i] && useCache) {
            adventure.canvas.drawImage(this.cache[i], 0, 0, adventure.el.width, adventure.el.height);
          } else {
            cacheCanvas = document.createElement('canvas');
            cacheCanvas.width = adventure.world.width;
            cacheCanvas.height = adventure.world.height;
            context = cacheCanvas.getContext('2d');
            for (y in v) {
              for (x in v) {
                if (v[y][x]) {
                  setup = defaultVal(v[y][x].setup, {});
                  adventure.draw(v[y][x], x, y, setup, context);
                }
              }
            }
            cacheImg = new Image();
            cacheImg.onload = function() {
              adventure.canvas.drawImage(this, 0, 0, adventure.el.width, adventure.el.height);
              adventure.world.hero.move();
            };
            cacheImg.src = cacheCanvas.toDataURL("image/png");
            this.cache[i] = cacheImg;
          }
        }
      },
      
      mapActions : function() {

        var i,y,x,l,
            v,f,g,k,
            j,o,
            toMap = [this.terain,this.objects];
        this.actions = [];
        for (j = 0; adventure.squares.y > j; j++) {
          this.actions[j] = [];
          for (o = 0; adventure.squares.x > o; o++) {
            this.actions[j][o] = [];
          }
        }
        for (i in toMap) {
          v = toMap[i];
          for (y in v) {
            f = v[y];
            for (x in f) {
              g = f[x].actions;
              for (l in g) {
                k = g[l];
                k.parent = f[x];
                this.actions[parseInt(y) + parseInt(k.y)][parseInt(x) + parseInt(k.x)].push(k);
              }
            }
          }
        }
      }
    };
  },

  combat : {

    aggravated : false,

    start : function(enemies) {
      this.enemies = enemies;
      var world = adventure.world,
          canvas = adventure.canvas,
          i, v;
      world.mode = "combat";
      this.target = enemies[0];
      this.draw();
      this.interval = setInterval(this.draw, 10);
    },

    engage : function() {
      var enemies = this.enemies,
          i, v;
      console.log("enemy engaged!");
      this.aggravated = true;
      for (i in enemies) {
        v = enemies[i];
        console.log(v);
        v.interval = setInterval(v.attack.bind(v), 5000);
      }
    },

    end : function () {    
      var world = adventure.world,
          map = adventure.map,
          hero = world.hero,
          enemies = adventure.combat.enemies,
          i, v;
      window.clearInterval(this.interval);
      for (i in enemies) {
        v = enemies[i];
        window.clearInterval(v.interval);
      }
      adventure.world.mode = "map";
      console.log(adventure.world.mode);
      map.objects[hero.y][hero.x] = 0;
      adventure.command.message("You win!");
      adventure.map.mapActions();
      adventure.map.draw("objects", false);
      adventure.map.draw();
      hero.move();
    },

    draw : function() {
      var world = adventure.world,
          hero = world.hero,
          el = adventure.el,
          canvas = adventure.canvas,
          enemies = adventure.combat.enemies,
          target = this.target,
          shapes = adventure.shapes,
          spellQueue = adventure.spellQueue,
          startT = spellQueue.startT,
          endT = spellQueue.endT,
          timeScale = spellQueue.timeScale,

          heroHealth = shapes.standardBar.curry('#f00', 40, 40),
          enemyHealth = shapes.standardBar.curry('#f00'),
          spellTimeMeter = shapes.pacman.curry(20, '#228', 60, 100),

          i, v;

      canvas.drawImage(world.background.image[0], 0, 0, 600, 600);
      canvas.drawImage(hero.image[0], el.width/5, 600 - 115);
      heroHealth(hero.hp/hero.maxHp);
      if (adventure.spellQueue.casting === "true") {
        spellTimeMeter((Date.now() - startT)/timeScale);
      }
      for (i in enemies) {
        v = enemies[i];
        canvas.drawImage(v.image[0], 4*el.width/5, 600 - 115);
        enemyHealth(el.width - 120, 40 + i * 10, v.hp/v.maxHp);
      }
    },

  },


  gameOver : function(){ 
    combat.end();
    adventure.command.message("you lost :(");
  },
  
  squares : {x : 10, y : 10},
  
  init : function() {
    map = map();
    adventure.map = map;
    // var adv = adventure,
    //     world = adv.world,
    //     map = adv.map,
    //     draw = adv.draw,
    //     el = adv.el,
    //     squares = adv.squares,
    //     canvas = adv.canvas,
        
    //     hero = world.hero;
    
    adventure.eventHandling();

    map.draw();

    map.mapActions();
    hero.move(map.start.x, map.start.y, "abs");
  },
  
  draw : function(obj, x, y, setupdata, canvas) {
    //console.log(setupdata);
    x = defaultVal(x, 0);
    y = defaultVal(y, 0);
    canvas = defaultVal(canvas, adventure.canvas);
    if (obj) {
      setupdata = defaultVal(setupdata, defaultVal(obj.setup,{}));
    } else {
      setupdata = {};
    }

    setupdata.repeat = defaultVal(setupdata.repeat, "repeat");
    setupdata.imgnum = defaultVal(setupdata.imgnum, "random");
    setupdata.align = defaultVal(
      setupdata.align,
      setupdata.repeat === "repeat" ? "top-left" : "center"
    );
    setupdata.height = defaultVal(setupdata.height, "auto");
    setupdata.width = defaultVal(setupdata.width, "auto");
    setupdata.scale = defaultObj(setupdata.scale, {x: 1, y: 1});
    //console.log(setupdata);
    var adv = adventure,
        width = canvas.canvas.height / adv.squares.x,
        height = canvas.canvas.height / adv.squares.y,
        item = obj instanceof Array ? obj[0] : obj,
        xPos, yPos;
    console.log(item);
    if (item.pattern) {
      item.pattern(obj[1].x[0]*width, obj[1].y[0]*height, obj[1].x[1]*width, obj[1].y[1]*height, canvas);
    }
    if (item.image) {
      var length = item.image.length,
          img = item.image,
          v, i, j, imgNum, imgHeight, imgWidth;
      for (i = 0; height > i; i += img[imgNum].height) {
        for (j = 0; width > j; j += img[imgNum].width) {
          imgNum = setupdata.imgnum === "random" ?
            Math.round(Math.random() * (length - 1)) :
            parseInt(setupdata.imgnum);
          imgHeight = parseInt(setupdata.height === "auto" ?
            img[imgNum].height :
            parseInt(setupdata.height) * height);
          imgHeight *= setupdata.scale.x;
          imgWidth = parseInt(setupdata.width === "auto" ?
            img[imgNum].width :
            parseInt(setupdata.width) * width);
          imgWidth *= setupdata.scale.y;
          switch (setupdata.align) {
            case "center":
              xPos = x * width + (width - imgWidth) / 2;
              yPos = y * height + (height - imgHeight) / 2;
              break;
            default :
              xPos = j + x * width;
              yPos = i + y * height;
          }
          canvas.drawImage(img[imgNum], xPos, yPos, imgWidth, imgHeight);
        }
      }
    }
    
  },

  shapes : {

    pacman : function(radius, color, x, y, arcLength) {
      var ctx = adventure.canvas;
      if (color) ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, radius, 0, 2 * (1 + arcLength) * Math.PI , true);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fill();
    },

    bar : function (outlineWidth, outlineColor, width, height, fillColor, x, y, fillAmount) {
      var ctx = adventure.canvas;
      ctx.fillStyle = outlineColor;
      ctx.fillRect(x, y, 2 * outlineWidth + width, 2 * outlineWidth + height);
      ctx.fillStyle = fillColor;
      ctx.fillRect(x + outlineWidth, y + outlineWidth, Math.max(fillAmount, 0) * width, height);
    },

    standardBar : function(fillColor, x, y, fillWidth){
      return adventure.shapes.bar(2, '#222', 80, 4, fillColor, x, y, fillWidth);
    },

  },


  
  loadResources : function() {
    adventure.toLoad = 0;
    adventure.loaded = 0;
    var i, v, j, a, img,
        onload = function() {
          var data = this.dataset;
          adventure.loaded++;
          adventure.world[data.i].image[data.j] = this;
          if (adventure.loaded === adventure.toLoad) {
           adventure.init();
          }
        };
    for (i in adventure.world) {
      v = adventure.world[i];
      if (v.image) {
        for (j in v.image) {
          a = v.image[j];
          adventure.toLoad++;
          img = new Image();
          img.dataset.i = i;
          img.dataset.j = j;
          img.src = a;
          img.onload = onload;
        }
      }
    }
  },

  spellQueue : {

    queue : [],

    startT : 0,
    endT : 0,
    timeScale : 0,

    addToQueue : function(what) {

      var queue = this.queue,
          startT = this.startT,
          endT = this.endT,
          timeScale = adventure.spellQueue.timeScale;

      function callFirst() {
        var queue = adventure.spellQueue.queue,
            startT = adventure.spellQueue.startT,
            endT = adventure.spellQueue.endT,
            timeScale = adventure.spellQueue.timeScale,
            first = queue[0];
        if (first) {
          adventure.spellQueue.casting = "true";
          adventure.spellQueue.startT = Date.now();
          adventure.spellQueue.endT = startT + first.time;
          adventure.spellQueue.timeScale = first.time;
          console.log(adventure.spellQueue.timeScale);
          setTimeout(function() {
            first.callback();
            queue.shift();
            callFirst();
          }, first.time);
        } else {
          adventure.spellQueue.casting = "false";
        }
      }

      queue.push(what);
      if (queue.length === 1) callFirst.apply(adventure.spellQueue);
    },


  },
  
  eventHandling : function () {
    var hero = adventure.world.hero,
        el = adventure.el,
        command = adventure.command;
    document.addEventListener('keydown', function(event) {
      if (event.target.id == adventure.el.id && adventure.world.mode ==="map")  {
        switch (event.which) {
          case 65: //a
          case 37: //left
            hero.move(-1, 0);
            break;
          case 87: //w
          case 38: //up
            hero.move(0, -1);
            break;
          case 68: //d
          case 39: //right
            hero.move(1, 0);
            break;
          case 83: //s
          case 40: //down
            hero.move(0, 1);
            break;
        }
     } else if (event.target.classList === command.line.classList) {
        switch (event.which) {
          case 13: //enter
            userCode(command.line.value);
            command.line.value = '';
            command.historyIndex = -1;
            break;
          case 38: //up
            command.historyIndex += 1;
            command.historyIndex = Math.min(command.historyIndex, command.history.length - 1);
            command.line.value = command.history[command.historyIndex];
            break;
          case 40: //down
            command.historyIndex -= 1;
            command.historyIndex = Math.max(command.historyIndex, 0);
            command.line.value = command.history[command.historyIndex];
            break;
        }
     }
    });
  }

};

var adv = adventure,
    world = adv.world,
    map = adv.map,
    draw = adv.draw,
    el = adv.el,
    squares = adv.squares,
    canvas = adv.canvas,
    combat = adventure.combat,
    
    hero = world.hero;


adventure.loadResources(); //loadResources will call init when it's done