//-----TO-DO----------------------
//Add CCW vs CW circle functionality
//create pixel transform (zoom in/out)
//snap to endpoints
//create ability to link
//create ability to move

//window.alert("click in the box");
const canvas = document.getElementById("myCanvas");
canvas.style.cursor = "none";

const ctx = canvas.getContext("2d");
canvas.focus();
isDrawing = false;
drawCircle = true;
drawLine = false;
mx = 0;
var WIDTH = 800;
snapRadius = 10; //this radius is in pixels
var HEIGHT = 800;
my = 0;
//the coordinate transformation to map from coordinates to pixels (scale and then offset)
windowTransform = {Xscale: 1.0, Yscale: 1.0, Xoffset: 0.0, Yoffset: 0.0}
//line by default

//----------TOOLS-----------------------------------------------------

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
}

function coordToPix(x, y, transform) {
  return [(x*transform.Xscale) + transform.Xoffset, (y*transform.Yscale) + transform.Yoffset];
}

function pixToCoord(x, y, transform) {
  return [(x-transform.Xoffset) / transform.Xscale, (y-transform.Yoffset) / transform.Yscale];

}

function distToCoord(dist, transform) {
  return dist / transform.Xscale;
}

function distToPix(dist, transform) {
  return dist * transform.Xscale;
}

function drawDisplay(ctx, canvas, lines, circles) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (i = 0; i < lines.length; i++) {
      if (lines[i].isFinished) {
        lines[i].draw(ctx);
      }
    }
    for (c = 0; c < circles.length; c++) {
      if(circles[c].isFinished) {
        circles[c].draw(ctx);
      }
    }
}

function snapCoords(x, y, points, lines, circles, windowTransform, snapRadius) {
  var Xout = x;
  var Yout = y;
  // for (i = 0; i < lines.length; i++) {
  //   if (distToPix(dist(x, y, lines[i].endpoints[0].x, lines[i].endpoints[0].y), windowTransform) < snapRadius && lines[i].isFinished) {
  //     Xout = lines[i].endpoints[0].x;
  //     Yout = lines[i].endpoints[0].y;
  //   }
  //   if (distToPix(dist(x, y, lines[i].endpoints[1].x, lines[i].endpoints[1].y), windowTransform) < snapRadius && lines[i].isFinished) {
  //     Xout = lines[i].endpoints[1].x;
  //     Yout = lines[i].endpoints[1].xy;
  //   }
  // }

  for (p = 0; p < points.length; p++) {
    pt = points[p]
    if (distToPix(dist(x, y, pt.x, pt.y), windowTransform) < snapRadius) {
      Xout = pt.x;
      Yout = pt.y;
    }
  }

  return [Xout, Yout];
}

function snapPix(x, y, points, lines, circles, windowTransform, snapRadius) {
  var Xout = x;
  var Yout = y;
  for (i = 0; i < lines.length; i++) {
    var endpt1 = coordToPix(lines[i].endpoints[0].x, lines[i].endpoints[0].y, windowTransform);
    if (dist(x, y, endpt1[0], endpt1[1]) < snapRadius && lines[i].isFinished) {
      Xout = endpt1[0];
      Yout = endpt1[1];
    }
    var endpt2 = coordToPix(lines[i].endpoints[1].x, lines[i].endpoints[1].y, windowTransform);
    if (dist(x, y, endpt2[0], endpt2[1]) < snapRadius && lines[i].isFinished) {
      Xout = endpt2[0];
      Yout = endpt2[1];
    }
  }
  return [Xout, Yout];
}
//---------OBJECTS-------------------------------------------------------

class Point {
  constructor(_x, _y) {
    this.x = _x;
    this.y = _y;
    this.lines = [];
  }
  draw(ctx) {
    ctx.fillRect(x-1,y-1,3,3)
  }
}

class Line {
 
  // construct with two Point objects
  constructor (p, q) {
    this.points = [];
    this.endpoints = [];
    this.endpoints.push(p);
    this.endpoints.push(q);
    this.points.push(p);
    this.points.push(q);
    this.isFinished = false;

  }
  draw(ctx) {
    // Start a new Path
    var pix1 = coordToPix(this.endpoints[0].x, this.endpoints[0].y, windowTransform);
    var pix2 = coordToPix(this.endpoints[1].x, this.endpoints[1].y, windowTransform);
    ctx.beginPath();
    ctx.moveTo(pix1[0], pix1[1]);
    ctx.lineTo(pix2[0], pix2[1]);

    // Draw the Path
    ctx.stroke();
  }
}
class Circle {
  constructor(_x, _y, _r, _d1, _d2) {
    this.x = _x;
    this.y = _y;
    this.r = _r;
    this.d1 = _d1;
    this.d2 = _d2;
    this.radSet = false;
    this.isFinished = false;
  }
  draw(ctx) {
    // Start a new Path
    var pix = coordToPix(this.x, this.y, windowTransform);
    var _x = pix[0];
    var _y = pix[1];
    var _r = distToPix(this.r, windowTransform);
    if (this.radSet) {
      ctx.beginPath();
      ctx.arc(_x, _y, _r, this.d1, this.d2);

      // Draw the Path
      ctx.stroke();
    } else {
      //if the radius is not yet set, just draw a point where the center was chosen
      ctx.fillRect(_x-1,_y-1,3,3)
    }
  }
}

