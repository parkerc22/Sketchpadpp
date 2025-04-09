//-----TO-DO----------------------
//Add CCW vs CW circle functionality
//moving circle center should try to keep endpoints but change radii

//Plan: Create "DISTANCE" constraint. The endpoint of an arc will be constrained to match the distance of the initial endpoint.
//Enforce this distance constraint even while moving points!!!! 

//points are INDEPENDENT. lines and circles are DEPENDENT on their endpoints.

//window.alert("click in the box");
const canvas = document.getElementById("myCanvas");
canvas.style.cursor = "none";

const ctx = canvas.getContext("2d");
canvas.focus();
isDrawing = false;
drawCircle = true;
drawLine = false;
moving = false;
raw_mx = 0;
mx = 0;
var WIDTH = 800;
pointSnapRadius = 20; //this radius is in pixels
circleSnapRadius = 17; //this radius is also in pixels
moveRadius = 20; //this radius is in pixels
var HEIGHT = 800;
raw_my = 0;
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

function drawDisplay(ctx, canvas, points, lines, circles) {
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
  for (p = 0; p < points.length; p++) {
    points[p].draw(ctx);
  }
}

function snapCoords(x, y, points, lines, circles, windowTransform, snapRadius) {
  var output = [null, null, null];
  //point, line, circle

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
    if (distToPix(dist(x, y, pt.x, pt.y), windowTransform) < snapRadius && !points[p].beingMoved) {
      output[0] = pt;
    }
  }
  return output;
}

function snapPix(x, y, points, lines, circles, windowTransform, pointSnapRadius, circleSnapRadius) {
  var output = [null, null, null];
  //point, line, circle

  // for (i = 0; i < lines.length; i++) {
  //   var endpt1 = coordToPix(lines[i].endpoints[0].x, lines[i].endpoints[0].y, windowTransform);
  //   if (dist(x, y, endpt1[0], endpt1[1]) < snapRadius && lines[i].isFinished) {
  //     Xout = endpt1[0];
  //     Yout = endpt1[1];
  //   }
  //   var endpt2 = coordToPix(lines[i].endpoints[1].x, lines[i].endpoints[1].y, windowTransform);
  //   if (dist(x, y, endpt2[0], endpt2[1]) < snapRadius && lines[i].isFinished) {
  //     Xout = endpt2[0];
  //     Yout = endpt2[1];
  //   }
  // }
  for (p = 0; p < points.length; p++) {
    var coord = coordToPix(points[p].x, points[p].y, windowTransform);
    if (dist(x, y, coord[0], coord[1]) < pointSnapRadius && !points[p].beingMoved) {
      output[0] = points[p];
    }
  }

  for (j = 0; j < circles.length; j++) {
    c = circles[j];
    var coord = coordToPix(c.center.x, c.center.y, windowTransform);
    if (Math.abs(dist(x, y, coord[0], coord[1]) - distToPix(c.r, windowTransform)) < circleSnapRadius) {
      //then, check that the coordinates lie between the endpoints! 
      var d1 = Math.atan((c.endpoints[0].y-c.center.y)/(c.endpoints[0].x-c.center.x));
      if (c.endpoints[0].x-c.center.x < 0) {
        d1 += Math.PI;
      }

      var d2 = Math.atan((c.endpoints[1].y-c.center.y)/(c.endpoints[1].x-c.center.x));
      if (c.endpoints[1].x-c.center.x < 0) {
        d2 += Math.PI;
      }

      var pt = pixToCoord(x, y, windowTransform);
      var angle = Math.atan((pt[1]-c.center.y)/(pt[0]-c.center.x));
      if (pt[0]-c.center.x < 0) {
        angle += Math.PI;
      }
      console.log(d1);
      console.log(d2);
      console.log(angle);
      console.log("-----");
      if (d1 < angle || angle < d2) {
        output[2] = c;
      }
    } 
  }

  return output;
}
//---------OBJECTS-------------------------------------------------------

class RingParent {
  constructor(_parent, _next, _prev) {
    this.object = _parent;
    this.next = _next;
    this.prev = _prev;
  }
  initialize() {
    this.next = this;
    this.prev = this;
  }
}

class RingChild {
  constructor(_child, _next, _prev) {
    this.object = _child;
    this.next = _next;
    this.prev = _prev;
  }
}

