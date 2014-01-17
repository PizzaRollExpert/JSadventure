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

function bound(num, a, b) {
  var low = Math.min(a, b);
  var high = Math.max(a, b);
  return Math.max(low, Math.min(high, num));
}


//function for code that users write

function userCode(code) {
  var resultant;
  adventure.command.history = [code].concat(adventure.command.history);

  //user-accesable variables;
  function say(what) {
    adventure.command.message('you: ' + what); 
  }

  try {
    resultant = (function() {
      var adventure = null;
      return eval(code);
    })();
  }
  catch (err) {
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

    
    hero : {

      
      x : 0,
      y : 0,
      
      compX : 0,
      compY : 0,
      
      inventory : [],
      
      image : ["images/pixlwizard.png"],
      
      setup : {
        repeat : "no-repeat",
      },
      
      move : function(x, y, type) {

        var map = adventure.map,
            terain = map.terain[this.y][this.x],
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
        adventure.draw(this, this.x, this.y);
      }
    },

    background : {
      image : ["images/pixlforset.png"]
    },
    
    grass : {
      image : ["images/pixlgrass.png", "images/pixlgrass2.png", "images/pixlgrass3.png"],
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
      image : ["images/pixlchest.png"],
      
      setup : {
       repeat : "no-repeat"
      }
      
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
        var hero = adventure.world.hero,
            targetGate = this.parent;
        if (targetGate.state.closed) {
          targetGate.state.closed = false;
          targetGate.setup.imgnum = 1;
          // adventure.map.draw("terain");
          adventure.map.draw("objects", false); //just to reset the cache, it feels dirty I know :(
          adventure.map.draw("terain");
          adventure.map.draw("objects");
          //adventure.draw(targetGate, hero.compX, hero.compY);
          hero.compX = hero.x;
          hero.compY = hero.y;
        }
        })]
    }
  },
  
  map : function() {
    
    var g = adventure.world.grass,
        b = adventure.world.brick,
        p = adventure.world.gate,
        
        t = adventure.world.treasure;
    
    return {
      terain : [
        [g,g,g,g,g,g,g,g,g,g],
        [g,g,g,g,g,g,g,g,g,g],
        [g,g,g,g,g,g,g,g,g,g],
        [g,g,g,g,b,b,b,b,b,g],
        [g,g,g,g,b,g,g,g,b,g],
        [g,g,g,g,g,g,g,g,b,g],
        [g,g,g,g,b,g,g,g,b,g],
        [g,g,g,g,b,b,b,b,b,g],
        [g,g,g,g,g,g,g,g,g,g],
        [g,g,g,g,g,g,g,g,g,g]
      ],
      
     objects : [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,p,0,t,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
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
        if (!this.actions) {
          this.actions = [];
          for (j = 0; adventure.squares.y > j; j++) {
            this.actions[j] = [];
            for (o = 0; adventure.squares.x > o; o++) {
              this.actions[j][o] = [];
            }
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
              //this.actions[y][x] = this.actions[y][x].concat(g);
            }
          }
        }
      }
    };
  },
  
  squares : {x : 10, y : 10},
  
  init : function() {
    adventure.map = adventure.map();
    var adv = adventure,
        world = adv.world,
        map = adv.map,
        draw = adv.draw,
        el = adv.el,
        squares = adv.squares,
        canvas = adv.canvas,
        
        hero = world.hero;
    
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
        xPos, yPos;
    
    if (obj.image) {
      var length = obj.image.length,
          img = obj.image,
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
  
  eventHandling : function () {
    var hero = adventure.world.hero,
        el = adventure.el,
        command = adventure.command;
    document.addEventListener('keydown', function(event) {
      if (event.target.id == adventure.el.id) {
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
"use strict";
adventure.loadResources(); //loadResources will call init when it's done