points = [];
lines = [];
circles = [];

//assume just line tool for now
canvas.addEventListener("click", function(event) {
  mx = event.offsetX;
  my = event.offsetY;
  
  snappedPix = snapPix(mx, my, points, lines, circles, windowTransform, snapRadius);

  mx = snappedPix[0];
  my = snappedPix[1];
  const coord = pixToCoord(mx, my, windowTransform);
  x = coord[0];
  y = coord[1];


  //Before anything, check if we should snap to another component on the grid (do not check itself)



 if (drawLine && isDrawing) {
    l = lines[lines.length-1];
    l.isFinished = true;
    l.endpoints[1].x = x;
    l.endpoints[1].y = y;
    points.push(l.endpoints[1]);

    isDrawing = false;
  }
  if (drawCircle) {
    // if (circles.length == 0) {
    //   c = new Circle(x,y,0,0,0);
    //   circles.push(c);
    //   isDrawing = true;
    // } else if (circles[circles.length-1].isFinished == true) {
    //   c = new Circle(x,y,0,0,0);
    //   circles.push(c);
    //   isDrawing = true;
    if (circles[circles.length-1].isFinished == false && circles[circles.length-1].radSet == true) {
      circles[circles.length-1].isFinished = true;
      isDrawing = false;
    } else {
      if(isDrawing) {
        //if not, then we need to set the radius of the most recent circle.
        c = circles[circles.length-1];
        c.r = dist(x, y, c.x, c.y);
        c.d1 = Math.atan((y-c.y)/(x-c.x));
        if (x-c.x < 0) {
          c.d1 += Math.PI;
        }
        c.d2 = c.d1;
        c.radSet = true;
      }
    }
  }
  drawDisplay(ctx, canvas, lines, circles);


});

canvas.addEventListener("mousemove", function(event) {
  mx = event.offsetX;
  my = event.offsetY;
  
  snappedPix = snapPix(mx, my, points, lines, circles, windowTransform, snapRadius);

  mx = snappedPix[0];
  my = snappedPix[1];

  const coord = pixToCoord(mx, my, windowTransform);
  x = coord[0];
  y = coord[1];
  drawDisplay(ctx, canvas, lines, circles);

  ctx.fillRect(mx-1,my-1,3,3)

  if (isDrawing) {
    
    if (drawLine) {
      l = lines[lines.length-1];
      l.endpoints[1].x = x;
      l.endpoints[1].y = y;
      l.draw(ctx);
    } else if (drawCircle) {
      c = circles[circles.length-1];
      if (c.radSet) {
        //if radius is set, then move around the arc lengths
        c.d2 = Math.atan((y-c.y)/(x-c.x));
        if (x-c.x < 0) {
          c.d2 += Math.PI;
        }
      }
      c.draw(ctx);
    }
  }



});

canvas.addEventListener("keydown", function(event) {
  const key = event.key;
  if (key==="c") {
    drawCircle = true;
    drawLine = false;
    c = new Circle(x,y,0,0,0);
    circles.push(c);
    isDrawing = true;
  }
  else if (key==="l") {
    drawCircle = false;
    drawLine = true;
    p = new Point(x, y);
    points.push(p);
    q = new Point(x, y);
    l = new Line(p, q);
    lines.push(l);
    isDrawing = true;
  }
    
  else if (key === "a"){
    //zoom in
    //relative to mouse position, whose pix are stored in mx and my
    var Xzoom = 1.02;
    var Yzoom = 1.02;
    
    var c = pixToCoord(mx, my, windowTransform);
    
    //new center coordinates
    var cx = c[0];
    var cy = c[1];

    //new total height/width of coord window
    var cwidth = WIDTH/windowTransform.Xscale;
    var cheight = HEIGHT/windowTransform.Yscale;

    //this needs to get mapped to 0
    //windowTransform.Xoffset = -cornerX*windowTransform.Xscale;
    //windowTransform.Yoffset = -cornerY*windowTransform.Yscale;
    windowTransform.Xscale *= Xzoom;
    windowTransform.Yscale *= Yzoom;
    windowTransform.Xoffset += cx*WIDTH*(1-Xzoom) / (cwidth)
    windowTransform.Yoffset += cy*HEIGHT*(1-Yzoom) / (cheight)
    
    drawDisplay(ctx, canvas, lines, circles);
  }
  else if (key === "s") {
    //zoom out
    var Xzoom = 1/1.02;
    var Yzoom = 1/1.02;
    
    var c = pixToCoord(mx, my, windowTransform);
    
    //new center coordinates
    var cx = c[0];
    var cy = c[1];

    //new total height/width of coord window
    var cwidth = WIDTH/windowTransform.Xscale;
    var cheight = HEIGHT/windowTransform.Yscale;

    //this needs to get mapped to 0
    //windowTransform.Xoffset = -cornerX*windowTransform.Xscale;
    //windowTransform.Yoffset = -cornerY*windowTransform.Yscale;
    windowTransform.Xscale *= Xzoom;
    windowTransform.Yscale *= Yzoom;
    windowTransform.Xoffset += cx*WIDTH*(1-Xzoom) / (cwidth)
    windowTransform.Yoffset += cy*HEIGHT*(1-Yzoom) / (cheight)
    
    drawDisplay(ctx, canvas, lines, circles);
  }
});