class Point {
  constructor(_x, _y) {
    this.x = _x;
    this.y = _y;
    this.lines = [];
    this.ring = new RingParent(this, this, this);
    this.ring.initialize();
    this.beingMoved = false;
  }
  draw(ctx) {
    var pix1 = coordToPix(this.x, this.y, windowTransform);

    ctx.fillRect(pix1[0]-1,pix1[1]-1,3,3)
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
  constructor(_center, _r) {
    this.r = _r;
    this.radSet = false;
    this.isFinished = false;
    this.center = _center;
    this.points = [];
    this.endpoints = [];
    this.constraints = [];
  }
  draw(ctx) {
    // Start a new Path
    var pix = coordToPix(this.center.x, this.center.y, windowTransform);
    var _x = pix[0];
    var _y = pix[1];
    var _r = distToPix(this.r, windowTransform);
    if (this.radSet) {
      var d1 = Math.atan((this.endpoints[0].y-this.center.y)/(this.endpoints[0].x-this.center.x));
      if (this.endpoints[0].x-this.center.x < 0) {
        d1 += Math.PI;
      }

      var d2 = Math.atan((this.endpoints[1].y-this.center.y)/(this.endpoints[1].x-this.center.x));
      if (this.endpoints[1].x-this.center.x < 0) {
        d2 += Math.PI;
      }

      ctx.beginPath();
      ctx.arc(_x, _y, _r, d1, d2);

      // Draw the Path
      ctx.stroke();
    } else {
      //if the radius is not yet set, just draw a point where the center was chosen
      ctx.fillRect(_x-1,_y-1,3,3)
    }
  }
}

class DistanceConstraint {

  //distance constraints have two points, with different roles
  //the ANCHOR will never move due to a distance constraint (usually the center of a circle)
  //the FLOATER will always move to satisfy a distance constraint (usually a point unbound to any circles)
  constructor(p1, p2, dist) {
    this.anchor = p1;
    this.floater = p2;
    this.dist = dist;
  }

}
  



//------------------------------------------------------------------------------------------------------------------------
//-----------------------------END OBJECT DECLARATIONS--------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------

points = [];
lines = [];
circles = [];
constraints = [];
movingPoint = new Point(0,0);

//assume just line tool for now
canvas.addEventListener("click", function(event) {
  mx = event.offsetX;
  my = event.offsetY;
  raw_mx = mx;
  raw_my = my;
  
  snappedPix = snapPix(mx, my, points, lines, circles, windowTransform, pointSnapRadius, circleSnapRadius);
  if (snappedPix[0] != null) {
    var t = coordToPix(snappedPix[0].x, snappedPix[0].y, windowTransform)
    mx = t[0];
    my = t[1];
  }
  const coord = pixToCoord(mx, my, windowTransform);
  x = coord[0];
  y = coord[1];


  //Before anything, check if we should snap to another component on the grid (do not check itself)


 if (moving) {
  moving = false;
  movePoint.beingMoved = false;
  //merge the points!!
  if (snappedPix[0] != null) {
    newpt = snappedPix[0];
    oldpt = movePoint;
    //combine the two points by checking all circles and lines for dependencies??
    for (i = 0; i < lines.length; i++) {
      l = lines[i];
      if (l.endpoints[0] === oldpt) {
        l.endpoints[0] = newpt;
      }
      if (l.endpoints[1] === oldpt) {
        l.endpoints[1] = newpt;
      }
    }
    for (j = 0; j < circles.length; j++) {
      c = circles[j];
      if (c.endpoints[0] === oldpt) {
        c.endpoints[0] = newpt;
      }
      if (c.endpoints[1] === oldpt) {
        c.endpoints[1] = newpt;
      }
      if (c.center === oldpt) {
        c.center = newpt;
      }
    }
    //delete the old one from the points[] array
    idx = -1;
    for (p = 0; p < points.length; p++) {
      if (points[p] === oldpt) {
        idx = p;
      }
    }
    if (idx != -1) {
      points.splice(idx, 1);
    }
    //free memory from the old one
    //maybe this is automatic
  }
 }
 if (drawLine && isDrawing) {
    l = lines[lines.length-1];
    l.isFinished = true;
    if (snappedPix[0] != null && snappedPix[0]!==l.endpoints[0]) {
      l.endpoints[1] = snappedPix[0];
    } else if (snappedPix[2] != null) {
      var c = snappedPix[2];

      var d = dist(c.center.x, c.center.y, coord[0], coord[1]);

      l.endpoints[1].x = c.center.x + c.r/d * (coord[0]-c.center.x);
      l.endpoints[1].y = c.center.y + c.r/d * (coord[1]-c.center.y);
      points.push(l.endpoints[1]);
    } 
    else {
      l.endpoints[1].x = x;
      l.endpoints[1].y = y;
      points.push(l.endpoints[1]);
    }

    isDrawing = false;
  }
  if (drawCircle) {

    if (circles[circles.length-1].isFinished == false && circles[circles.length-1].radSet == true) {
      circles[circles.length-1].isFinished = true;
      //circles[circles.length-1].endpoint[1].beingMoved = false;
      isDrawing = false;
    } else {
      if(isDrawing) {
        //if not, then we need to set the radius of the most recent circle.
        c = circles[circles.length-1];
        c.r = dist(x, y, c.center.x, c.center.y);
        p = new Point(x, y);
        c.endpoints[0] = p;
        points.push(p);
        q = new Point(x, y);
        q.beingMoved = true;
        moving = true;
        movePoint = q;
        c.endpoints[1] = q;
        points.push(q);
        c.radSet = true;
      }
    }
  }
  drawDisplay(ctx, canvas, points, lines, circles);


});

canvas.addEventListener("mousemove", function(event) {
  mx = event.offsetX;
  my = event.offsetY;
  raw_mx = mx;
  raw_my = my;
  
  snappedPix = snapPix(mx, my, points, lines, circles, windowTransform, pointSnapRadius, circleSnapRadius);
  if (snappedPix[0] != null) {
    var t = coordToPix(snappedPix[0].x, snappedPix[0].y, windowTransform);
    mx = t[0];
    my = t[1];
  } else if (snappedPix[2] != null) {
    //this means we snapped to a circle!
    //compute what our radial position would be along this circle;
    var c = snappedPix[2];
    var center = coordToPix(c.center.x, c.center.y, windowTransform);

    var d = dist(center[0], center[1], mx, my);
    var r = distToPix(c.r, windowTransform);

    mx = center[0] + r/d * (mx-center[0]);
    my = center[1] + r/d * (my-center[1]);
  }

  const coord = pixToCoord(mx, my, windowTransform);
  x = coord[0];
  y = coord[1];
  drawDisplay(ctx, canvas, points, lines, circles);

  ctx.fillRect(mx-2,my-2,5,5)

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

        //make sure that the endpoint gets set to the correct radius

        cx = c.center.x;
        cy = c.center.y;

        d = dist(cx, cy, x, y);

        c.endpoints[1].x = cx + c.r/d * (x-cx);
        c.endpoints[1].y = cy + c.r/d * (y-cy);
      }
      c.draw(ctx);
    }
  } else if (moving) {
    movePoint.x = x;
    movePoint.y = y;
  }



});

canvas.addEventListener("keydown", function(event) {
  const key = event.key;
  snappedPix = snapPix(raw_mx, raw_my, points, lines, circles, windowTransform, pointSnapRadius, circleSnapRadius);
  coords = pixToCoord(raw_mx, raw_my, windowTransform);
  x = coords[0];
  y = coords[1];
  if (key==="c") {
    drawCircle = true;
    drawLine = false;
    var p;
    if (snappedPix[0] != null) {
      p = snappedPix[0];
    } else {
      p = new Point(x, y);
      points.push(p);
    }
    c = new Circle(p, 0);
    circles.push(c);
    isDrawing = true;
  }
  else if (key==="l") {
    drawCircle = false;
    drawLine = true;
    var p;
    if (snappedPix[0] != null) {
       p = snappedPix[0];
    } else if (snappedPix[2] != null) {
      //then map it to the circle;
      //this should really come with a constraint that maintains it
      var c = snappedPix[2];

      var d = dist(c.center.x, c.center.y, coords[0], coords[1]);

      temp_x = c.center.x + c.r/d * (coords[0]-c.center.x);
      temp_y = c.center.y + c.r/d * (coords[1]-c.center.y);
      p = new Point(temp_x, temp_y);
      points.push(p);
    }
    else {
      p = new Point(x, y);
      points.push(p);
    }
    q = new Point(x, y);
    l = new Line(p, q);
    lines.push(l);
    isDrawing = true;
  } else if (key === "m") {
    //find closest point to current cursor among points that are within moveRadius dist
    var best = new Point(0,0);
    var bestDist = 100000;
    for (p = 0; p < points.length; p++) {
      var coord = coordToPix(points[p].x, points[p].y, windowTransform);
      var d = dist(raw_mx, raw_my, coord[0], coord[1]);
      if (d < Math.min(moveRadius, bestDist)) {
        best = points[p];
        bestDist = d;
      }
    }

    if (bestDist < 100000) {
      moving = true;
      movePoint = best;
      movePoint.beingMoved = true;
    }

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
    
    drawDisplay(ctx, canvas, points, lines, circles);
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
    
    drawDisplay(ctx, canvas, points, lines, circles);
  }
});